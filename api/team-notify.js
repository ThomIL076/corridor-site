export const config = { runtime: 'edge' };

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

  // Destination : webhook client si fourni, sinon n8n Corridor
  const targetUrl = clientWebhookUrl || N8N_SLACK_WEBHOOK;

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
