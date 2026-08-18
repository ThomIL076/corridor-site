import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resolveClientId(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data, error: clErr } = await supabase
    .from('clients')
    .select('client_id')
    .eq('auth_user_id', user.id)
    .single();
  if (clErr || !data?.client_id) return null;
  return data.client_id;
}

const FIELDS = 'id,name,company,sector,country,stage,last_contact,reminder_date,deal_value,deal_currency,linkedin_tag,created_at,score_signal_strength,signal';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const clientId = await resolveClientId(req);
  if (!clientId) return res.status(401).json({ error: 'Unauthorized' });

  const { mandate_mode, mandate_id } = req.query;

  try {
    let mandateIds = null;
    if (mandate_mode === 'all') {
      const { data: mandates } = await supabase
        .from('mandates')
        .select('id')
        .eq('client_id', clientId)
        .eq('status', 'active');
      mandateIds = (mandates || []).map(m => m.id);
    }

    const all = [];
    let from = 0;
    while (true) {
      let q = supabase
        .from('prospects')
        .select(FIELDS)
        .eq('client_id', clientId)
        .eq('archived', false)
        .order('last_contact', { ascending: false, nullsFirst: false })
        .range(from, from + 999);

      if (mandate_mode === 'all') {
        if (mandateIds && mandateIds.length > 0) q = q.in('mandate_id', mandateIds);
        // else: no mandate filter — return all prospects for this client_id
      } else if (mandate_id) {
        q = q.eq('mandate_id', mandate_id);
      } else {
        q = q.is('mandate_id', null);
      }

      const { data: chunk, error } = await q;
      if (error) return res.status(500).json({ error: error.message });
      all.push(...(chunk || []));
      if (!chunk || chunk.length < 1000) break;
      from += 1000;
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ prospects: all });
  } catch (err) {
    console.error('[pipeline-prospects]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
