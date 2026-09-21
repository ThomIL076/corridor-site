// POST /api/linkedin-send
// Body: { linkedinUrl, message, prospectName, client_id, touch, linkedinTag }
// Resolves HeyReach credentials from Supabase clients table.
// API key fallback to an env var is allowed only for the client_ids listed in
// CLIENT_ENV_API_KEYS below (2026-09-14 : added 'wominds', reusing HEYREACH_WOMINDS_API --
// set directly in Vercel, never duplicated into the clients table). Every other client_id
// must have its credentials in Supabase — never fall back silently to someone else's account.
//
// Required columns in clients table (add with ALTER TABLE IF NOT EXISTS):
//   heyreach_api_key              text  — HeyReach API key for this client
//   heyreach_campaign_connections text  — campaign ID for LinkedIn invitations
//   heyreach_campaign_messages    text  — campaign ID for direct messages
//   heyreach_linkedin_account_id  text  — (optional) force a specific sender account

import { createClient } from '@supabase/supabase-js';
import { resolveClientId } from './_auth.js';

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

const clean = (v) => (v || '').replace(/^﻿/, '').replace(/[^\x20-\x7E]/g, '').trim();

// Small explicit allowlist: client_ids whose API key lives only in a Vercel env var (never
// duplicated into the clients table). Everyone else must have heyreach_api_key set in Supabase --
// adding a client_id here is a deliberate choice, not a generic fallback.
const CLIENT_ENV_API_KEYS = {
  thomas: 'HEYREACH_API_KEY',
  wominds: 'HEYREACH_WOMINDS_API',
};

async function resolveConfig(clientId, touch) {
  const isThomas = clientId === 'thomas';
  const envKeyName = CLIENT_ENV_API_KEYS[clientId];

  let dbApiKey = null, dbConnections = null, dbMessages = null, dbAccountId = null;
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );
    const { data } = await supabase
      .from('clients')
      .select('heyreach_api_key, heyreach_campaign_connections, heyreach_campaign_messages, heyreach_linkedin_account_id')
      .eq('client_id', clientId)
      .single();
    dbApiKey      = data?.heyreach_api_key              || null;
    dbConnections = data?.heyreach_campaign_connections || null;
    dbMessages    = data?.heyreach_campaign_messages    || null;
    dbAccountId   = data?.heyreach_linkedin_account_id  || null;
  } catch(e) {
    // Columns may not exist yet — Thomas still works via env vars below
    if (!isThomas) throw new Error('HeyReach config lookup failed: ' + e.message);
  }

  // Env-var fallback for the API key: only client_ids in CLIENT_ENV_API_KEYS above.
  // Campaign IDs / account ID below stay Thomas-only via env — wominds' values live in the
  // clients table (the normal, already-supported path for any non-Thomas client).
  // HEYREACH_CAMPAIGN_CONNECTIONS / HEYREACH_CAMPAIGN_MESSAGES are the preferred env vars;
  // HEYREACH_CAMPAIGN_ID (legacy) is tried as a last resort for connections only.
  const apiKey = clean(dbApiKey || (envKeyName ? process.env[envKeyName] : ''));
  const campaignConnections = clean(
    dbConnections ||
    (isThomas ? (process.env.HEYREACH_CAMPAIGN_CONNECTIONS || process.env.HEYREACH_CAMPAIGN_ID || '523265') : '')
  );
  const campaignMessages = clean(
    dbMessages ||
    (isThomas ? (process.env.HEYREACH_CAMPAIGN_MESSAGES || '554070') : '')
  );
  const accountId = clean(dbAccountId || (isThomas ? process.env.HEYREACH_LINKEDIN_ACCOUNT_ID : ''));

  const campaignId = (touch === 'invite') ? campaignConnections : campaignMessages;

  console.log('[linkedin-send DEBUG]', JSON.stringify({ clientId, isThomas, dbConnections, campaignConnections, campaignId }));

  if (!apiKey) {
    throw new Error(envKeyName
      ? `${envKeyName} not configured (env or clients table)`
      : `HeyReach not configured for client "${clientId}" — set heyreach_api_key in clients table`);
  }
  if (!campaignId) {
    throw new Error(isThomas
      ? 'HeyReach campaign not configured (env or clients table)'
      : `HeyReach campaign not configured for client "${clientId}" — set heyreach_campaign_connections / heyreach_campaign_messages in clients table`);
  }

  return { apiKey, campaignId, accountId };
}

export default async function handler(req, res) {
  const ip = ((req.headers['x-forwarded-for'] || '') + '').split(',')[0].trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ success: false, error: 'Too many requests. Please wait before retrying.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Fix securite 2026-09-21 : jeton de session Supabase + client resolu (helper commun api/_auth.js) AVANT tout
  // appel sortant. Le client_id ne vient plus du corps : il est celui du porteur du jeton (les cles HeyReach lues
  // sont donc toujours celles de CE client) ; un client_id du corps different est refuse.
  const client_id = await resolveClientId(req);
  if (!client_id) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { linkedinUrl, message, prospectName, client_id: bodyClientId, touch, linkedinTag } = req.body || {};
  if (bodyClientId !== undefined && bodyClientId !== null && bodyClientId !== '' && bodyClientId !== client_id) {
    return res.status(403).json({ success: false, error: 'client_id mismatch' });
  }
  if (!linkedinUrl) {
    return res.status(400).json({ success: false, error: 'linkedinUrl is required' });
  }

  // Guard: j0/j5/j12 must only reach connected 1st-degree prospects
  if (touch && touch !== 'invite' && linkedinTag !== 'connection-accepted') {
    return res.status(200).json({ success: false, error: 'blocked: not connected' });
  }

  let apiKey, campaignId, accountId;
  try {
    ({ apiKey, campaignId, accountId } = await resolveConfig(client_id, touch));
  } catch(e) {
    return res.status(200).json({ success: false, error: e.message });
  }

  const parts = String(prospectName || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName  = parts.slice(1).join(' ') || '';
  const resolvedAccountId = accountId ? Number(accountId) : null;

  // Preventive connection check — only for direct messages (j0/j5/j12), never for invites.
  // Confirmed response shape: { "isConnection": true/false }
  if (touch && touch !== 'invite' && resolvedAccountId) {
    try {
      const connCheck = await fetch(`${BASE}/MyNetwork/IsConnection`, {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderAccountId: resolvedAccountId, leadProfileUrl: linkedinUrl })
      });
      const connText = await connCheck.text();
      let connData;
      try { connData = JSON.parse(connText); } catch { connData = null; }
      if (connCheck.ok && connData && connData.isConnection === false) {
        return res.status(200).json({ success: false, error: 'Not connected on LinkedIn (verified via HeyReach)' });
      }
      // If the check itself fails (network error, non-2xx, unexpected shape), proceed without blocking —
      // don't let a broken verification call silently prevent all sends.
    } catch(e) {
      console.error('[heyreach-send] IsConnection check failed, proceeding without it:', e.message);
    }
  }

  const payload = {
    campaignId: Number(campaignId),
    accountLeadPairs: [
      {
        linkedInAccountId: resolvedAccountId,
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
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
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
    const added   = data?.addedLeadsCount   ?? 0;
    const updated = data?.updatedLeadsCount ?? 0;
    const failed  = data?.failedLeadsCount  ?? 0;
    if (added + updated === 0) {
      return res.status(200).json({ success: false, error: `HeyReach: 0 leads added/updated (failed: ${failed})`, detail: data });
    }
    return res.status(200).json({ success: true, messageId, detail: data });
  } catch(e) {
    return res.status(200).json({ success: false, error: String(e && e.message ? e.message : e) });
  }
}
