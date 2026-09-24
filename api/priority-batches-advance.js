import { resolveClient, supabase } from './_auth.js';
import './_sentry.js';

// Fix securite/fiabilite 2026-09-24 : _prioritiesNext()/_prioritiesSkip() (boutons "Skip batch"/
// "Next batch ->" du panneau Priorities, demo-private.html/kaizenology.html) faisaient jusqu'ici
// un upsert direct sbClient.from('priority_batches').upsert(...) DEPUIS LE NAVIGATEUR avec le role
// 'authenticated' -- meme angle mort que signal-feedback/client-profile avant leur fix du 2026-09-21 :
// aucune authentification, client_id libre fourni par l'appelant. En plus de ca, la table
// priority_batches n'avait pas de GRANT INSERT/UPDATE pour 'authenticated' (seulement SELECT),
// meme bug deja trouve et corrige sur signals_feed_cache le 2026-09-10 (CLAUDE.md) -- corrige
// cote base par ailleurs, mais l'ecriture navigateur restait quand meme la mauvaise architecture.
// Cette route suit exactement le pattern de api/signal-feedback.js : jeton de session Supabase
// (helper commun api/_auth.js) resolu AVANT toute ecriture ; client_id = celui du compte
// authentifie (jamais celui fourni par l'appelant) ; mandate_id valide s'il est fourni ; ecriture
// avec la credential service_role, jamais exposee au navigateur.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_ACTIONS = ['next', 'skip'];
const MAX_PROSPECT_IDS = 500;

const optId = v => (v === undefined || v === null || v === '') ? '' : String(v);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const client = await resolveClient(req);
  if (!client) return res.status(401).json({ error: 'Unauthorized' });
  const clientId = client.client_id;

  const { action, new_batch, mandate_id, prospect_ids } = req.body || {};

  if (!ALLOWED_ACTIONS.includes(action)) return res.status(400).json({ error: 'action must be "next" or "skip"' });

  const newBatch = Number(new_batch);
  if (!Number.isInteger(newBatch) || newBatch < 1) return res.status(400).json({ error: 'new_batch must be a positive integer' });

  const mandateId = optId(mandate_id);
  if (mandateId) {
    if (!UUID_RE.test(mandateId)) return res.status(400).json({ error: 'Invalid mandate_id' });
    const { data: m } = await supabase.from('mandates').select('id').eq('id', mandateId).eq('client_id', clientId).maybeSingle();
    if (!m) return res.status(403).json({ error: 'mandate_id not allowed for this client' });
  }

  let prospectIds = Array.isArray(prospect_ids) ? prospect_ids.map(optId).filter(Boolean) : [];
  if (prospectIds.length > MAX_PROSPECT_IDS) return res.status(400).json({ error: 'Too many prospect_ids' });
  if (prospectIds.some(id => !UUID_RE.test(id))) return res.status(400).json({ error: 'Invalid prospect_ids' });

  if (prospectIds.length) {
    const { error: updErr } = await supabase
      .from('prospects')
      .update({ priority_batch_number: newBatch })
      .in('id', prospectIds)
      .eq('client_id', clientId);
    if (updErr) {
      console.error('[priority-batches-advance] prospects update error:', updErr.message, updErr);
      return res.status(500).json({ error: updErr.message });
    }
  }

  const { error: upsertErr } = await supabase.from('priority_batches').upsert(
    { client_id: clientId, mandate_id: mandateId || null, current_batch: newBatch, updated_at: new Date().toISOString() },
    { onConflict: 'client_id,mandate_id' }
  );
  if (upsertErr) {
    console.error('[priority-batches-advance] priority_batches upsert error:', upsertErr.message, upsertErr);
    return res.status(500).json({ error: upsertErr.message });
  }

  return res.status(200).json({ ok: true, new_batch: newBatch });
}
