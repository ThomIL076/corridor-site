// Rate limit: SEC EDGAR EFTS enforces a fair-access policy of max 10 req/s.
// This endpoint is called once per Morning Scan run — never in a loop.
// If future usage adds batch calls, add a queue or delay between requests.

export default async function handler(req, res) {
  const {
    q,
    forms = '13F-HR,SC 13D,SC 13G,8-K',
    startdt,
    enddt,
  } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing required parameter: q' });
  }

  const params = new URLSearchParams({ q });
  if (forms)   params.set('forms',   forms);
  if (startdt) params.set('startdt', startdt);
  if (enddt)   params.set('enddt',   enddt);

  const url = `https://efts.sec.gov/LATEST/search-index?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Corridor GTM System thomas@corridor.systems',
        'Accept':     'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('[sec-edgar] SEC EFTS non-200:', response.status, body);
      return res.status(200).json({ hits: { hits: [], total: { value: 0 } } });
    }

    const data = await response.json();

    // SEC EDGAR returns errorType/errorMessage on some 200 responses
    // instead of a hits object — guard explicitly rather than letting
    // downstream code crash on undefined.
    if (!data.hits) {
      console.error('[sec-edgar] SEC EFTS missing hits key:', JSON.stringify(data));
      return res.status(200).json({ hits: { hits: [], total: { value: 0 } } });
    }

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    res.status(200).json(data);
  } catch (e) {
    console.error('[sec-edgar] fetch failed:', e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
}
