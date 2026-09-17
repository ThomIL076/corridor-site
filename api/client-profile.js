import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Fix securite 2026-09-11 (point 2 de l'audit demo-private.html) : loadClientProfile() faisait
// jusqu'ici un select direct Supabase DEPUIS LE NAVIGATEUR incluant ces 6 colonnes -- le plaintext
// atterrissait dans _clientProfile et transitait sur le reseau (visible onglet Network) avant meme
// d'arriver a loadIntegrationsTab()/aux boutons Copy. Masquage ici, au niveau de la lecture :
// jamais renvoye, remplace par un booleen `<champ>_configured`. Independant de la vraie migration
// OAuth par CRM (Salesforce Password Flow -> Authorization Code, proxy Pipedrive a construire) --
// ce chantier-la reste priorise par usage reel, pas fusionne avec ce fix.
const SECRET_FIELDS = [
  'hubspot_api_key',
  'salesforce_client_id',
  'salesforce_client_secret',
  'salesforce_password',
  'pipedrive_api_key',
  'slack_webhook_url',
];

const SELECT_FIELDS = [
  'client_id', 'contact_name', 'company_name', 'display_name', 'avatar_url', 'sender_bio',
  'owner_inbox_email', 'email_campaign_id', 'messaging_playbook',
  'hubspot_api_key', 'hubspot_stage_mapping', 'hubspot_last_sync',
  'salesforce_enabled', 'salesforce_client_id', 'salesforce_client_secret', 'salesforce_username',
  'salesforce_password', 'salesforce_instance_url', 'salesforce_stage_mapping', 'salesforce_last_sync',
  'pipedrive_enabled', 'pipedrive_api_key', 'pipedrive_stage_mapping', 'pipedrive_last_sync',
  'slack_enabled', 'slack_webhook_url', 'slack_events',
].join(', ');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase
    .from('clients')
    .select(SELECT_FIELDS)
    .eq('auth_user_id', user.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: error?.message || 'Profile not found' });
  }

  for (const field of SECRET_FIELDS) {
    data[field + '_configured'] = !!data[field];
    delete data[field];
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(data);
}
