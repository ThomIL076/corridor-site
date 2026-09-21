import { resolveClient } from './_auth.js';

export const config = { runtime: 'edge' };

// Fix securite 2026-09-21 : cette route POSTait vers un clientWebhookUrl ARBITRAIRE fourni par l'appelant
// (SSRF) sans aucune authentification, et declenchait sans URL le webhook Slack n8n de Thomas. Desormais :
// jeton de session Supabase + client resolu (helper commun api/_auth.js) AVANT tout appel sortant ; la
// destination est le webhook enregistre du client (clients.slack_webhook_url, lu cote serveur) ; une URL du
// corps n'est acceptee que si elle est identique ; toute URL (enregistree ou non) doit etre https, hote
// hooks.slack.com, chemin /services/... ; les redirections ne sont pas suivies. Sans webhook enregistre ni
// URL dans le corps, comportement historique (webhook n8n Slack Notifier de Thomas) conserve, mais reserve aux
// clients authentifies listes ci-dessous (aucun appelant legitime sans URL n'a ete trouve : dashboards et n8n).
const DEFAULT_WEBHOOK_CLIENTS = ['thomas'];
function isAllowedSlackWebhook(u) {
  if (typeof u !== 'string' || u.length > 300) return false;
  let p;
  try { p = new URL(u); } catch (e) { return false; }
  return p.protocol === 'https:' && p.hostname === 'hooks.slack.com' && p.port === ''
    && p.username === '' && p.password === '' && p.hash === ''
    && p.pathname.startsWith('/services/') && p.pathname.length > '/services/'.length;
}

/**
 * /api/slack.js
 * Reçoit les événements pipeline du Dashboard (changement de stage)
 * et les forward vers le webhook n8n Slack Notifier.
 *
 * Body attendu :
 * {
 *   event: 'stage_change' | 'proposal' | 'custom',
 *   prospect: { name, company, stage, icpScore, location },
 *   clientWebhookUrl: string (optionnel — override pour clients)
 * }
 */

const N8N_SLACK_WEBHOOK = 'https://thom076il.app.n8n.cloud/webhook/slack-notifier';

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

  const client = await resolveClient(req, 'slack_enabled, slack_webhook_url');
  if (!client) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { event, prospect, clientWebhookUrl } = body;

  if (!event || !prospect) {
    return new Response('Missing event or prospect', { status: 400 });
  }

  // Destination : webhook enregistre du client (jamais une URL choisie par l'appelant), sinon n8n Corridor.
  const registered = client.slack_enabled ? (client.slack_webhook_url || '') : '';
  const requestedUrl = (clientWebhookUrl === undefined || clientWebhookUrl === null || clientWebhookUrl === '') ? '' : clientWebhookUrl;
  let targetUrl = N8N_SLACK_WEBHOOK;
  if (!registered && !requestedUrl && !DEFAULT_WEBHOOK_CLIENTS.includes(client.client_id)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Slack not configured for this client' }),
      { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
  if (registered || requestedUrl) {
    if (!registered || !isAllowedSlackWebhook(registered) || (requestedUrl && requestedUrl !== registered)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Slack webhook not allowed' }),
        { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
    targetUrl = new URL(registered).toString();
  }

  const payload = {
    event,
    prospect,
    timestamp: new Date().toISOString(),
    source: 'corridor-dashboard',
  };

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'manual',
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(
        JSON.stringify({ ok: false, error: text }),
        { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
