// POST /api/inbox-send
// Body: { conversationId, message, client_id }
// Sends a reply into an existing LinkedIn conversation via HeyReach /inbox/SendMessage.
// Used exclusively by _inboxSend() for Inbox replies — NOT for outbound campaign sequences.
// Returns success: true only when HeyReach confirms delivery (non-empty 2xx response without error).

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 30 };

const BASE = 'https://api.heyreach.io/api/public';

const clean = (v) => (v || '').replace(/^﻿/, '').replace(/[^\x20-\x7E]/g, '').trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { conversationId, message, client_id } = req.body || {};
  if (!conversationId) return res.status(400).json({ success: false, error: 'conversationId is required' });
  if (!message)        return res.status(400).json({ success: false, error: 'message is required' });
  if (!client_id)      return res.status(400).json({ success: false, error: 'client_id is required' });

  const isThomas = client_id === 'thomas';
  let apiKey = null, accountId = null;
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await supabase
      .from('clients')
      .select('heyreach_api_key, heyreach_linkedin_account_id')
      .eq('client_id', client_id)
      .single();
    apiKey    = data?.heyreach_api_key             || null;
    accountId = data?.heyreach_linkedin_account_id || null;
  } catch(e) {
    if (!isThomas) return res.status(200).json({ success: false, error: 'HeyReach config lookup failed: ' + e.message });
  }

  apiKey    = clean(apiKey    || (isThomas ? process.env.HEYREACH_API_KEY : ''));
  accountId = clean(accountId || (isThomas ? process.env.HEYREACH_LINKEDIN_ACCOUNT_ID : ''));

  if (!apiKey) {
    return res.status(200).json({ success: false, error: isThomas
      ? 'HEYREACH_API_KEY not configured'
      : `HeyReach not configured for client "${client_id}"` });
  }
  if (!accountId) {
    return res.status(200).json({ success: false, error: 'linkedInAccountId not configured — set heyreach_linkedin_account_id in clients table' });
  }

  const payload = {
    conversationId,
    linkedInAccountId: Number(accountId),
    message,
  };

  try {
    const r = await fetch(`${BASE}/inbox/SendMessage`, {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    // Log raw response unconditionally — first real call determines the success shape.
    console.log('[inbox-send] status:', r.status, '| raw:', text.slice(0, 800));
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!r.ok) {
      return res.status(200).json({ success: false, error: `HeyReach ${r.status}: ${text.slice(0, 400)}` });
    }

    // FIXME: success condition not grounded — update after first real test confirms HeyReach response shape.
    // Must be replaced with presence-of-positive check (e.g. data.messageId != null).
    // Do NOT leave this in production beyond the first observed success.
    if (data.error || (typeof data.message === 'string' && data.message.toLowerCase().includes('error'))) {
      return res.status(200).json({ success: false, error: data.error || data.message || 'HeyReach error in response', detail: data });
    }

    return res.status(200).json({ success: true, detail: data });
  } catch(e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
