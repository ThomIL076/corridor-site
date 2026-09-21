import { resolveClient, supabase } from './_auth.js';

// Fix securite 2026-09-21 : cette route ajoutait n'importe quel email a une campagne Smartlead (donc un envoi reel
// depuis les boites de Thomas) sans authentification, avec un campaign_id libre. Desormais : jeton de session
// Supabase + client resolu (helper commun api/_auth.js), AVANT tout appel sortant ; le campaign_id est derive
// du client resolu (clients.email_campaign_id, lu cote serveur). Une valeur du corps n'est acceptee que si elle
// appartient au client (sa campagne par defaut, ou celle d'un de SES mandats / deals) -- sinon 403.
// Repli historique conserve, par client (memes constantes EMAIL_CAMPAIGN_ID que les dashboards) :
const FALLBACK_CAMPAIGN_BY_CLIENT = { thomas: '3915129', kaizenology: '3778944' };
const CAMPAIGN_ID_RE = /^[0-9]{1,12}$/;

async function clientMayUseCampaign(clientId, campaignId) {
  const { data: mandates } = await supabase.from('mandates').select('id, email_campaign_id').eq('client_id', clientId);
  const ms = mandates || [];
  if (ms.some(m => m.email_campaign_id != null && String(m.email_campaign_id) === campaignId)) return true;
  if (!ms.length) return false;
  const { data: deals } = await supabase.from('mandate_deals').select('email_campaign_id').in('segment_id', ms.map(m => m.id));
  return (deals || []).some(d => d.email_campaign_id != null && String(d.email_campaign_id) === campaignId);
}

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

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const client = await resolveClient(req, 'email_campaign_id');
  if (!client) return res.status(401).json({ error: 'Unauthorized' });

  const { email, first_name, last_name, company_name, campaign_id, custom_fields } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  const apiKey = process.env.SMARTLEAD_API_KEY;
  if (!apiKey) return res.status(200).json({ success: false, error: 'SMARTLEAD_API_KEY not configured' });

  const defaultCampaignId = String(client.email_campaign_id || FALLBACK_CAMPAIGN_BY_CLIENT[client.client_id] || '');
  const requested = (campaign_id === undefined || campaign_id === null || campaign_id === '') ? '' : String(campaign_id);
  let campaignId = defaultCampaignId;
  if (requested && requested !== defaultCampaignId) {
    if (!CAMPAIGN_ID_RE.test(requested) || !(await clientMayUseCampaign(client.client_id, requested))) {
      return res.status(403).json({ success: false, error: 'campaign_id not allowed for this client' });
    }
    campaignId = requested;
  }
  if (!CAMPAIGN_ID_RE.test(campaignId)) return res.status(200).json({ success: false, error: 'Email campaign not configured for this client' });

  try {
    const r = await fetch(
      'https://server.smartlead.ai/api/v1/campaigns/' + campaignId + '/leads?api_key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ lead_list: [{ email, first_name, last_name, company_name, custom_fields }] })
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
