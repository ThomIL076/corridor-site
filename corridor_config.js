const CORRIDOR_CONFIG = {
  // Identité client
  clientName: "Corridor",
  clientUserName: "Thomas Dratler",
  clientDomain: "corridor.systems",
  clientFirstName: "Thomas",
  clientColor: "#1a2b5e",        // Couleur principale (boutons, accents) — Corridor navy
  clientColorLight: "#EEF1FA",   // Fond clair dérivé — soft navy tint
  clientLogo: null,              // URL logo ou null pour afficher clientName en texte

  // Webhooks n8n
  dashboardDataUrl: "https://thom076il.app.n8n.cloud/webhook/dashboard-data",
  warmthScoreUrl: "https://thom076il.app.n8n.cloud/webhook/warmth-score",
  warmthResultsUrl: "https://thom076il.app.n8n.cloud/webhook/warmth-results",
  callBriefingUrl: "https://thom076il.app.n8n.cloud/webhook/call-briefing",
  postBridgeUrl: "https://thom076il.app.n8n.cloud/webhook/post-published",

  // ── SLACK ────────────────────────────────────────────────────────────────
  // Activer : passer slackEnabled à true + renseigner slackWebhookUrl
  // Pour les clients : remplacer slackWebhookUrl par leur webhook Slack entrant
  slackEnabled: false,
  slackWebhookUrl: "",           // Ex: https://hooks.slack.com/services/XXX/YYY/ZZZ
  slackChannel: "#pipeline",    // Channel cible (informatif, géré côté Slack)
  // Événements déclencheurs (true = activé)
  slackEvents: {
    stageEngaged: true,          // Prospect passe en "Engaged"
    stageProposal: true,         // Prospect passe en "Proposal"
    icpAlert: true,              // Morning Scan : nouveau prospect ICP ≥ 9.0
    pipelineReview: true,        // Rapport Pipeline Reviewer vendredi
  },

  // ── HUBSPOT ──────────────────────────────────────────────────────────────
  hubspotEnabled: false,
  hubspotApiKey: "",             // Private App Token HubSpot
  hubspotPipelineId: "",         // ID du pipeline deals HubSpot

  // ── SALESFORCE ───────────────────────────────────────────────────────────
  // OAuth2 — credentials configurés via variables d'environnement Vercel
  // SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET, SALESFORCE_INSTANCE_URL
  salesforceEnabled: false,
  salesforceInstanceUrl: "",     // Ex: https://yourorg.my.salesforce.com

  // ── PIPEDRIVE ────────────────────────────────────────────────────────────
  pipedriveEnabled: false,
  pipedriveApiKey: "",           // API token Pipedrive (Settings > Personal > API)
  pipedriveStageMap: {           // Mapping stages Corridor → IDs stages Pipedrive
    "Identified": 1,
    "1st Contact": 2,
    "Engaged": 3,
    "Proposal": 4,
    "Closed": 5,
  },

  // ── SMARTLEAD ────────────────────────────────────────────────────────────
  // Un workspace et une campagne dédiés par client — jamais partager corridor-gtm-system.com
  // Chaque déploiement client doit avoir SMARTLEAD_API_KEY dans ses env vars Vercel
  smartleadEnabled: true,
  smartleadCampaignId: "3708966",    // ID campagne Smartlead (propre à ce client)

  // ── CLAY ─────────────────────────────────────────────────────────────────
  // Enrichissement avancé à la demande depuis le Dashboard
  clayEnabled: false,
  clayWebhookUrl: "",            // Webhook Clay table (Settings > Integrations > Webhook)
  clayCallbackSecret: "",        // Secret pour valider les callbacks Clay → Corridor

  // Scoring ICP — pays prioritaires (score sur 10)
  geoScores: {
    "France": 10, "Belgium": 10, "Netherlands": 10, "Israel": 10,
    "UK": 8, "Germany": 8, "Canada": 7, "USA": 4
  },

  // Scoring ICP — secteurs prioritaires (score sur 10)
  sectorScores: {
    "AdTech": 10, "Fintech/Payments": 9, "B2B SaaS": 7,
    "Retail Tech": 6, "Data/eCommerce": 6
  },

  // Scoring ICP — titres (score sur 10)
  titleScores: {
    "CEO": 10, "Founder": 10, "Co-Founder": 10, "Chief": 9,
    "VP": 9, "Vice": 8, "Director": 7, "Head": 6, "Lead": 5,
    "CTO": 10, "CRO": 10, "CMO": 9, "President": 10, "Manager": 5
  },

  // Paramètres outreach
  linkedInDailyQuota: 20,
  followUpAlertDays: 7,
};

export default CORRIDOR_CONFIG;
