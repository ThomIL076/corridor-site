export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query required' });

  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    // Graceful fallback: return empty results so the Scanner still works
    return res.status(200).json({ results: [] });
  }

  try {
    const r = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ query, numResults: 5, type: 'neural' })
    });
    const data = await r.json();
    const results = (data.results || []).map(item => ({
      title: item.title || '',
      url:   item.url   || '',
      text:  (item.text || '').slice(0, 500)
    }));
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json({ results });
  } catch(e) {
    res.status(200).json({ results: [], error: e.message });
  }
}
