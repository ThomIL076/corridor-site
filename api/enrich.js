const FE_BASE = 'https://app.fullenrich.com/api/v1/contact/enrich/bulk';

const RL_MAX = parseInt(process.env.RL_MAX || '30', 10);
const RL_WINDOW_MS = 60_000;
const _rlStore = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = _rlStore.get(ip);
  if (!entry || now - entry.windowStart > RL_WINDOW_MS) {
    _rlStore.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RL_MAX) return false;
  entry.count++;
  return true;
}

export default async function handler(req, res) {
  const ip = ((req.headers['x-forwarded-for'] || '') + '').split(',')[0].trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait before retrying.' });
  }

  const apiKey = process.env.FULLENRICH_API_KEY;
  if (!apiKey) return res.status(200).json({ error: 'FULLENRICH_API_KEY not configured' });

  // ── GET: poll enrichment status ──────────────────────────────────────────
  if (req.method === 'GET') {
    const enrichment_id = req.query && req.query.enrichment_id;
    if (!enrichment_id) return res.status(400).json({ error: 'enrichment_id required' });

    try {
      const r = await fetch(FE_BASE + '/' + enrichment_id, {
        headers: { 'Authorization': 'Bearer ' + apiKey }
      });
      const data = await r.json();
      if (!r.ok) console.error('[fullenrich] GET non-2xx response', r.status, JSON.stringify(data));

      // Status field varies by API version — try common names
      const st = (data.status || data.state || '').toLowerCase();
      if (st !== 'done' && st !== 'completed' && st !== 'finished') {
        return res.status(200).json({ status: 'in_progress' });
      }

      // Extract email from first result — FullEnrich uses "datas" (confirmed via logs)
      const results = data.datas || data.data || data.results || [];
      const first = results[0] || {};
      const contact = first.contact || first.contact_info || {};
      const emails = contact.emails || contact.work_emails || first.emails || [];
      const best = emails[0];
      const mpe = contact.most_probable_email
        || (contact.most_probable_work_email && contact.most_probable_work_email.email)
        || null;
      const email = (best && best.email) || mpe || null;
      const phone = contact.most_probable_phone || null;
      return res.status(200).json({ status: 'done', email, phone });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── POST: launch enrichment ───────────────────────────────────────────────
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { linkedin, name, company, domain } = req.body || {};
  if (!linkedin && !name) return res.status(400).json({ error: 'linkedin or name required' });

  const nameParts = (name || '').trim().replace(/^(Dr|Mr|Mrs|Ms|Prof)\.?\s+/i, '').split(/\s+/);
  const firstname = nameParts[0] || '';
  const lastname = nameParts.slice(1).join(' ') || '';

  const contact = { enrich_fields: ['contact.work_emails', 'contact.phones'] };
  if (firstname) contact.firstname = firstname;
  if (lastname) contact.lastname = lastname;
  if (company) contact.company_name = company;
  if (domain) contact.domain = domain;
  if (linkedin) contact.linkedin_url = linkedin;

  try {
    const r = await fetch(FE_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        name: 'Find Email - ' + (name || company || 'prospect'),
        datas: [contact]
      })
    });
    const data = await r.json();
    if (!r.ok) console.error('[fullenrich] POST non-2xx response', r.status, JSON.stringify(data));

    const enrichment_id = data.id || data.enrichment_id || (data.enrichment && data.enrichment.id);
    if (!enrichment_id) return res.status(200).json({ error: 'No enrichment_id', raw: data });
    return res.status(200).json({ enrichment_id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
