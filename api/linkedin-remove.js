// POST /api/heyreach-remove
// Body: { linkedinUrl, client_id }
// Removes a lead from the connections/invitations campaign.
// Resolves HeyReach credentials from Supabase clients table.
// Fallback to env vars ONLY for client_id === 'thomas'.

import { createClient } from '@supabase/supabase-js';
import { resolveClientId } from './_auth.js';
import { Sentry } from './_sentry.js';

export const config = { maxDuration: 15 };

const BASE = 'https://api.heyreach.io/api/public';

const clean = (v) => (v || '').replace(/[^\x20-\x7E]/g, '').trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Fix securite 2026-09-21 : jeton de session Supabase + client resolu (helper commun api/_auth.js) AVANT tout
  // appel sortant. Le client_id ne vient plus du corps : il est celui du porteur du jeton ; un client_id du
  // corps different est refuse.
  const client_id = await resolveClientId(req);
  if (!client_id) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { linkedinUrl, client_id: bodyClientId } = req.body || {};
  if (bodyClientId !== undefined && bodyClientId !== null && bodyClientId !== '' && bodyClientId !== client_id) {
    return res.status(403).json({ success: false, error: 'client_id mismatch' });
  }
  if (!linkedinUrl) {
    return res.status(400).json({ success: false, error: 'linkedinUrl is required' });
  }

  const isThomas = client_id === 'thomas';
  let apiKey = null;
  let campaignId = null;

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );
    const { data } = await supabase
      .from('clients')
      .select('heyreach_api_key, heyreach_campaign_connections')
      .eq('client_id', client_id)
      .single();

    apiKey     = clean(data?.heyreach_api_key             || (isThomas ? process.env.HEYREACH_API_KEY : ''));
    campaignId = clean(data?.heyreach_campaign_connections || (isThomas
      ? (process.env.HEYREACH_CAMPAIGN_CONNECTIONS || process.env.HEYREACH_CAMPAIGN_ID || '523265')
      : ''));
  } catch(e) {
    Sentry.captureException(e);
    // Ce catch ne "return" pas toujours (repli env pour isThomas, execution qui continue) : le flush est
    // bloquant ici aussi (erreur fiable a capturer), pas seulement avant la reponse d'erreur du cas !isThomas.
    await Sentry.flush(1000).catch(() => {});
    if (isThomas) {
      // DB may not have the columns yet — fall back to env vars for Thomas
      apiKey     = clean(process.env.HEYREACH_API_KEY);
      campaignId = clean(process.env.HEYREACH_CAMPAIGN_CONNECTIONS || process.env.HEYREACH_CAMPAIGN_ID || '523265');
    } else {
      return res.status(200).json({ success: false, error: 'HeyReach config lookup failed: ' + e.message });
    }
  }

  if (!apiKey) {
    return res.status(200).json({ success: false, error: isThomas
      ? 'HEYREACH_API_KEY not configured'
      : `HeyReach not configured for client "${client_id}" — set heyreach_api_key in clients table` });
  }
  if (!campaignId) {
    return res.status(200).json({ success: false, error: isThomas
      ? 'HeyReach campaign not configured'
      : `HeyReach campaign not configured for client "${client_id}" — set heyreach_campaign_connections in clients table` });
  }

  try {
    const r = await fetch(`${BASE}/campaign/RemoveLeadFromCampaign`, {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: Number(campaignId),
        linkedInProfileUrl: linkedinUrl
      })
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return res.status(200).json({ success: r.ok, detail: data });
  } catch(e) {
    Sentry.captureException(e);
    await Sentry.flush(1000).catch(() => {});
    return res.status(200).json({ success: false, error: String(e && e.message ? e.message : e) });
  }
}
