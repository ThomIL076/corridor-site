-- ============================================================
-- CORRIDOR — Multi-client trial system
-- Project: oanokmugroiahtgcecbn (EU Ireland)
-- Run in: supabase.com → SQL Editor
-- ============================================================

-- ── 1. TABLE CLIENTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email             TEXT UNIQUE NOT NULL,
  company_name      TEXT NOT NULL,
  contact_name      TEXT NOT NULL,
  auth_user_id      UUID REFERENCES auth.users(id),
  status            TEXT DEFAULT 'trial'
                    CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  plan              TEXT DEFAULT 'solo'
                    CHECK (plan IN ('solo', 'team')),
  trial_starts_at   TIMESTAMPTZ DEFAULT NOW(),
  trial_expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clients_auth_user_id_idx ON clients(auth_user_id);
CREATE INDEX IF NOT EXISTS clients_email_idx ON clients(email);
CREATE INDEX IF NOT EXISTS clients_status_idx ON clients(status);

-- ── 2. ROW LEVEL SECURITY ──────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Service role : accès complet (workflows n8n, admin)
CREATE POLICY "service_role_all" ON clients
  FOR ALL
  USING (auth.role() = 'service_role');

-- Client authentifié : lecture de sa propre ligne uniquement
CREATE POLICY "client_self_read" ON clients
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- ── 3. FONCTION CHECK_CLIENT_ACCESS ───────────────────────
CREATE OR REPLACE FUNCTION check_client_access(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  client_record clients%ROWTYPE;
BEGIN
  SELECT * INTO client_record
  FROM clients
  WHERE auth_user_id = user_id;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- Actif : accès permanent
  IF client_record.status = 'active' THEN
    RETURN 'active';
  END IF;

  -- Trial en cours
  IF client_record.status = 'trial'
     AND client_record.trial_expires_at > NOW() THEN
    RETURN 'trial';
  END IF;

  -- Trial expiré : mettre à jour le statut automatiquement
  IF client_record.status = 'trial'
     AND client_record.trial_expires_at <= NOW() THEN
    UPDATE clients
    SET status = 'expired', updated_at = NOW()
    WHERE id = client_record.id;
    RETURN 'expired';
  END IF;

  -- Cancelled ou autre
  RETURN client_record.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permettre aux utilisateurs authentifiés d'appeler la fonction RPC
GRANT EXECUTE ON FUNCTION check_client_access(UUID) TO authenticated;

-- ── 4. FONCTION GET_TRIAL_INFO (badge "X days left") ───────
CREATE OR REPLACE FUNCTION get_trial_info(user_id UUID)
RETURNS JSON AS $$
DECLARE
  client_record clients%ROWTYPE;
  days_left INTEGER;
BEGIN
  SELECT * INTO client_record
  FROM clients
  WHERE auth_user_id = user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('status', 'not_found', 'days_left', 0);
  END IF;

  days_left := GREATEST(0,
    EXTRACT(DAY FROM (client_record.trial_expires_at - NOW()))::INTEGER
  );

  RETURN json_build_object(
    'status',           client_record.status,
    'plan',             client_record.plan,
    'company_name',     client_record.company_name,
    'contact_name',     client_record.contact_name,
    'trial_expires_at', client_record.trial_expires_at,
    'days_left',        days_left
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_trial_info(UUID) TO authenticated;

-- ── 5. TRIGGER updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ── 6. VÉRIFICATION ───────────────────────────────────────
-- Après exécution, vérifier avec :
-- SELECT * FROM clients;
-- SELECT check_client_access('00000000-0000-0000-0000-000000000000');

-- ── MEMO : ONBOARDING NOUVEAU CLIENT ──────────────────────
-- 1. Supabase Auth → Authentication → Users → Invite user (email client)
-- 2. Récupérer le auth_user_id généré
-- 3. Exécuter :
--
-- INSERT INTO clients (email, company_name, contact_name, auth_user_id, plan)
-- VALUES (
--   'samah@stern.technology',
--   'Stern Technology',
--   'Samah Elaouni-Djouadi',
--   'AUTH-UUID-ICI',
--   'solo'
-- );
--
-- 4. Envoyer corridor.systems/demo-private + mot de passe au client
-- 5. Vérifier badge "Trial · X days left" après login
--
-- Pour passer trial → active (après paiement) :
-- UPDATE clients SET status = 'active' WHERE email = 'samah@stern.technology';
