import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: { bodyParser: false },
};

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function verifySignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  // Header format: ts=<unix_timestamp>;h1=<hmac_sha256_hex>
  const parts = {};
  for (const seg of signatureHeader.split(';').map(s => s.trim())) {
    const idx = seg.indexOf('=');
    if (idx > 0) parts[seg.slice(0, idx)] = seg.slice(idx + 1);
  }
  if (!parts.ts || !parts.h1) return false;
  const signed = `${parts.ts}:${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signed, 'utf8').digest('hex');
  try {
    const a = Buffer.from(parts.h1, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function collectRawBody(req) {
  // Vercel serverless pre-buffers the body even with bodyParser:false —
  // expose it as Buffer or string on req.body rather than through the stream.
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;
  // Fallback: standard Node.js IncomingMessage stream (local dev / non-Vercel)
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function logBillingEvent(clientId, eventId, eventType, data) {
  const amount =
    data?.details?.totals?.total ??
    data?.items?.[0]?.price?.unit_price?.amount ??
    null;
  const { error } = await sb.from('billing_events').upsert(
    {
      client_id: clientId,
      paddle_event_id: eventId,
      event_type: eventType,
      amount,
      currency: data?.currency_code ?? null,
      status: data?.status ?? null,
      raw_payload: data,
    },
    { onConflict: 'paddle_event_id', ignoreDuplicates: true }
  );
  if (error) console.error(`[paddle-webhook] billing_events insert failed (${eventId}):`, error);
  return error;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let rawBody;
  try {
    rawBody = await collectRawBody(req);
  } catch (e) {
    console.error('[paddle-webhook] body collection failed:', e);
    return res.status(500).json({ error: 'Body collection failed' });
  }

  const signatureHeader = req.headers['paddle-signature'] ?? '';
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET ?? '';
  if (!verifySignature(rawBody, signatureHeader, webhookSecret)) {
    console.warn('[paddle-webhook] Signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const eventType = event.event_type;
  const eventId = event.event_id ?? event.notification_id;
  const data = event.data ?? {};
  const clientId = data.custom_data?.client_id;

  if (!clientId) {
    // Events without client_id (e.g. simulator tests without custom_data) — ack and skip
    console.warn(`[paddle-webhook] No client_id in custom_data for ${eventType} ${eventId}`);
    return res.status(200).json({ received: true, skipped: 'no_client_id' });
  }

  // Idempotent event log — ON CONFLICT DO NOTHING on paddle_event_id
  const logErr = await logBillingEvent(clientId, eventId, eventType, data);
  if (logErr) return res.status(500).json({ error: 'billing_events write failed' });

  switch (eventType) {
    case 'subscription.activated':
    case 'transaction.completed': {
      const payload = {
        billing_status: 'active',
        paddle_customer_id: data.customer_id ?? null,
        paddle_subscription_id: data.subscription_id ?? (eventType === 'subscription.activated' ? data.id : null),
        next_billing_date: data.current_billing_period?.ends_at ?? data.next_billed_at ?? null,
      };
      const { error } = await sb.from('clients').update(payload).eq('client_id', clientId);
      if (error) {
        console.error(`[paddle-webhook] clients update failed (${eventType} ${clientId}):`, error);
        return res.status(500).json({ error: 'clients write failed' });
      }
      break;
    }
    case 'subscription.canceled': {
      const { error } = await sb.from('clients').update({ billing_status: 'canceled' }).eq('client_id', clientId);
      if (error) {
        console.error(`[paddle-webhook] clients update failed (subscription.canceled ${clientId}):`, error);
        return res.status(500).json({ error: 'clients write failed' });
      }
      break;
    }
    case 'subscription.past_due': {
      const { error } = await sb.from('clients').update({ billing_status: 'past_due' }).eq('client_id', clientId);
      if (error) {
        console.error(`[paddle-webhook] clients update failed (subscription.past_due ${clientId}):`, error);
        return res.status(500).json({ error: 'clients write failed' });
      }
      break;
    }
    case 'transaction.payment_failed':
      // Dunning managed by Paddle Retain — no billing_status change, event logged above
      break;
    case 'subscription.created':
      // Await activated event for billing_status change — created alone is not sufficient
      break;
    default:
      console.log(`[paddle-webhook] Unhandled event type: ${eventType} (${eventId})`);
  }

  return res.status(200).json({ received: true });
}
