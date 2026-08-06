import Langfuse from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

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
  const { messages: initialMessages, ...restBody } = { model: 'claude-sonnet-5', max_tokens: 1000, ...body };

  const trace = langfuse.trace({
    name: 'generate',
    input: initialMessages,
    metadata: {
      model: restBody.model,
      max_tokens: restBody.max_tokens,
      has_tools: !!(body.tools && body.tools.length),
    },
  });

  const generation = trace.generation({
    name: 'claude-completion',
    model: restBody.model,
    input: initialMessages,
    modelParameters: { max_tokens: restBody.max_tokens },
  });

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

    generation.end({
      output: data.content,
      usage: totalInputTokens || totalOutputTokens
        ? { input: totalInputTokens, output: totalOutputTokens }
        : undefined,
    });
    trace.update({ output: data.content });

    await langfuse.flushAsync();
    if (data.type === 'error') {
      return res.status(502).json({ error: data.error?.message || 'Anthropic API error' });
    }
    res.status(200).json(data);
  } catch (e) {
    generation.end({ level: 'ERROR', statusMessage: e.message });
    trace.update({ output: { error: e.message } });
    await langfuse.flushAsync();
    res.status(500).json({ error: e.message });
  }
}
