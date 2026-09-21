import { resolveClientId } from './_auth.js';

export const config = { runtime: 'edge' };

// Fix securite 2026-09-21 : la route relayait un corps LIBRE vers Perplexity (compte facture) sans
// authentification. Desormais : jeton de session Supabase + client resolu (helper commun api/_auth.js) AVANT
// tout appel sortant, puis liste blanche de champs / modele et plafonds. Valeurs relevees sur les appelants
// reels (dashboards et demos) : model 'sonar', max_tokens <= 800, messages, search_domain_filter (web-search).
const ALLOWED_FIELDS = ['model', 'max_tokens', 'messages', 'search_domain_filter'];
const ALLOWED_MODELS = ['sonar'];
const MAX_TOKENS_CAP = 1000;
const MAX_BODY_BYTES = 200_000;
const MAX_MESSAGES = 10;
const ALLOWED_ROLES = ['system', 'user', 'assistant'];

function validateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'JSON object body required';
  for (const k of Object.keys(body)) if (!ALLOWED_FIELDS.includes(k)) return 'Field not allowed: ' + k;
  if (body.model !== undefined && !ALLOWED_MODELS.includes(body.model)) return 'Model not allowed';
  if (body.max_tokens !== undefined && (!Number.isInteger(body.max_tokens) || body.max_tokens < 1 || body.max_tokens > MAX_TOKENS_CAP)) {
    return 'max_tokens must be an integer between 1 and ' + MAX_TOKENS_CAP;
  }
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > MAX_MESSAGES) return 'messages must be an array of 1 to ' + MAX_MESSAGES;
  for (const m of body.messages) {
    if (!m || typeof m !== 'object' || !ALLOWED_ROLES.includes(m.role) || typeof m.content !== 'string') return 'Invalid message';
  }
  if (body.search_domain_filter !== undefined) {
    const f = body.search_domain_filter;
    if (!Array.isArray(f) || f.length > 3 || f.some(d => typeof d !== 'string' || d.length < 1 || d.length > 253)) return 'Invalid search_domain_filter';
  }
  return null;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!(await resolveClientId(req))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: 'Request body too large' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    let body;
    try { body = JSON.parse(raw); } catch (e) { body = undefined; }
    const bad = validateBody(body);
    if (bad) {
      return new Response(JSON.stringify({ error: bad }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
