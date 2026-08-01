export const config = { maxDuration: 15 };

const BASE = 'https://api.heyreach.io/api/public';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { linkedinUrl, campaignId } = req.body || {};
  if (!linkedinUrl || !campaignId) {
    return res.status(400).json({ success: false, error: 'linkedinUrl and campaignId required' });
  }

  const clean = (v) => (v || '').replace(/[^\x20-\x7E]/g, '').trim();
  const API_KEY = clean(process.env.HEYREACH_API_KEY);
  if (!API_KEY) {
    return res.status(200).json({ success: false, error: 'HEYREACH_API_KEY not configured' });
  }

  try {
    const r = await fetch(`${BASE}/campaign/RemoveLeadFromCampaign`, {
      method: 'POST',
      headers: { 'X-API-KEY': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: Number(campaignId),
        linkedInProfileUrl: linkedinUrl
      })
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return res.status(200).json({ success: r.ok, detail: data });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e.message) });
  }
}
