// api/workflow-proxy.js
//
// Relaie les actions declenchees depuis les dashboards clients vers l'infrastructure
// d'automatisation interne, sans jamais exposer le domaine ou le nom du fournisseur
// au navigateur. Ce fichier tourne cote serveur (Vercel Edge Function) -- son contenu
// n'est jamais envoye au client, seule la reponse HTTP l'est, et cette reponse ne
// contient que ce que l'action retourne (jamais l'URL amont).
//
// Regle permanente (voir MEMORY.md, confidentialite fournisseurs) : tout nouvel appel
// navigateur -> automatisation doit passer par cette route, jamais par une URL directe
// vers l'infrastructure interne. Ajouter une ligne dans ACTIONS ci-dessous suffit --
// ne jamais laisser le client fournir le chemin amont lui-meme.

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Base amont -- variable d'environnement Vercel de preference (WORKFLOW_UPSTREAM_BASE),
// avec repli sur la valeur actuelle pour que ca fonctionne meme sans configuration
// supplementaire. Recommande : definir la variable dans Vercel pour pouvoir la faire
// tourner (rotation d'infrastructure) sans redeployer le code.
const UPSTREAM_BASE = process.env.WORKFLOW_UPSTREAM_BASE || 'https://thom076il.app.n8n.cloud';

// Liste blanche stricte : seules ces actions peuvent etre relayees, vers un chemin fixe
// connu a l'avance. Le client ne peut jamais choisir le chemin amont lui-meme.
const ACTIONS = {
  'icp-score-batch': '/webhook/icp-score-batch',
  'discovery-call-brief-send': '/webhook/discovery-call-brief-send',
  'call-briefing': '/webhook/call-briefing'
};

async function resolveClientId(token) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return null;
  const { data, error: clErr } = await supabase
    .from('clients')
    .select('client_id')
    .eq('auth_user_id', user.id)
    .single();
  if (clErr || !data?.client_id) return null;
  return data.client_id;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const path = ACTIONS[action];

  if (!path) {
    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body = '';
  try {
    body = await req.text();
  } catch (e) {
    body = '';
  }

  // icp-score-batch : auth Supabase obligatoire + verification d'appartenance des prospects
  let forwardBody = body;
  let serverSecret = null;

  if (action === 'icp-score-batch') {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const resolvedClientId = await resolveClientId(token);
    if (!resolvedClientId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let parsed;
    try { parsed = JSON.parse(body); } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requestedIds = Array.isArray(parsed.prospect_ids) ? parsed.prospect_ids : [];
    if (!requestedIds.length) {
      return new Response(JSON.stringify({ ok: true, scored: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Rejette silencieusement les ids n'appartenant pas au client authentifie
    const { data: owned } = await supabase
      .from('prospects')
      .select('id')
      .in('id', requestedIds)
      .eq('client_id', resolvedClientId);

    const ownedIds = (owned || []).map(r => r.id);
    if (!ownedIds.length) {
      return new Response(JSON.stringify({ ok: true, scored: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    forwardBody = JSON.stringify({ ...parsed, prospect_ids: ownedIds });
    serverSecret = process.env.ICP_SCORE_BATCH_SECRET || null;
  }

  // Construction des headers amont.
  // Pour icp-score-batch : secret lu depuis env serveur, jamais depuis le client.
  // Pour les autres actions : comportement historique (pass-through du secret client).
  const forwardedHeaders = { 'Content-Type': req.headers.get('Content-Type') || 'application/json' };
  if (action === 'icp-score-batch') {
    if (serverSecret) forwardedHeaders['x-webhook-secret'] = serverSecret;
  } else {
    const webhookSecret = req.headers.get('x-webhook-secret');
    if (webhookSecret) forwardedHeaders['x-webhook-secret'] = webhookSecret;
  }

  let upstreamRes;
  try {
    upstreamRes = await fetch(UPSTREAM_BASE + path, {
      method: 'POST',
      headers: forwardedHeaders,
      body: forwardBody
    });
  } catch (e) {
    // Erreur reseau cote serveur uniquement -- ne jamais faire fuiter UPSTREAM_BASE
    // dans le message renvoye au client.
    return new Response(JSON.stringify({ error: 'Upstream request failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const text = await upstreamRes.text();
  return new Response(text, {
    status: upstreamRes.status,
    headers: { 'Content-Type': upstreamRes.headers.get('Content-Type') || 'application/json' }
  });
}
