export const config = { runtime: 'edge' };

/**
 * /api/salesforce.js
 * Synchronise un prospect Corridor vers Salesforce CRM.
 * Crée ou met à jour un Contact + Opportunity dans Salesforce.
 *
 * Authentification : OAuth2 Username-Password Flow
 * Variables d'environnement Vercel requises :
 *   SALESFORCE_CLIENT_ID       — Connected App Consumer Key
 *   SALESFORCE_CLIENT_SECRET   — Connected App Consumer Secret
 *   SALESFORCE_USERNAME        — Salesforce login email
 *   SALESFORCE_PASSWORD        — Salesforce password + security token (concatenated)
 *   SALESFORCE_INSTANCE_URL    — Ex: https://yourorg.my.salesforce.com (optionnel, récupéré via auth)
 *
 * Pour les clients : leurs propres credentials dans leur corridor_config.js
 * transmis dans le body (sfCredentials).
 *
 * Body attendu :
 * {
 *   sfCredentials: {           // Optionnel — si non fourni, utilise les env vars
 *     clientId: string,
 *     clientSecret: string,
 *     username: string,
 *     password: string,        // password + security token
 *     instanceUrl: string,
 *   },
 *   prospect: {
 *     id: string,
 *     name: string,
 *     company: string,
 *     email: string,
 *     stage: string,
 *     icpScore: number,
 *     location: string,
 *     linkedinUrl: string,
 *   },
 *   stageMap: object,          // Mapping stages Corridor → stages Salesforce Opportunity
 *   salesforceContactId: string | null,
 *   salesforceOpportunityId: string | null,
 * }
 */

// Mapping stages Corridor → StageName Salesforce (défaut)
const DEFAULT_STAGE_MAP = {
  'Identified':    'Prospecting',
  '1st Contact':   'Qualification',
  'Researched':    'Qualification',
  'Discovery Call':'Needs Analysis',
  'Engaged':       'Needs Analysis',
  'Proposal':      'Proposal/Price Quote',
  'Negotiation':   'Negotiation/Review',
  'Closed':        'Closed Won',
};

async function getSalesforceToken(creds) {
  const params = new URLSearchParams({
    grant_type:    'password',
    client_id:     creds.clientId,
    client_secret: creds.clientSecret,
    username:      creds.username,
    password:      creds.password,
  });

  const res = await fetch('https://login.salesforce.com/services/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Salesforce auth failed: ${data.error_description || JSON.stringify(data)}`);
  }
  return { token: data.access_token, instanceUrl: data.instance_url };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { sfCredentials, prospect, stageMap, salesforceContactId, salesforceOpportunityId } = body;

  if (!prospect) {
    return new Response('Missing prospect', { status: 400 });
  }

  // Credentials : body (client) ou env vars (Corridor)
  const creds = sfCredentials || {
    clientId:     process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    username:     process.env.SALESFORCE_USERNAME,
    password:     process.env.SALESFORCE_PASSWORD,
  };

  if (!creds.clientId || !creds.clientSecret || !creds.username || !creds.password) {
    return new Response('Missing Salesforce credentials', { status: 400 });
  }

  try {
    // ── 1. AUTH ───────────────────────────────────────────────────────────
    const { token, instanceUrl } = await getSalesforceToken(creds);
    const baseUrl = sfCredentials?.instanceUrl || instanceUrl;
    const apiUrl = `${baseUrl}/services/data/v59.0`;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // ── 2. CONTACT — create or update ────────────────────────────────────
    const nameParts = (prospect.name || 'Unknown').split(' ');
    const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0];
    const lastName  = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Unknown';

    const contactPayload = {
      FirstName:   firstName,
      LastName:    lastName,
      AccountName: prospect.company || '',
      ...(prospect.email ? { Email: prospect.email } : {}),
      ...(prospect.linkedinUrl ? { LinkedIn_URL__c: prospect.linkedinUrl } : {}),
      Description: `[Corridor] ICP Score: ${prospect.icpScore || 'N/A'} · Location: ${prospect.location || 'N/A'}`,
      LeadSource:  'Corridor GTM',
    };

    let contactId = salesforceContactId || null;

    if (contactId) {
      // Update
      await fetch(`${apiUrl}/sobjects/Contact/${contactId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(contactPayload),
      });
    } else {
      // Search by email first
      if (prospect.email) {
        const search = await fetch(
          `${apiUrl}/query?q=${encodeURIComponent(`SELECT Id FROM Contact WHERE Email = '${prospect.email}' LIMIT 1`)}`,
          { headers }
        );
        const searchData = await search.json();
        if (searchData.records?.length > 0) {
          contactId = searchData.records[0].Id;
          await fetch(`${apiUrl}/sobjects/Contact/${contactId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(contactPayload),
          });
        }
      }

      // If still no contactId, search by name + company
      if (!contactId) {
        const search = await fetch(
          `${apiUrl}/query?q=${encodeURIComponent(`SELECT Id FROM Contact WHERE LastName = '${lastName}' AND Account.Name = '${(prospect.company || '').replace(/'/g, "\\'")}' LIMIT 1`)}`,
          { headers }
        );
        const searchData = await search.json();
        if (searchData.records?.length > 0) {
          contactId = searchData.records[0].Id;
          await fetch(`${apiUrl}/sobjects/Contact/${contactId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(contactPayload),
          });
        }
      }

      // Create new contact
      if (!contactId) {
        const res = await fetch(`${apiUrl}/sobjects/Contact`, {
          method: 'POST',
          headers,
          body: JSON.stringify(contactPayload),
        });
        const data = await res.json();
        if (!data.success && !data.id) throw new Error(`Contact create failed: ${JSON.stringify(data)}`);
        contactId = data.id;
      }
    }

    // ── 3. OPPORTUNITY — create or update ────────────────────────────────
    const mergedStageMap = { ...DEFAULT_STAGE_MAP, ...(stageMap || {}) };
    const sfStage = mergedStageMap[prospect.stage] || 'Prospecting';

    // Close date = 90 jours par défaut
    const closeDate = new Date();
    closeDate.setDate(closeDate.getDate() + 90);
    const closeDateStr = closeDate.toISOString().split('T')[0];

    const oppPayload = {
      Name:        `${prospect.company || prospect.name} — Corridor`,
      StageName:   sfStage,
      CloseDate:   closeDateStr,
      LeadSource:  'Corridor GTM',
      Description: `[Corridor] Stage: ${prospect.stage} · ICP Score: ${prospect.icpScore || 'N/A'} · Location: ${prospect.location || 'N/A'}`,
    };

    let opportunityId = salesforceOpportunityId || null;

    if (opportunityId) {
      await fetch(`${apiUrl}/sobjects/Opportunity/${opportunityId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(oppPayload),
      });
    } else {
      // Search existing opportunity
      const search = await fetch(
        `${apiUrl}/query?q=${encodeURIComponent(`SELECT Id FROM Opportunity WHERE Name LIKE '%${(prospect.company || prospect.name || '').replace(/'/g, "\\'")}%' AND IsClosed = false LIMIT 1`)}`,
        { headers }
      );
      const searchData = await search.json();

      if (searchData.records?.length > 0) {
        opportunityId = searchData.records[0].Id;
        await fetch(`${apiUrl}/sobjects/Opportunity/${opportunityId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(oppPayload),
        });
      } else {
        const res = await fetch(`${apiUrl}/sobjects/Opportunity`, {
          method: 'POST',
          headers,
          body: JSON.stringify(oppPayload),
        });
        const data = await res.json();
        if (!data.success && !data.id) throw new Error(`Opportunity create failed: ${JSON.stringify(data)}`);
        opportunityId = data.id;
      }
    }

    // ── 4. Link Contact to Opportunity ───────────────────────────────────
    if (contactId && opportunityId) {
      // Check if OpportunityContactRole exists
      const roleSearch = await fetch(
        `${apiUrl}/query?q=${encodeURIComponent(`SELECT Id FROM OpportunityContactRole WHERE OpportunityId = '${opportunityId}' AND ContactId = '${contactId}' LIMIT 1`)}`,
        { headers }
      );
      const roleData = await roleSearch.json();

      if (!roleData.records?.length) {
        await fetch(`${apiUrl}/sobjects/OpportunityContactRole`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            OpportunityId: opportunityId,
            ContactId:     contactId,
            Role:          'Decision Maker',
            IsPrimary:     true,
          }),
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, contactId, opportunityId }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
