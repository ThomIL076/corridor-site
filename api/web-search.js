import { resolveClientId } from './_auth.js';
import { Sentry } from './_sentry.js';

// Fix securite 2026-09-21 : la route relayait un corps LIBRE vers Perplexity (compte facture) sans
// authentification. Desormais : jeton de session Supabase + client resolu (helper commun api/_auth.js) AVANT
// tout appel sortant, puis liste blanche de champs / modele et plafonds. Valeurs relevees sur les appelants
// reels (dashboards et demos) : max_tokens <= 800 (defaut serveur 500), messages, search_domain_filter ; le
// modele n'est jamais envoye par les appelants (defaut serveur 'sonar').
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!(await resolveClientId(req))) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const declared = parseInt(req.headers['content-length'] || '0', 10) || 0;
    let actual = 0;
    try { actual = JSON.stringify(req.body === undefined ? {} : req.body).length; } catch (e) { actual = Infinity; }
    if (Math.max(declared, actual) > MAX_BODY_BYTES) return res.status(413).json({ error: 'Request body too large' });
    const bad = validateBody(req.body);
    if (bad) return res.status(400).json({ error: bad });
    const body = req.body;
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({ model: 'sonar', max_tokens: 500, ...body })
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (e) {
    Sentry.captureException(e);
    await Sentry.flush(1000).catch(() => {});
    res.status(500).json({ error: e.message });
  }
}
