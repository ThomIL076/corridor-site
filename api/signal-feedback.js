import { resolveClient, supabase } from './_auth.js';
import './_sentry.js';

// Fix securite 2026-09-21 (lot 3) : cette route ecrivait dans signal_feedback en service_role avec un client_id, un
// prospect_id et un mandate_id LIBRES fournis par l'appelant, sans authentification (empoisonnement des Learned
// Preferences de n'importe quel client, edition des commentaires de n'importe quel vote). Desormais : jeton de session
// Supabase + client resolu (helper commun api/_auth.js) AVANT toute ecriture ; client_id = celui du compte authentifie
// (une valeur client_id du corps est ignoree) ; prospect_id et mandate_id doivent appartenir a ce client ; liste blanche
// de champs (vote, source, signal_type, signal_text bornes) ; PATCH limite au commentaire d'un vote du client.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// La base impose CHECK (source IN ('email', 'dashboard_live_signal', 'dashboard_morning_scan')) ; 'email' est reserve a la route
// signal-feedback-click : les dashboards n'envoient que les deux autres valeurs, toute autre valeur est refusee (400).
const ALLOWED_SOURCES = ['dashboard_live_signal', 'dashboard_morning_scan'];

const optId = v => (v === undefined || v === null || v === '') ? '' : String(v);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const client = await resolveClient(req);
  if (!client) return res.status(401).json({ error: 'Unauthorized' });
  const clientId = client.client_id;

  // ── PATCH : ajouter un commentaire à un vote existant ──────────────────
  if (req.method === 'PATCH') {
    const { id, comment } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing required field: id' });
    if (!UUID_RE.test(String(id))) return res.status(400).json({ error: 'Invalid id' });
    const trimmed = typeof comment === 'string' ? comment.trim() : '';
    if (!trimmed) return res.status(400).json({ error: 'comment must be a non-empty string' });
    const { data, error } = await supabase
      .from('signal_feedback')
      .update({ comment: trimmed.slice(0, 500) })
      .eq('id', String(id))
      .eq('client_id', clientId)
      .select('id');
    if (error) {
      console.error('[signal-feedback] PATCH error:', error.message, error);
      return res.status(500).json({ error: error.message });
    }
    if (!data || !data.length) return res.status(404).json({ error: 'Feedback not found' });
    return res.status(200).json({ ok: true });
  }

  // ── POST : enregistrer un vote ──────────────────────────────────────────
  const { prospect_id, mandate_id, signal_type, signal_text, vote, source } = req.body || {};

  if (!vote || !['like', 'unlike'].includes(vote)) {
    return res.status(400).json({ error: 'vote must be "like" or "unlike"' });
  }

  if (!ALLOWED_SOURCES.includes(source)) return res.status(400).json({ error: 'invalid source' });

  const prospectId = optId(prospect_id);
  if (prospectId) {
    if (!UUID_RE.test(prospectId)) return res.status(400).json({ error: 'Invalid prospect_id' });
    const { data: p } = await supabase.from('prospects').select('id').eq('id', prospectId).eq('client_id', clientId).maybeSingle();
    if (!p) return res.status(403).json({ error: 'prospect_id not allowed for this client' });
  }
  const mandateId = optId(mandate_id);
  if (mandateId) {
    if (!UUID_RE.test(mandateId)) return res.status(400).json({ error: 'Invalid mandate_id' });
    const { data: m } = await supabase.from('mandates').select('id').eq('id', mandateId).eq('client_id', clientId).maybeSingle();
    if (!m) return res.status(403).json({ error: 'mandate_id not allowed for this client' });
  }

  const { data, error } = await supabase.from('signal_feedback').insert({
    prospect_id: prospectId || null,
    client_id: clientId,
    mandate_id: mandateId || null,
    signal_type: signal_type ? String(signal_type).slice(0, 64) : null,
    signal_text: signal_text ? String(signal_text).slice(0, 500) : null,
    vote,
    source,
  }).select('id').single();

  if (error) {
    console.error('[signal-feedback] POST error:', error.message, error);
    return res.status(500).json({ error: error.message });
  }
  return res.status(200).json({ ok: true, id: data.id });
}
