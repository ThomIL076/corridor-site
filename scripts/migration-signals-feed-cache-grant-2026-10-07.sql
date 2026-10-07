-- MIGRATION signals_feed_cache (07/10/2026, GO de Thomas : option (b) + fonction du smoke test).
-- A appliquer AVANT le deploiement du correctif de kaizenology.html (affichage de l'erreur d'ecriture du cache des signaux).
--
-- Probleme : signals_feed_cache a une politique d'ecriture (signals_feed_cache_owner, FOR ALL) mais le role 'authenticated'
-- n'avait que SELECT sur la table : toute ecriture du navigateur (_saveFeedCache) etait refusee (42501) et la table est
-- restee vide depuis sa creation. Voir CLAUDE.md, section « Fiabilite -- ecritures upsert silencieuses ».
-- owner_read_all_signals_feed_cache (SELECT, auth.uid() = 4a10e38b-...) n'est PAS modifiee.

-- ============ MIGRATION ============
-- 1) WITH CHECK explicite, meme expression que USING (sans changement de comportement : Postgres l'appliquait deja implicitement).
ALTER POLICY signals_feed_cache_owner ON public.signals_feed_cache
  WITH CHECK (client_id = (SELECT clients.client_id FROM clients WHERE clients.auth_user_id = auth.uid()));

-- 2) Droits d'ecriture du role connecte (pas de DELETE : le code ne supprime jamais ; rien pour 'anon').
GRANT INSERT, UPDATE ON public.signals_feed_cache TO authenticated;

-- 3) Fonction du smoke test (has_table_privilege n'est pas appelable via PostgREST sans fonction) : service_role seulement.
CREATE OR REPLACE FUNCTION public.smoke_has_table_privilege(p_role text, p_table text, p_priv text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$ SELECT has_table_privilege(p_role, p_table, p_priv) $$;
REVOKE EXECUTE ON FUNCTION public.smoke_has_table_privilege(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.smoke_has_table_privilege(text, text, text) TO service_role;

-- ============ ROLLBACK COMPLET ============
-- DROP FUNCTION IF EXISTS public.smoke_has_table_privilege(text, text, text);
-- REVOKE INSERT, UPDATE ON public.signals_feed_cache FROM authenticated;
-- DROP POLICY signals_feed_cache_owner ON public.signals_feed_cache;
-- CREATE POLICY signals_feed_cache_owner ON public.signals_feed_cache
--   AS PERMISSIVE FOR ALL TO public
--   USING (client_id = (SELECT clients.client_id FROM clients WHERE clients.auth_user_id = auth.uid()));
