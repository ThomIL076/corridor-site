export default async function handler(req, res) {
  const apiKey = process.env.GNEWS_API_KEY;
  const lang = req.query.lang === 'fr' ? 'fr' : 'en';
  const q = lang === 'fr'
    ? 'fintech OR saas OR startup OR financement OR "levée de fonds"'
    : 'fintech OR saas OR adtech OR startup OR "series b" OR "series a" OR funding';
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=${lang}&max=6&apikey=${apiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.articles) {
      const seen = new Set();
      data.articles = data.articles.filter(a => {
        const key = (a.title || '').toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate');
    res.status(200).json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
