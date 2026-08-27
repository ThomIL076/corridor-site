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

export const config = { runtime: 'edge' };

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

  // Transmet le Content-Type et le secret de validation propre a l'action, s'il est
  // fourni par le client -- ne jamais les avaler silencieusement (regression trouvee
  // en review du diff icp-score-batch, avant tout commit).
  const forwardedHeaders = { 'Content-Type': req.headers.get('Content-Type') || 'application/json' };
  const webhookSecret = req.headers.get('x-webhook-secret');
  if (webhookSecret) forwardedHeaders['x-webhook-secret'] = webhookSecret;

  let upstreamRes;
  try {
    upstreamRes = await fetch(UPSTREAM_BASE + path, {
      method: 'POST',
      headers: forwardedHeaders,
      body
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
