export const config = { runtime: 'edge' };

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.json();
  const { action, apiKey, contact } = body;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing apiKey' }), {
      status: 400, headers: JSON_HEADERS
    });
  }

  // ── Test connection + fetch deal pipeline stages ──────────────────────────
  if (action === 'get_pipelines') {
    const res = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return new Response(JSON.stringify({ success: false, error: err.message || 'Invalid API key or insufficient permissions' }), {
        status: 200, headers: JSON_HEADERS
      });
    }
    const data = await res.json();
    const pipelines = data.results || [];
    const stages = [];
    for (const pipeline of pipelines) {
      for (const stage of (pipeline.stages || [])) {
        stages.push({ id: stage.id, label: stage.label, pipeline: pipeline.label, pipelineId: pipeline.id });
      }
    }
    return new Response(JSON.stringify({ success: true, stages, pipelineCount: pipelines.length }), {
      status: 200, headers: JSON_HEADERS
    });
  }

  // ── Upsert contact ─────────────────────────────────────────────────────────
  if (action === 'upsert_contact') {
    if (!contact) {
      return new Response(JSON.stringify({ error: 'Missing contact' }), {
        status: 400, headers: JSON_HEADERS
      });
    }
    const properties = {
      email: contact.email || '',
      firstname: contact.firstname || '',
      lastname: contact.lastname || '',
      company: contact.company || '',
      jobtitle: contact.jobtitle || '',
      hs_lead_status: contact.hs_lead_status || '',
    };

    let existingId = null;
    if (contact.email) {
      const searchRes = await fetch(
        `https://api.hubapi.com/contacts/v1/contact/email/${encodeURIComponent(contact.email)}/profile`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (searchRes.ok) {
        const existing = await searchRes.json();
        existingId = existing.vid;
      }
    }

    let result;
    if (existingId) {
      result = await fetch(
        `https://api.hubapi.com/contacts/v1/contact/vid/${existingId}/profile`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ properties: Object.entries(properties).map(([k, v]) => ({ property: k, value: v })) })
        }
      );
    } else {
      result = await fetch(
        'https://api.hubapi.com/contacts/v1/contact',
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ properties: Object.entries(properties).map(([k, v]) => ({ property: k, value: v })) })
        }
      );
    }

    const data = await result.json();
    return new Response(JSON.stringify({ success: result.ok, data }), {
      status: result.ok ? 200 : 400, headers: JSON_HEADERS
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400, headers: JSON_HEADERS
  });
}
