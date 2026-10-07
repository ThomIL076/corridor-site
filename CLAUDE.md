# CLAUDE.md — corridor-site

## Déploiement

Point d'entrée unique : `./deploy.sh` (ou `npm run deploy`). Enchaîne
`vercel --prod --force` puis `./smoke-tests-corridor.sh` automatiquement,
et sort en erreur (exit 1) si l'une des deux étapes échoue.

**Ne plus appeler `vercel --prod --force` seul** — ça déploie sans lancer les
smoke tests, exactement le problème que `deploy.sh` corrige (roadmap
"empêcher la récurrence", point 5, 2026-09-10 : le test existait déjà mais
restait déclenché manuellement, donc oubliable).

**Après un changement de variable d'environnement Vercel : ne pas cliquer sur
« Redeploy » dans le dashboard** — ça redéploie l'ANCIEN déploiement de prod tel
quel (ancien code) et, s'il arrive après `npm run deploy`, reprend le domaine
(incident 2026-10-04 : la vue Revue > Publications n'apparaissait pas). Lancer
directement `npm run deploy`. Garde-fou : l'étape 3/3 de `deploy.sh` écrit un
tampon unique (`deploy-stamp.txt` : commit + heure UTC + PID) avant le déploiement,
le déploie avec le code, puis le relit sur `corridor.systems` et sort en erreur s'il
diffère (ou 404). Le tampon est supprimé en fin de script, jamais commité.
(Avant le 05/10 le garde-fou comparait `demo-private.html`/`kaizenology.html` : écart
permanent, car `middleware.js` ne sert à une requête anonyme que le shell de connexion.)

Un échec de smoke test n'annule/ne rollback rien automatiquement — il est
juste rendu impossible à manquer (code de sortie non-zéro, bloc affiché en
évidence). Décision de rollback toujours manuelle.

## Fiabilité — écritures upsert silencieuses (2026-09-10)

**Incident** : la table `signals_feed_cache` (cache morning/live signals,
`_loadFeedCache`/`_saveFeedCache`, kaizenology.html uniquement) avait 3 bugs
empilés côté base, trouvés et corrigés par Thomas le 2026-09-10 :
1. Aucun GRANT pour aucun rôle (corrigé le matin).
2. Pas de contrainte unique sur `(client_id, mandate_id)` — l'`onConflict`
   de `_saveFeedCache` ne pouvait cibler aucune contrainte réelle. Corrigé
   (`CREATE UNIQUE INDEX ... NULLS NOT DISTINCT`, Postgres 17).
3. `mandate_id` interdisait `NULL` (d'abord via la clé primaire
   `(client_id, mandate_id)`, puis via un `NOT NULL` résiduel après retrait
   de la PK) — alors que `_loadFeedCache`/`_saveFeedCache` utilisent
   explicitement `NULL` pour "tous mandats" (la vue par défaut). Corrigé
   (PK retirée, `NOT NULL` retiré).

Testé en conditions réelles côté base (insert, update sur la même clé,
confirmation d'une seule ligne, nettoyage) — fonctionne désormais. Le cache
"tous mandats" n'avait donc **jamais** pu être écrit depuis la création de
la table, sans qu'aucune erreur ne remonte jamais.

**Cause de la découverte tardive** : `_loadFeedCache`/`_saveFeedCache` ont
toutes deux un `try { ... } catch(e) { console.warn(...) }` qui avale
l'échec sans jamais le surfacer (pas de toast, pas de compteur d'erreur,
pas de smoke test dédié) — exactement ce qui a permis aux 3 bugs de
coexister indéfiniment.

**Vérifié le même soir, même pattern trouvé ailleurs** :

- `priority_batches` — **RÉSOLU (vérifié le 2026-10-05)**. Le code était identique à
  `signals_feed_cache` avant son fix, mais : (1) le schéma en base est correct
  (index unique `priority_batches_client_mandate_uniq` sur `(client_id, mandate_id)`
  avec `NULLS NOT DISTINCT`, `mandate_id` nullable, GRANT SELECT/INSERT/UPDATE au
  rôle `authenticated`, RLS owner) ; (2) depuis le 2026-09-24, `_prioritiesNext()` /
  `_prioritiesSkip()` n'écrivent plus en upsert direct depuis le navigateur : ils
  appellent `/api/priority-batches-advance` (écriture `service_role` côté serveur,
  `client_id` pris du jeton de session, `mandate_id: null` en vue « tous mandats »),
  sur demo-private, kaizenology et wominds, et les échecs sont surfacés par `showToast`.
  La lecture (`loadDailyPriorities()`) utilise `.is('mandate_id', null)` pour ce cas.
  Couvert par le TEST 5 de `smoke-tests-corridor.sh` (deux écritures `mandate_id` NULL
  sur la même clé = une seule ligne, nettoyée ; nécessite `SUPABASE_SECRET_KEY`).
- `buying_committee_members` (`_addStakeholderToPipeline()`/
  `_bcPersistFromScan()`, 2 sites par fichier, `onConflict: 'prospect_id,role'`)
  — même try/catch silencieux. Pas de colonne nullable dans la clé de conflit
  ici (`prospect_id`/`role` sont toujours renseignés), donc risque structurel
  moindre que `priority_batches` — mais même angle mort de détection.

**Contre-exemple qui marche bien** : l'upsert CSV import (`prospects`,
`onConflict: 'client_id,external_id'`) surface l'erreur via `showToast` +
`console.error` — donc le problème n'est pas systémique à tout le fichier,
seulement à ce pattern précis de catch purement `console.*`.

**Règle à suivre à partir de maintenant** : tout nouvel `upsert(...,
{onConflict: ...})` doit soit surfacer une erreur réelle à l'utilisateur
(toast) soit, a minima, être couvert par un smoke test qui vérifie qu'une
écriture avec `mandate_id: null` réussit réellement — pas seulement que la
requête ne lève pas d'exception côté client.

## n8n — liste de clients à mettre à jour à chaque nouveau client (2026-10-07)

Le workflow **Website Backfill via Exa** (`4dj2JjeS10UtLwBP`, actif, tous les jours à 04:00) ne filtrait aucun client
et dépensait ses 30 recherches Exa quotidiennes sur toutes les fiches, démos comprises. Depuis le 07/10 son nœud
« Fetch Prospects » filtre `client_id=in.(thomas,kaizenology,wominds)`.

**À chaque nouveau client** : ajouter son `client_id` à cette liste (nœud « Fetch Prospects », paramètre `client_id`).
À chaque client retiré : l'enlever. Les démos PHCI, Yellowwood, LKA et SignaTrust ont été supprimées le 07/10/2026
(sauvegardes `backup_*_20261007` en base, workflows n8n archivés, pages retirées du dépôt).
