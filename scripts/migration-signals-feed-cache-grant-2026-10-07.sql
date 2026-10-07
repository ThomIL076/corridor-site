-- BROUILLON : NON APPLIQUE (07/10/2026). A appliquer a la main, AVANT le deploiement du correctif de kaizenology.html
-- (affichage de l'erreur d'ecriture du cache des signaux).
--
-- Probleme : signals_feed_cache a une politique d'ecriture (signals_feed_cache_owner, FOR ALL) mais le role 'authenticated'
-- n'a que SELECT sur la table : toute ecriture du navigateur (_saveFeedCache) est refusee (42501, permission denied) et la
-- table est restee vide depuis sa creation. Voir CLAUDE.md, section « Fiabilite -- ecritures upsert silencieuses ».
--
-- Politique existante (pg_policies) :
--   signals_feed_cache_owner : PERMISSIVE, roles {public}, cmd ALL,
--     USING (client_id = (SELECT clients.client_id FROM clients WHERE clients.auth_user_id = auth.uid())),
--     WITH CHECK : non renseigne -> Postgres applique l'expression USING aussi en WITH CHECK pour INSERT/UPDATE.
--   owner_read_all_signals_feed_cache : SELECT, auth.uid() = 4a10e38b-... (lecture de tout par le proprietaire du compte).
-- Verifie en transaction annulee avec l'identite de chaque utilisateur (le GRANT ci-dessous simule dans la transaction) :
--   * l'utilisateur Wominds ne peut pas ecrire client_id='kaizenology' (42501, new row violates row-level security) ;
--   * l'utilisateur Kaizenology ecrit sa ligne avec mandate_id NULL : deux upserts = une seule ligne ;
--   * l'utilisateur Kaizenology ne voit pas les lignes de Wominds.

-- ============ MIGRATION ============
GRANT INSERT, UPDATE ON public.signals_feed_cache TO authenticated;
-- (pas de DELETE : le code ne supprime jamais ; pas de droit pour 'anon')

-- Option : rendre le WITH CHECK explicite (meme expression que USING ; sans effet de comportement, evite l'ambiguite) :
-- ALTER POLICY signals_feed_cache_owner ON public.signals_feed_cache
--   WITH CHECK (client_id = (SELECT clients.client_id FROM clients WHERE clients.auth_user_id = auth.uid()));

-- Option pour le smoke test (has_table_privilege n'est pas appelable via PostgREST sans fonction) :
-- CREATE OR REPLACE FUNCTION public.smoke_has_table_privilege(p_role text, p_table text, p_priv text)
-- RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp
-- AS $$ SELECT has_table_privilege(p_role, p_table, p_priv) $$;
-- REVOKE ALL ON FUNCTION public.smoke_has_table_privilege(text, text, text) FROM PUBLIC, anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.smoke_has_table_privilege(text, text, text) TO service_role;

-- ============ RETOUR ARRIERE ============
-- REVOKE INSERT, UPDATE ON public.signals_feed_cache FROM authenticated;
-- DROP FUNCTION IF EXISTS public.smoke_has_table_privilege(text, text, text);
-- (si le WITH CHECK explicite a ete ajoute : ALTER POLICY signals_feed_cache_owner ON public.signals_feed_cache WITH CHECK (NULL) n'est pas possible ;
--  recreer la politique sans WITH CHECK : DROP POLICY + CREATE POLICY signals_feed_cache_owner ... USING (...) seulement.)
