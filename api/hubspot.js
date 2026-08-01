export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.json();
  const { action, apiKey, contact } = body;

  if (!apiKey || !contact) {
    return new Response(JSON.stringify({ error: 'Missing apiKey or contact' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (action === 'upsert_contact') {
    const properties = {
      email: contact.email || '',
      firstname: contact.firstname || '',
      lastname: contact.lastname || '',
      company: contact.company || '',
      jobtitle: contact.jobtitle || '',
      hs_lead_status: contact.hs_lead_status || '',
    };

    // Search for existing contact by email
    let existingId = null;
    if (contact.email) {
      const searchRes = await fetch(
        `https://api.hubapi.com/contacts/v1/contact/email/${encodeURIComponent(contact.email)}/profile`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (searchRes.ok) {
        const existing = await searchRes.json();
        existingId = existing.vid;
      }
    }

    let result;
    if (existingId) {
      // Update existing contact
      result = await fetch(
        `https://api.hubapi.com/contacts/v1/contact/vid/${existingId}/profile`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: Object.entries(properties).map(([k, v]) => ({ property: k, value: v }))
          })
        }
      );
    } else {
      // Create new contact
      result = await fetch(
        'https://api.hubapi.com/contacts/v1/contact',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: Object.entries(properties).map(([k, v]) => ({ property: k, value: v }))
          })
        }
      );
    }

    const data = await result.json();
    return new Response(JSON.stringify({ success: result.ok, data }), {
      status: result.ok ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}
