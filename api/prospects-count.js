import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resolvedClientId = await resolveClientId(req);
  if (!resolvedClientId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { count, error } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', resolvedClientId)
      .eq('archived', false);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate');
    return res.status(200).json({ count });
  } catch (err) {
    console.error('prospects-count error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
