import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { runtime: 'nodejs' };

async function resolveClientId(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return null;
  const { data, error: clErr } = await supabase
    .from('clients')
    .select('client_id')
    .eq('auth_user_id', user.id)
    .single();
  if (clErr || !data?.client_id) return null;
  return data.client_id;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const resolvedClientId = await resolveClientId(req);
  if (!resolvedClientId) return res.status(401).json({ error: 'Unauthorized' });

  const action = req.query.action || (req.body && req.body.action);

  try {
    if (action === 'get') {
      const prospect_id = req.query.prospect_id || req.body?.prospect_id;
      const { data, error } = await supabase
        .from('prospect_memories')
        .select('content')
        .eq('prospect_id', prospect_id)
        .eq('client_id', resolvedClientId)
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
        .insert({ prospect_id, content, client_id: resolvedClientId });
      if (error) throw error;
      return res.json({ success: true });
    }

    if (action === 'delete') {
      const prospect_id = req.query.prospect_id || req.body?.prospect_id;
      const { error } = await supabase
        .from('prospect_memories')
        .delete()
        .eq('prospect_id', prospect_id)
        .eq('client_id', resolvedClientId);
      if (error) throw error;
      return res.json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    console.error('memory error:', e);
    return res.status(500).json({ error: e.message });
  }
}
