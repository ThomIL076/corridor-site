export const config = { runtime: 'edge' };

// Proxy organisation firmographique — clé injectée serveur, jamais exposée au navigateur.
// Retourne uniquement les champs utilisés par le dashboard, avec des noms neutres.
// Aucun nom de fournisseur ne transite dans la réponse ni dans les logs navigateur.
export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const url = new URL(req.url);
  const domain = (url.searchParams.get('domain') || '').trim().toLowerCase();
  if (!domain) {
    return new Response(JSON.stringify({ error: 'domain required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Not configured' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  let raw;
  try {
    const r = await fetch(
      `https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`,
      { headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' } }
    );
    raw = await r.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Upstream request failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const org = raw?.organization || {};
  const events = Array.isArray(org.funding_events) ? org.funding_events : [];
  const latest = events.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0] || null;
  return new Response(JSON.stringify({
    employees:     org.estimated_num_employees  || null,
    funding_stage: latest?.type                 || null,
    funding_date:  latest?.date ? String(latest.date).slice(0, 10) : null,
    total_funding: org.total_funding_printed    || null
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
