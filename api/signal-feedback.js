import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oanokmugroiahtgcecbn.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prospect_id, client_id, mandate_id, signal_type, signal_text, vote, source } = req.body || {};

  if (!vote || !['like', 'unlike'].includes(vote)) {
    return res.status(400).json({ error: 'vote must be "like" or "unlike"' });
  }

  const { error } = await supabase.from('signal_feedback').insert({
    prospect_id: prospect_id || null,
    client_id: client_id || null,
    mandate_id: mandate_id || null,
    signal_type: signal_type || null,
    signal_text: signal_text ? String(signal_text).slice(0, 500) : null,
    vote,
    source: source || 'dashboard',
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
