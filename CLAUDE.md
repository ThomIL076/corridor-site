# CLAUDE.md — corridor-site

## Déploiement

Point d'entrée unique : `./deploy.sh` (ou `npm run deploy`). Enchaîne
`vercel --prod --force` puis `./smoke-tests-corridor.sh` automatiquement,
et sort en erreur (exit 1) si l'une des deux étapes échoue.

**Ne plus appeler `vercel --prod --force` seul** — ça déploie sans lancer les
smoke tests, exactement le problème que `deploy.sh` corrige (roadmap
"empêcher la récurrence", point 5, 2026-09-10 : le test existait déjà mais
restait déclenché manuellement, donc oubliable).

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

- `priority_batches` — **code confirmé identique à `signals_feed_cache` avant
  son fix, schéma base PAS ENCORE vérifié** (pas de credentials service_role
  valides à ce moment pour interroger la base directement — à vérifier
  manuellement). Fonctions et points d'appel exacts :
  - `_prioritiesNext()` — `demo-private.html:9997-10000`, `kaizenology.html:9200-9203`
  - `_prioritiesSkip()` — `demo-private.html:10025-10028`, `kaizenology.html:9228-9231`

  Dans les 4 sites, `mandate_id: _pbMandateId` où
  `_pbMandateId = (activeMandateId && activeMandateId !== '__ALL__') ? activeMandateId : null`
  — donc explicitement `null` en vue consolidée ("tous mandats"), même rôle
  exact que `_sfcId` dans `_saveFeedCache`. `onConflict: 'client_id,mandate_id'`
  identique. Le try/catch n'aboutit qu'à un `console.error`, jamais surfacé.
  La lecture correspondante (`loadDailyPriorities()`,
  `demo-private.html:9116`/`kaizenology.html:8605`) utilise déjà
  `.is('mandate_id', null)` pour ce cas — le code suppose donc bien que
  `mandate_id = NULL` est une valeur légitime pour cette table.
  **Priorité de vérification la plus haute** : cette table a déjà eu un vrai
  bug GRANT trouvé et corrigé le 2026-09-10 (celui qui bloquait le bouton
  "Send email" avant le fix `_markReady`) — même table, déjà un bug réel une
  fois. À vérifier en base exactement comme `signals_feed_cache` l'a été
  (contrainte unique sur `(client_id, mandate_id)` avec `NULLS NOT DISTINCT`,
  `mandate_id` sans `NOT NULL`, pas de PK qui l'interdirait). Pas corrigé
  ici — vérification et fix schéma laissés à Thomas.

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
