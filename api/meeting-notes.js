import { createClient } from '@supabase/supabase-js';

const GRANOLA_BASE = 'https://public-api.granola.ai/v1';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { runtime: 'nodejs' };

const RL_MAX = parseInt(process.env.RL_MAX || '30', 10);
const RL_WINDOW_MS = 60_000;
const _rlStore = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = _rlStore.get(ip);
  if (!entry || now - entry.windowStart > RL_WINDOW_MS) {
    _rlStore.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RL_MAX) return false;
  entry.count++;
  return true;
}

async function resolveClient(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return null;
  const { data, error: clErr } = await supabase
    .from('clients')
    .select('client_id, granola_api_key')
    .eq('auth_user_id', user.id)
    .single();
  if (clErr || !data?.client_id) return null;
  return { clientId: data.client_id, granolaKey: data.granola_api_key || null };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = ((req.headers['x-forwarded-for'] || '') + '').split(',')[0].trim() || 'unknown';
  if (!checkRateLimit(ip)) return res.status(429).json({ error: 'Too many requests' });

  const client = await resolveClient(req);
  if (!client) return res.status(401).json({ error: 'Unauthorized' });
  const { granolaKey } = client;
  // Fallback pour test interne Thomas uniquement -- les futurs clients auront leur propre clé en base, ce fallback ne doit pas devenir la norme.
  const effectiveKey = granolaKey || process.env.GRANOLA_API_KEY || null;
  if (!effectiveKey) return res.status(200).json({ error: 'Granola not connected', meetings: [] });

  const body = req.body || {};
  const { action } = body;

  // ── list_meetings ─────────────────────────────────────────────────────────
  // Endpoint : GET /notes?created_after=<ISO8601>[&cursor=<cursor>]
  // Retourne les notes avec résumé IA déjà généré -- les notes en cours de
  // traitement sont absentes de la liste (comportement API Granola, pas un bug).
  // IDs retournés : format "not_XXXXX" -- différent des UUID retournés par le
  // MCP Claude.ai Granola. Ne jamais mélanger les deux sources d'ID.
  if (action === 'list_meetings') {
    let createdAfter = body.created_after;
    if (!createdAfter) {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      createdAfter = d.toISOString();
    }
    const cursor = body.cursor || null;

    const params = new URLSearchParams({ created_after: createdAfter });
    if (cursor) params.set('cursor', cursor);

    try {
      const r = await fetch(`${GRANOLA_BASE}/notes?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${effectiveKey}` },
      });
      if (!r.ok) {
        const err = await r.text();
        console.error('[granola] list_meetings', r.status, err);
        return res.status(200).json({ error: `Granola API ${r.status}`, meetings: [] });
      }
      const data = await r.json();
      const meetings = Array.isArray(data) ? data : (data.notes || data.data || data.meetings || []);
      const hasMore = data.hasMore ?? data.has_more ?? false;
      const nextCursor = data.cursor ?? data.next_cursor ?? null;
      return res.status(200).json({ meetings, hasMore, cursor: nextCursor });
    } catch (e) {
      console.error('[granola] list_meetings exception:', e.message);
      return res.status(500).json({ error: e.message, meetings: [] });
    }
  }

  // ── get_transcript ────────────────────────────────────────────────────────
  // Endpoint : GET /notes/{id}?include=transcript
  // Retourne transcript + summary + owner dans un seul objet.
  // 404 = note encore en traitement (pas d'erreur bloquante, juste "pas prêt").
  if (action === 'get_transcript') {
    const noteId = body.id || body.meeting_id;
    if (!noteId) return res.status(400).json({ error: 'id required' });
    try {
      const r = await fetch(
        `${GRANOLA_BASE}/notes/${encodeURIComponent(noteId)}?include=transcript`,
        { headers: { 'Authorization': `Bearer ${effectiveKey}` } }
      );
      if (r.status === 404) {
        return res.status(200).json({ error: 'not_yet_available' });
      }
      if (!r.ok) {
        const err = await r.text();
        console.error('[granola] get_transcript', r.status, err);
        return res.status(200).json({ error: `Granola API ${r.status}` });
      }
      const data = await r.json();
      return res.status(200).json({ note: data });
    } catch (e) {
      console.error('[granola] get_transcript exception:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'Unknown action. Use list_meetings or get_transcript.' });
}
