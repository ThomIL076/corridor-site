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

export default async function handler(req, res) {
  const ip = ((req.headers['x-forwarded-for'] || '') + '').split(',')[0].trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ success: false, error: 'Too many requests. Please wait before retrying.' });
  }

  console.log('Function started', req.method, JSON.stringify(req.body));
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, first_name, last_name, company_name, campaign_id } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  const apiKey = process.env.SMARTLEAD_API_KEY;
  if (!apiKey) return res.status(200).json({ success: false, error: 'SMARTLEAD_API_KEY not configured' });

  const campaignId = campaign_id || '3708966';

  try {
    const r = await fetch(
      'https://server.smartlead.ai/api/v1/campaigns/' + campaignId + '/leads?api_key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ lead_list: [{ email, first_name, last_name, company_name }] })
      }
    );
    const data = await r.json();
    if (!r.ok) console.error('[smartlead] non-2xx response', r.status, JSON.stringify(data));
    console.log('Smartlead response:', JSON.stringify(data));
    res.status(200).json(data);
  } catch(e) {
    console.error('Smartlead error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
}
