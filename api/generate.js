import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { startObservation } from '@langfuse/tracing';
import { resolveClientId } from './_auth.js';

// exportMode: 'immediate' -- this is a short-lived serverless function, so spans
// are flushed explicitly (forceFlush calls below) rather than relying on the
// default batch interval, which may never fire before the instance freezes.
const langfuseSpanProcessor = new LangfuseSpanProcessor({ exportMode: 'immediate' });
new NodeSDK({ spanProcessors: [langfuseSpanProcessor] }).start();

// Unlike the old SDK's flushAsync() (which swallows export failures internally),
// forceFlush() rejects on failure (e.g. bad credentials, Langfuse outage) -- catch it
// here so a tracing-side problem never turns a real response into an unrelated 500.
async function safeFlushLangfuse() {
  try {
    await langfuseSpanProcessor.forceFlush();
  } catch (e) {
    console.error('[generate] Langfuse forceFlush failed:', e.message);
  }
}

const MAX_TOOL_TURNS = 5;

// Fix securite 2026-09-21 : cette route relayait vers le compte Anthropic sans aucune authentification
// (CORS `*`, model/max_tokens libres). Jeton de session Supabase (Authorization: Bearer) verifie cote
// serveur ET appartenance a la table clients, via le helper commun api/_auth.js (meme methode que memory.js,
// pipeline-prospects.js, meeting-notes.js). La verification se fait AVANT tout appel sortant (Anthropic, Langfuse).

// Durcissement du relais : liste blanche de modeles / champs / outils et plafonds. Valeurs relevees sur
// les appelants reels (demo-private, kaizenology, wominds, demos) : un seul modele (claude-sonnet-5, ou
// defaut serveur), max_tokens <= 16000 (kaizenology, streaming), champs model / max_tokens / messages /
// system / tools / stream, un seul outil (web_search_20250305, max_uses 3).
const ALLOWED_MODELS = ['claude-sonnet-5'];
const MAX_TOKENS_CAP = 16000;
const MAX_BODY_BYTES = 1_000_000;
const ALLOWED_FIELDS = ['model', 'max_tokens', 'messages', 'system', 'tools', 'stream'];
const MAX_WEB_SEARCH_USES = 5;

// Origines du produit (les dashboards appellent la route en meme origine ; ceci ne sert qu'a ne plus
// repondre `*` a n'importe quel site). Previews Vercel du projet : corridor-landing-<hash>-thomas-dratler.vercel.app.
const ALLOWED_ORIGINS = ['https://corridor.systems', 'https://www.corridor.systems'];
const PREVIEW_ORIGIN_RE = /^https:\/\/corridor-landing-[a-z0-9]+-thomas-dratler\.vercel\.app$/;

function applyCors(req, res) {
  res.setHeader('Vary', 'Origin');
  const origin = req.headers['origin'];
  if (origin && (ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN_RE.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}

// Retourne null si le corps est acceptable, sinon { status, error }. Appelee apres l'authentification
// et avant tout appel sortant.
function validateBody(req, body) {
  const declared = parseInt(req.headers['content-length'] || '0', 10) || 0;
  let actual = 0;
  try { actual = JSON.stringify(body === undefined ? {} : body).length; } catch (e) { actual = Infinity; }
  if (Math.max(declared, actual) > MAX_BODY_BYTES) return { status: 413, error: 'Request body too large' };
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 400, error: 'JSON object body required' };
  for (const k of Object.keys(body)) {
    if (!ALLOWED_FIELDS.includes(k)) return { status: 400, error: 'Field not allowed: ' + k };
  }
  if (body.model !== undefined && !ALLOWED_MODELS.includes(body.model)) return { status: 400, error: 'Model not allowed' };
  if (body.max_tokens !== undefined && (!Number.isInteger(body.max_tokens) || body.max_tokens < 1 || body.max_tokens > MAX_TOKENS_CAP)) {
    return { status: 400, error: 'max_tokens must be an integer between 1 and ' + MAX_TOKENS_CAP };
  }
  if (body.messages !== undefined && !Array.isArray(body.messages)) return { status: 400, error: 'messages must be an array' };
  if (body.stream !== undefined && typeof body.stream !== 'boolean') return { status: 400, error: 'stream must be a boolean' };
  if (body.system !== undefined && typeof body.system !== 'string' && !Array.isArray(body.system)) {
    return { status: 400, error: 'system must be a string or an array' };
  }
  if (body.tools !== undefined) {
    if (!Array.isArray(body.tools) || body.tools.length > 1) return { status: 400, error: 'Tools not allowed' };
    for (const t of body.tools) {
      const keys = t && typeof t === 'object' ? Object.keys(t) : [];
      const okShape = keys.length > 0 && keys.every(k => k === 'type' || k === 'name' || k === 'max_uses');
      if (!okShape || t.type !== 'web_search_20250305' || t.name !== 'web_search'
        || (t.max_uses !== undefined && (!Number.isInteger(t.max_uses) || t.max_uses < 1 || t.max_uses > MAX_WEB_SEARCH_USES))) {
        return { status: 400, error: 'Tools not allowed' };
      }
    }
  }
  return null;
}

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
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = ((req.headers['x-forwarded-for'] || '') + '').split(',')[0].trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      type: 'error',
      error: { type: 'rate_limit_error', message: 'Too many requests. Please wait before retrying.' },
    });
  }

  const resolvedClientId = await resolveClientId(req);
  if (!resolvedClientId) return res.status(401).json({ error: 'Unauthorized' });

  const badRequest = validateBody(req, req.body);
  if (badRequest) return res.status(badRequest.status).json({ error: badRequest.error });

  const body = req.body || {};
  // Extract `stream` from body before spreading into restBody so it never leaks to Anthropic
  const { messages: initialMessages, stream: _streamReq, ...restBody } = {
    model: 'claude-sonnet-5',
    max_tokens: 1000,
    ...body,
  };
  // Stream only when explicitly requested and no client-side tools are involved
  const wantsStream = _streamReq === true && !(body.tools && body.tools.length);

  // ── STREAMING PATH ────────────────────────────────────────────────────────────
  if (wantsStream) {
    const trace = startObservation('generate-stream', {
      input: initialMessages,
      metadata: { model: restBody.model, max_tokens: restBody.max_tokens },
    });

    try {
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ ...restBody, messages: initialMessages, stream: true }),
      });

      if (!upstream.ok) {
        // Headers not yet sent — can still return a JSON error
        const errData = await upstream.json().catch(() => ({}));
        trace.update({ output: { error: errData } }).end();
        await safeFlushLangfuse();
        return res.status(upstream.status).json({
          type: 'error',
          error: errData.error || { message: 'Anthropic API error' },
        });
      }

      // From here, commit to SSE — no JSON error possible after writeHead
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '', outputText = '', seenMessageStop = false, stopReason = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
          // Shadow-parse for Langfuse without holding the full body in memory
          sseBuffer += chunk;
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const ev = JSON.parse(line.slice(6));
              if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
                outputText += ev.delta.text;
              }
              if (ev.type === 'message_delta' && ev.delta?.stop_reason) {
                stopReason = ev.delta.stop_reason;
              }
              if (ev.type === 'message_stop') seenMessageStop = true;
            } catch (e) { /* ignore partial SSE lines */ }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Inject error only if truly truncated (no stop_reason AND no message_stop).
      // When stop_reason is set, the model completed — message_stop may be lost to buffering.
      if (!seenMessageStop && stopReason === null) {
        res.write('event: error\ndata: ' + JSON.stringify({
          type: 'error',
          error: { type: 'truncated', message: 'Stream ended without message_stop — response may be truncated' },
        }) + '\n\n');
      } else if (stopReason === 'max_tokens') {
        res.write('event: error\ndata: ' + JSON.stringify({
          type: 'error',
          error: { type: 'max_tokens', message: 'response truncated — token limit reached, dataset too large for a single summary' },
        }) + '\n\n');
      }
      res.end();

      trace.update({ output: outputText, ...(!seenMessageStop && stopReason === null ? { statusMessage: 'truncated' } : stopReason === 'max_tokens' ? { statusMessage: 'max_tokens' } : {}) }).end();
      await safeFlushLangfuse();
    } catch (e) {
      if (!res.headersSent) {
        res.status(500).json({ type: 'error', error: { message: e.message } });
      } else {
        res.end();
      }
      trace.update({ output: { error: e.message } }).end();
      await safeFlushLangfuse();
    }
    return;
  }

  // ── NON-STREAMING PATH (tool use, outreach, ICP scoring, etc.) ───────────────
  const trace = startObservation('generate', {
    input: initialMessages,
    metadata: {
      model: restBody.model,
      max_tokens: restBody.max_tokens,
      has_tools: !!(body.tools && body.tools.length),
    },
  });

  const generation = trace.startObservation('claude-completion', {
    model: restBody.model,
    input: initialMessages,
    modelParameters: { max_tokens: restBody.max_tokens },
  }, { asType: 'generation' });

  try {
    let messages = [...(initialMessages || [])];
    let data;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ ...restBody, messages }),
      });
      data = await response.json();

      if (data.usage) {
        totalInputTokens += data.usage.input_tokens || 0;
        totalOutputTokens += data.usage.output_tokens || 0;
      }

      // Exit: error or final response (end_turn / max_tokens / stop_sequence)
      if (data.type === 'error' || data.stop_reason !== 'tool_use') break;

      // Client-side tool_use: build tool_results and loop.
      // Note: web_search_20250305 is Anthropic-managed — stop_reason is 'end_turn' for it,
      // so this branch is for any future user-defined tools added to the payload.
      const toolUseBlocks = (data.content || []).filter(b => b.type === 'tool_use');
      if (!toolUseBlocks.length) break;

      messages = [
        ...messages,
        { role: 'assistant', content: data.content },
        {
          role: 'user',
          content: toolUseBlocks.map(block => ({
            type: 'tool_result',
            tool_use_id: block.id,
            content: 'Tool result not available server-side.',
          })),
        },
      ];
    }

    if (data.type === 'error') {
      // Erreur en-bande renvoyee par Anthropic (429/529/etc, HTTP 200 cote fetch donc pas
      // interceptee par le catch) -- jusqu'ici loggee comme une completion normale dans Langfuse
      // (generation.end sans level:'ERROR'), aucune trace exploitable pour diagnostiquer un
      // incident apres coup. Fix 2026-09-13 (brief Escalation Handler) : marquer explicitement
      // l'echec + logger le type/message reel cote serveur (console.error, meme convention que
      // les autres api/*.js -- ex. email-send.js/enrich.js sur un non-2xx).
      console.error('[generate] Anthropic in-band error:', data.error?.type || 'unknown_type', data.error?.message || data.error);
      generation.update({ level: 'ERROR', statusMessage: data.error?.message || 'Anthropic API error', output: data.error }).end();
      trace.update({ output: { error: data.error } }).end();
      await safeFlushLangfuse();
      return res.status(502).json({ error: data.error?.message || 'Anthropic API error', errorType: data.error?.type || null });
    }

    // Fix 22/09 (trou de garde trouve en diagnostiquant une troncature reelle sur Manual Send,
    // Corridor) : contrairement au chemin STREAMING ci-dessus (event 'max_tokens' explicite), ce
    // chemin ne verifiait jamais data.stop_reason avant de relayer un succes -- une reponse coupee
    // par la limite de tokens etait indiscernable d'une reponse complete pour l'appelant. Additif
    // uniquement (truncated:true en plus du corps Anthropic normal, jamais de changement de statut
    // HTTP ni de retrait de contenu) : ne casse aucun appelant existant qui ignore ce champ, laisse
    // un appelant qui le regarde deja detecter le cas -- meme visibilite Langfuse que le chemin
    // streaming (statusMessage 'max_tokens'), pour le diagnostic comme pour l'affichage cote client.
    const wasTruncated = data.stop_reason === 'max_tokens';
    if (wasTruncated) {
      console.error('[generate] response truncated: stop_reason=max_tokens, max_tokens requested=', restBody.max_tokens);
    }
    generation.update({
      output: data.content,
      ...(wasTruncated ? { statusMessage: 'max_tokens' } : {}),
      ...(totalInputTokens || totalOutputTokens
        ? { usageDetails: { input: totalInputTokens, output: totalOutputTokens } }
        : {}),
    }).end();
    trace.update({ output: data.content, ...(wasTruncated ? { statusMessage: 'max_tokens' } : {}) }).end();
    await safeFlushLangfuse();
    res.status(200).json(wasTruncated ? { ...data, truncated: true } : data);
  } catch (e) {
    console.error('[generate] exception:', e.message);
    generation.update({ level: 'ERROR', statusMessage: e.message }).end();
    trace.update({ output: { error: e.message } }).end();
    await safeFlushLangfuse();
    res.status(500).json({ error: e.message });
  }
}
