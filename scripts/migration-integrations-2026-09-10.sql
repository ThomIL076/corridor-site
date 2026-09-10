-- ============================================================
-- Migration : colonnes clients.* pour Salesforce/Pipedrive/Slack
-- (refonte onglet Integrations, 2026-09-10)
--
-- Miroir exact du pattern déjà en place pour HubSpot
-- (clients.hubspot_api_key / hubspot_last_sync / hubspot_stage_mapping) :
-- credentials stockés en base par client, jamais dans corridor_config.js
-- (inaccessible à un cron serveur / partagé entre déploiements git).
--
-- Aucun GRANT ajouté ici : la table `clients` a déjà
-- "GRANT SELECT, UPDATE ON clients TO authenticated" (cf. CLAUDE.md
-- alliance-grid-agent, règle du 14/06/2026) -- un GRANT au niveau table
-- couvre toute nouvelle colonne, pas besoin de le reposer par colonne.
-- Si les updates HubSpot existants fonctionnent déjà (confirmé, en
-- prod), ces nouvelles colonnes hériteront du même droit sans action
-- supplémentaire. À vérifier après application si un update échoue
-- avec une erreur de permission -- même famille de bug que
-- workflow_health/signal_outcomes/signals_feed_cache/priority_batches
-- trouvés plus tôt aujourd'hui.
-- ============================================================

-- ── SALESFORCE ──────────────────────────────────────────────
-- OAuth2 username-password flow (cf. api/salesforce.js) -- 4 champs,
-- pas une simple clé API comme HubSpot/Pipedrive.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS salesforce_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS salesforce_client_id text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS salesforce_client_secret text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS salesforce_username text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS salesforce_password text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS salesforce_instance_url text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS salesforce_stage_mapping jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS salesforce_last_sync timestamptz;

-- ── PIPEDRIVE ───────────────────────────────────────────────
-- Simple API token (cf. api/crm-sync.js, alias historique /api/pipedrive.js).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pipedrive_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pipedrive_api_key text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pipedrive_stage_mapping jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pipedrive_last_sync timestamptz;

-- ── SLACK ───────────────────────────────────────────────────
-- Webhook + toggles par événement, lu/écrit par le dashboard ET
-- transmis en clientWebhookUrl à /api/team-notify (qui forward vers le
-- webhook n8n "Slack Notifier" déjà en prod, avec override par client).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS slack_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS slack_webhook_url text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS slack_events jsonb NOT NULL DEFAULT
  '{"stageEngaged":true,"stageProposal":true,"icpAlert":true,"pipelineReview":true}'::jsonb;

-- Vérification rapide après application :
-- SELECT column_name, data_type, column_default FROM information_schema.columns
-- WHERE table_name = 'clients' AND column_name LIKE 'salesforce_%'
--    OR column_name LIKE 'pipedrive_%' OR column_name LIKE 'slack_%'
-- ORDER BY column_name;
