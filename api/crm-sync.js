export const config = { runtime: 'edge' };

/**
 * /api/pipedrive.js
 * Synchronise un prospect Corridor vers Pipedrive CRM.
 * Crée ou met à jour un Deal + Person dans Pipedrive.
 *
 * Body attendu :
 * {
 *   apiKey: string,           // Pipedrive API token (depuis corridor_config.js)
 *   prospect: {
 *     id: string,             // UUID Supabase
 *     name: string,           // Prénom Nom
 *     company: string,
 *     email: string,
 *     stage: string,          // Stage Corridor
 *     icpScore: number,
 *     location: string,
 *     linkedinUrl: string,
 *   },
 *   stageMap: object,         // Mapping stages Corridor → IDs Pipedrive
 *   pipedrivePersonId: number | null,  // Si déjà sync
 *   pipedriveDealId: number | null,    // Si déjà sync
 * }
 *
 * Retourne :
 * { ok: true, personId, dealId }
 */

const PIPEDRIVE_BASE = 'https://api.pipedrive.com/v1';

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

  const { action, apiKey, prospect, stageMap, pipedrivePersonId, pipedriveDealId } = body;

  if (!apiKey) {
    return new Response('Missing apiKey', { status: 400 });
  }

  const headers = { 'Content-Type': 'application/json' };
  const qs = `?api_token=${encodeURIComponent(apiKey)}`;

  // ── Test connection + fetch deal stages (ajouté 2026-09-10, pattern identique
  // à hubspot.js action=get_pipelines) : sans action, comportement de sync
  // inchangé plus bas -- retro-compatible avec tout appelant existant.
  if (action === 'get_stages') {
    const res = await fetch(`https://api.pipedrive.com/v1/stages${qs}`, { headers });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return new Response(JSON.stringify({ success: false, error: data.error || 'Invalid API token or insufficient permissions' }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    const pipelinesRes = await fetch(`https://api.pipedrive.com/v1/pipelines${qs}`, { headers });
    const pipelinesData = await pipelinesRes.json();
    const pipelineNames = {};
    (pipelinesData.data || []).forEach(p => { pipelineNames[p.id] = p.name; });
    const stages = (data.data || []).map(s => ({
      id: s.id, label: s.name, pipeline: pipelineNames[s.pipeline_id] || `Pipeline ${s.pipeline_id}`, pipelineId: s.pipeline_id
    }));
    const pipelineCount = new Set(stages.map(s => s.pipelineId)).size;
    return new Response(JSON.stringify({ success: true, stages, pipelineCount }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  if (!prospect) {
    return new Response('Missing prospect', { status: 400 });
  }

  try {
    // ── 1. PERSON — create or update ──────────────────────────────────────
    let personId = pipedrivePersonId || null;

    const personPayload = {
      name: prospect.name || 'Unknown',
      org_name: prospect.company || '',
      ...(prospect.email ? { email: [{ value: prospect.email, primary: true }] } : {}),
      ...(prospect.linkedinUrl ? { linkedin: prospect.linkedinUrl } : {}),
    };

    if (personId) {
      // Update existing person
      const res = await fetch(`${PIPEDRIVE_BASE}/persons/${personId}${qs}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(personPayload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(`Person update failed: ${JSON.stringify(data.error)}`);
    } else {
      // Search for existing person by name + company
      const search = await fetch(
        `${PIPEDRIVE_BASE}/persons/search${qs}&term=${encodeURIComponent(prospect.name || '')}&fields=name&exact_match=false&limit=1`,
        { headers }
      );
      const searchData = await search.json();
      const existing = searchData?.data?.items?.[0]?.item;

      if (existing && existing.organization?.name?.toLowerCase() === (prospect.company || '').toLowerCase()) {
        personId = existing.id;
        // Update
        await fetch(`${PIPEDRIVE_BASE}/persons/${personId}${qs}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(personPayload),
        });
      } else {
        // Create new person
        const res = await fetch(`${PIPEDRIVE_BASE}/persons${qs}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(personPayload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(`Person create failed: ${JSON.stringify(data.error)}`);
        personId = data.data.id;
      }
    }

    // ── 2. DEAL — create or update ────────────────────────────────────────
    // Résoudre le stage Pipedrive depuis le mapping
    const stageId = stageMap?.[prospect.stage] || null;

    const dealPayload = {
      title: `${prospect.company || prospect.name} — Corridor`,
      person_id: personId,
      ...(stageId ? { stage_id: stageId } : {}),
      // Champ custom ICP Score si disponible (field key à configurer côté Pipedrive)
      // custom_fields: { icp_score: prospect.icpScore }
    };

    let dealId = pipedriveDealId || null;

    if (dealId) {
      // Update existing deal
      const res = await fetch(`${PIPEDRIVE_BASE}/deals/${dealId}${qs}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(dealPayload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(`Deal update failed: ${JSON.stringify(data.error)}`);
    } else {
      // Search for existing deal linked to this person
      const search = await fetch(
        `${PIPEDRIVE_BASE}/deals/search${qs}&term=${encodeURIComponent(prospect.company || prospect.name || '')}&fields=title&exact_match=false&limit=5`,
        { headers }
      );
      const searchData = await search.json();
      const existingDeal = searchData?.data?.items?.find(
        item => item.item?.person_id === personId
      );

      if (existingDeal) {
        dealId = existingDeal.item.id;
        await fetch(`${PIPEDRIVE_BASE}/deals/${dealId}${qs}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(dealPayload),
        });
      } else {
        // Create new deal
        const res = await fetch(`${PIPEDRIVE_BASE}/deals${qs}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(dealPayload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(`Deal create failed: ${JSON.stringify(data.error)}`);
        dealId = data.data.id;
      }
    }

    // ── 3. Add note with Corridor context ────────────────────────────────
    const notePayload = {
      content: `[Corridor] Stage: ${prospect.stage} · ICP Score: ${prospect.icpScore || 'N/A'} · Location: ${prospect.location || 'N/A'}`,
      deal_id: dealId,
      person_id: personId,
    };

    await fetch(`${PIPEDRIVE_BASE}/notes${qs}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(notePayload),
    });

    return new Response(
      JSON.stringify({ ok: true, personId, dealId }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
