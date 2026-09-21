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

import { resolveClient, supabase } from './_auth.js';

export const config = { runtime: 'edge' };

// Fix securite 2026-09-21 (lot 3) : discovery-call-brief-send et call-briefing etaient relayes SANS authentification (call-briefing
// est RETIRE : aucun workflow n'ecoute ce webhook, l'action est inconnue -> 400 sans appel sortant),
// en transmettant tel quel le x-webhook-secret fourni par le navigateur (secret en dur dans les pages publiques ; le
// workflow amont envoie un email depuis le Gmail de Thomas vers un destinataire libre). Desormais : jeton de session
// Supabase + client resolu (helper commun api/_auth.js) pour TOUTES les actions, AVANT tout appel sortant ; le secret
// du webhook est lu dans la variable d'environnement Vercel DISCOVERY_BRIEF_SECRET (jamais fourni par le client : tout
// en-tete x-webhook-secret entrant est ignore) ; le destinataire est celui du client authentifie (owner_inbox_email,
// repli par client identique aux pages) -- une valeur "to" du corps n'est acceptee que si elle lui est identique.

// Base amont -- variable d'environnement Vercel de preference (WORKFLOW_UPSTREAM_BASE),
// avec repli sur la valeur actuelle pour que ca fonctionne meme sans configuration
// supplementaire. Recommande : definir la variable dans Vercel pour pouvoir la faire
// tourner (rotation d'infrastructure) sans redeployer le code.
const UPSTREAM_BASE = process.env.WORKFLOW_UPSTREAM_BASE || 'https://thom076il.app.n8n.cloud';

// Liste blanche stricte : seules ces actions peuvent etre relayees, vers un chemin fixe
// connu a l'avance. Le client ne peut jamais choisir le chemin amont lui-meme.
const ACTIONS = {
  'icp-score-batch': '/webhook/icp-score-batch',
  'discovery-call-brief-send': '/webhook/discovery-call-brief-send'
};

// Repli du destinataire du brief quand clients.owner_inbox_email est vide : memes constantes que _ownerInboxEmail() des
// dashboards (une seule adresse par client, jamais une adresse choisie par l'appelant).
const FALLBACK_OWNER_EMAIL_BY_CLIENT = {
  thomas: 'thomas@corridor.systems',
  kaizenology: 'hello@stephanerogovsky.com',
  'yellowwood-demo': 'eric@yellowwood.com',
  'lka-demo': 'wael@lka.com',
  'phci-demo': 'thomas@corridor.systems'
};
const MAX_BODY_CHARS = 200000;
const MAX_SUBJECT_CHARS = 300;

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
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

  // Authentification obligatoire pour TOUTES les actions, avant toute lecture du corps et tout appel sortant.
  const client = await resolveClient(req, 'owner_inbox_email');
  if (!client) return jsonResponse({ error: 'Unauthorized' }, 401);
  const resolvedClientId = client.client_id;

  let body = '';
  try {
    body = await req.text();
  } catch (e) {
    body = '';
  }
  if (body.length > MAX_BODY_CHARS) return jsonResponse({ error: 'Payload too large' }, 413);

  // icp-score-batch : verification d'appartenance des prospects
  let forwardBody = body;
  let serverSecret = null;

  if (action === 'icp-score-batch') {
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

  // discovery-call-brief-send : le workflow amont envoie un email reel depuis le Gmail de Thomas. Le secret vient de
  // l'environnement serveur (jamais du client), le destinataire du client authentifie, et seules les cles to / subject /
  // html sont relayees. Sans secret configure : arret net, aucun appel sortant.
  if (action === 'discovery-call-brief-send') {
    let parsed;
    try { parsed = JSON.parse(body); } catch (e) {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }
    const recipient = String(client.owner_inbox_email || FALLBACK_OWNER_EMAIL_BY_CLIENT[resolvedClientId] || '').trim();
    if (!recipient) return jsonResponse({ error: 'No recipient configured for this client' }, 400);
    const requestedTo = (parsed.to === undefined || parsed.to === null || parsed.to === '') ? '' : String(parsed.to).trim();
    if (requestedTo && requestedTo.toLowerCase() !== recipient.toLowerCase()) {
      return jsonResponse({ error: 'Recipient not allowed' }, 403);
    }
    if (typeof parsed.html !== 'string' || !parsed.html.trim()) return jsonResponse({ error: 'html required' }, 400);
    const subject = typeof parsed.subject === 'string' ? parsed.subject.slice(0, MAX_SUBJECT_CHARS) : '';
    serverSecret = process.env.DISCOVERY_BRIEF_SECRET || null;
    if (!serverSecret) return jsonResponse({ error: 'Not configured' }, 503);
    forwardBody = JSON.stringify({ to: recipient, subject, html: parsed.html });
  }

  // Construction des headers amont : le x-webhook-secret est TOUJOURS celui de l'environnement serveur.
  // Un en-tete x-webhook-secret envoye par le client n'est jamais relaye.
  const forwardedHeaders = { 'Content-Type': req.headers.get('Content-Type') || 'application/json' };
  if (serverSecret) forwardedHeaders['x-webhook-secret'] = serverSecret;

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
