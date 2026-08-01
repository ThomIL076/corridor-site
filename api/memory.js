import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || (req.body && req.body.action);

  try {
    if (action === 'get') {
      const prospect_id = req.query.prospect_id || req.body?.prospect_id;
      const { data, error } = await supabase
        .from('prospect_memories')
        .select('content')
        .eq('prospect_id', prospect_id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return res.json({ memories: (data || []).map(r => r.content) });
    }

    if (action === 'add') {
      const body = req.body || {};
      const { prospect_id, content } = body;
      const { error } = await supabase
        .from('prospect_memories')
        .insert({ prospect_id, content, client_id: 'thomas' });
      if (error) throw error;
      return res.json({ success: true });
    }

    if (action === 'delete') {
      const prospect_id = req.query.prospect_id || req.body?.prospect_id;
      const { error } = await supabase
        .from('prospect_memories')
        .delete()
        .eq('prospect_id', prospect_id);
      if (error) throw error;
      return res.json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    console.error('memory error:', e);
    return res.status(500).json({ error: e.message });
  }
}
