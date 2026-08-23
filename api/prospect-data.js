export const config = { runtime: 'edge' };

import { createClient } from '@supabase/supabase-js';

/**
 * /api/clay.js
 * Enrichissement avancé d'un prospect via Clay.
 *
 * Flux :
 * 1. Dashboard envoie prospect → /api/clay  (auth JWT requise)
 * 2. /api/clay forward vers Clay table webhook (CLAY_WEBHOOK_URL env Vercel)
 * 3. Clay enrichit (technographie, news, intent signals, email vérifié)
 * 4. Clay renvoie les données vers /api/clay/callback (webhook callback)
 * 5. /api/clay/callback met à jour Supabase
 *
 * Body attendu (enrichissement) :
 * {
 *   prospect: {
 *     id: string,                // UUID Supabase
 *     name: string,
 *     company: string,
 *     email: string,
 *     linkedinUrl: string,
 *     location: string,
 *   }
 * }
 * clayWebhookUrl et clayCallbackSecret viennent désormais des env vars Vercel
 * (CLAY_WEBHOOK_URL, CLAY_CALLBACK_SECRET) — ne jamais les exposer au client.
 *
 * Body attendu (callback Clay → Corridor) :
 * POST /api/clay?mode=callback
 * {
 *   secret: string,              // CLAY_CALLBACK_SECRET pour validation
 *   prospectId: string,          // UUID Supabase
 *   enriched: {
 *     email: string,
 *     emailVerified: boolean,
 *     company: string,
 *     companySize: string,
 *     industry: string,
 *     techStack: string[],       // outils utilisés par la société
 *     recentNews: string,        // dernière news significative
 *     intentSignals: string[],   // signaux d'intention détectés
 *     linkedinUrl: string,
 *     twitterUrl: string,
 *     websiteUrl: string,
 *     revenue: string,
 *     fundingStage: string,
 *     lastFundingDate: string,
 *   }
 * }
 */

const SUPABASE_URL = 'https://oanokmugroiahtgcecbn.supabase.co';

const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function resolveClientId(authHeader) {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data, error: clErr } = await supabase
    .from('clients').select('client_id').eq('auth_user_id', user.id).single();
  if (clErr || !data?.client_id) return null;
  return data.client_id;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get('mode');

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // ── MODE CALLBACK : Clay renvoie les données enrichies ────────────────────
  if (mode === 'callback') {
    const { secret, prospectId, enriched } = body;

    const expectedSecret = process.env.CLAY_CALLBACK_SECRET;
    if (!expectedSecret || !secret || secret !== expectedSecret) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (!prospectId || !enriched) {
      return new Response('Missing prospectId or enriched data', { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return new Response('Missing Supabase service key', { status: 500 });
    }

    // Construire l'objet de mise à jour Supabase
    const updates = {
      updated_at: new Date().toISOString(),
      clay_enriched_at: new Date().toISOString(),
    };

    if (enriched.email) updates.email = enriched.email;
    if (enriched.emailVerified !== undefined) updates.email_verified = enriched.emailVerified;
    if (enriched.companySize) updates.company_size = enriched.companySize;
    if (enriched.industry) updates.industry = enriched.industry;
    if (enriched.techStack?.length) updates.tech_stack = enriched.techStack;
    if (enriched.recentNews) updates.recent_news = enriched.recentNews;
    if (enriched.intentSignals?.length) updates.intent_signals = enriched.intentSignals;
    if (enriched.revenue) updates.revenue = enriched.revenue;
    if (enriched.fundingStage) updates.funding_stage = enriched.fundingStage;
    if (enriched.lastFundingDate) updates.last_funding_date = enriched.lastFundingDate;
    if (enriched.linkedinUrl) updates.linkedin_url = enriched.linkedinUrl;
    if (enriched.websiteUrl) updates.website_url = enriched.websiteUrl;

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/prospects?id=eq.${encodeURIComponent(prospectId)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        return new Response(
          JSON.stringify({ ok: false, error: text }),
          { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, prospectId, fieldsUpdated: Object.keys(updates).length }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: err.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
  }

  // ── MODE ENRICHISSEMENT : Dashboard → Clay ────────────────────────────────
  const clientId = await resolveClientId(req.headers.get('authorization'));
  if (!clientId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { prospect } = body;
  const clayWebhookUrl = process.env.CLAY_WEBHOOK_URL;
  if (!clayWebhookUrl) {
    return new Response('Clay webhook not configured', { status: 500 });
  }
  if (!prospect) {
    return new Response('Missing prospect', { status: 400 });
  }

  const callbackUrl = `${url.origin}/api/clay?mode=callback`;

  const clayPayload = {
    prospectId: prospect.id,
    firstName: (prospect.name || '').split(' ')[0] || '',
    lastName: (prospect.name || '').split(' ').slice(1).join(' ') || '',
    email: prospect.email || '',
    linkedinUrl: prospect.linkedinUrl || '',
    companyName: prospect.company || '',
    location: prospect.location || '',
    callbackUrl,
    callbackSecret: process.env.CLAY_CALLBACK_SECRET || '',
    source: 'corridor-dashboard',
    timestamp: new Date().toISOString(),
  };

  try {
    const clayRes = await fetch(clayWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Corridor-GTM/1.0',
      },
      body: JSON.stringify(clayPayload),
    });

    if (!clayRes.ok) {
      const text = await clayRes.text();
      return new Response(
        JSON.stringify({ ok: false, error: `Clay webhook failed: ${text}` }),
        { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, status: 'enrichment_requested', prospectId: prospect.id }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
