// POST /api/heyreach-send
// Body: { linkedinUrl, message, prospectName }
// Triggers a real LinkedIn outreach via HeyReach using Thomas Dratler's connected account.
//
// HeyReach reality: there is no "send a cold DM to a profile URL" endpoint. To reach a
// not-yet-connected prospect you add them as a lead to a HeyReach campaign, which then runs
// the campaign sequence (connection request + message) from the connected LinkedIn account.
// The custom message is passed as a personalization field ("message") so a campaign step that
// uses {{message}} sends the exact text from the Send Queue.
//
// Required Vercel env vars (project corridor-landing):
//   HEYREACH_API_KEY            the HeyReach API key (Settings -> API)
//   HEYREACH_CAMPAIGN_ID        the campaign that holds the connect+message sequence
//   HEYREACH_LINKEDIN_ACCOUNT_ID  (optional) force a specific sender account; omit to auto-assign

export const config = { maxDuration: 30 };

const BASE = 'https://api.heyreach.io/api/public';

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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { linkedinUrl, message, prospectName, campaignId, touch, linkedinTag } = req.body || {};
  if (!linkedinUrl) {
    return res.status(400).json({ success: false, error: 'linkedinUrl is required' });
  }
  // Guard: j0/j5/j12 must only reach connected 1st-degree prospects (campaign 477919 = DMs only)
  if (touch && touch !== 'invite' && linkedinTag !== 'connection-accepted') {
    return res.status(200).json({ success: false, error: 'blocked: not connected' });
  }

  // Strip any leading BOM / whitespace that a shell may have injected when the env var was set
  const clean = (v) => (v || '').replace(/^﻿/, '').replace(/[^\x20-\x7E]/g, '').trim();
  const API_KEY = clean(process.env.HEYREACH_API_KEY);
  // Routing : le client peut imposer la campagne (invite -> connexions, messages -> autre campagne).
  // On valide qu'il s'agit bien d'un identifiant numerique ; sinon on retombe sur la campagne par defaut (env).
  const bodyCampaign = clean(String(campaignId || ''));
  const CAMPAIGN_ID = /^\d+$/.test(bodyCampaign) ? bodyCampaign : clean(process.env.HEYREACH_CAMPAIGN_ID);
  if (!API_KEY) {
    return res.status(200).json({ success: false, error: 'HEYREACH_API_KEY not configured in Vercel env' });
  }
  if (!CAMPAIGN_ID) {
    return res.status(200).json({ success: false, error: 'HEYREACH_CAMPAIGN_ID not configured in Vercel env' });
  }

  const parts = String(prospectName || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';

  const accountIdRaw = clean(process.env.HEYREACH_LINKEDIN_ACCOUNT_ID);
  const accountId = accountIdRaw ? Number(accountIdRaw) : null;

  const payload = {
    campaignId: Number(CAMPAIGN_ID),
    accountLeadPairs: [
      {
        linkedInAccountId: accountId,
        lead: {
          profileUrl: linkedinUrl,
          firstName,
          lastName,
          customUserFields: message ? [{ name: 'message', value: message }] : []
        }
      }
    ]
  };

  try {
    const r = await fetch(`${BASE}/campaign/AddLeadsToCampaignV2`, {
      method: 'POST',
      headers: { 'X-API-KEY': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!r.ok) {
      console.error('[heyreach-send] non-2xx response', r.status, text.slice(0, 400));
      return res.status(200).json({ success: false, error: `HeyReach ${r.status}: ${text.slice(0, 400)}` });
    }

    const messageId = data?.addedLeadsCount ?? data?.id ?? data?.leadId ?? 'queued';
    return res.status(200).json({ success: true, messageId, detail: data });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e && e.message ? e.message : e) });
  }
}
