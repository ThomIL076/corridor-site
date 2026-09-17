import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { startObservation } from '@langfuse/tracing';

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = ((req.headers['x-forwarded-for'] || '') + '').split(',')[0].trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      type: 'error',
      error: { type: 'rate_limit_error', message: 'Too many requests. Please wait before retrying.' },
    });
  }

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

    generation.update({
      output: data.content,
      ...(totalInputTokens || totalOutputTokens
        ? { usageDetails: { input: totalInputTokens, output: totalOutputTokens } }
        : {}),
    }).end();
    trace.update({ output: data.content }).end();
    await safeFlushLangfuse();
    res.status(200).json(data);
  } catch (e) {
    console.error('[generate] exception:', e.message);
    generation.update({ level: 'ERROR', statusMessage: e.message }).end();
    trace.update({ output: { error: e.message } }).end();
    await safeFlushLangfuse();
    res.status(500).json({ error: e.message });
  }
}
