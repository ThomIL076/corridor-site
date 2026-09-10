# Divergences de fonctions connues — demo-private.html ↔ kaizenology.html

Alimente `scripts/diff-functions-corridor-kaizenology.sh` : toute fonction listée ici
(par son nom, entre backticks) n'est plus signalée comme "NOUVEAU" par le script.

Chaque entrée doit avoir un statut et une raison réelle — jamais une raison inventée.
Tant qu'une divergence n'a pas de raison vérifiée, elle reste `À TRIER`, pas `DÉLIBÉRÉ`.

Statuts possibles :
- **DÉLIBÉRÉ** — divergence voulue, raison vérifiable (commentaire dans le code, arbitrage
  produit confirmé). Le script ne la re-signale jamais.
- **À PORTER (probable)** — tout indique un simple oubli/retard de portage (même
  pattern que la barre de navigation mobile, cf. commit 6e82a5d), mais pas encore confirmé
  par Thomas. Le script continue de la signaler tant qu'elle n'est pas requalifiée.
- **À TRIER** — pas encore d'investigation. Placeholder, à qualifier avant de pouvoir
  l'ignorer durablement.

---

## DÉLIBÉRÉ (raison vérifiée dans le code)

- `renderStatsRetainer` (demo-private.html uniquement) — confirmé par le commentaire
  in-file `<!-- Section G: Retainer Revenue (Corridor only) -->` (demo-private.html:2453).
  Le modèle retainer ne s'applique qu'au mandat Corridor lui-même, pas aux clients
  Kaizenology. Ne jamais porter. (2026-09-10)

- Cluster J+5 email follow-up (demo-private.html uniquement) :
  - `_isJ5Eligible`
  - `_hydrateJ5EligibilityFor`
  - `_goToJ5Followup`
  - `_loadFollowUpsDue`
  - `_renderFollowUpRows`
  - `_renderJ5LowSection`
  - `_sendCardHTML` (kaizenology a `_renderSendSection`, plus simple, sans branche email)
  - `_generateSequenceMessage`, `_startEmailSeq`, `_bulkStartEmailSeq` (présentes dans les
    deux fichiers mais avec une branche J+5/email absente côté kaizenology.html — divergence
    de comportement à l'intérieur d'une fonction de même nom, pas juste d'existence)

  Raison : divergence commerciale/positionnement délibérée, pas un oubli de portage.
  Kaizenology (mandats M&A/Transactions) suit un cycle de vente différent du SaaS Corridor
  -- pas de file de relance email automatique J+5 pour ce vertical. Corroboré par une trace
  réelle et datée : `memory/MEMORY.md` (répertoire de projet `alliance-grid-agent`, distinct
  de `corridor-site`), section "FIN DE SESSION 07/09/2026", qui indique explicitement à
  propos de `_loadRecentlySent()` : "version simplifiée (invite/j0 uniquement, sans J+5 --
  cohérent avec l'absence structurelle de file J+5 automatique côté Kaizenology, confirmée
  à plusieurs reprises ce soir)". Corroboré aussi par "BUGS DASHBOARD RÉSOLUS (demo-private.html
  uniquement, kaizenology.html gelé)" dans la même session, et par le chantier "Auto Email J+5"
  (n8n, campagne Smartlead 3915129) documenté comme construit spécifiquement pour Corridor,
  sans équivalent Kaizenology mentionné.
  Note : je n'ai pas retrouvé de fichier nommé `corridor-roadmap-post-audit-2026-09-09.md`
  (recherche complète du système de fichiers, aucun résultat) ni la citation exacte donnée
  par Thomas le 2026-09-10 -- la source citée ci-dessus est celle réellement vérifiée.
  Ne jamais porter, sauf changement de positionnement produit explicite. (2026-09-10)

## À PORTER (probable — pattern identique au mobile tab bar, pas encore confirmé)

`_updateSpineActive` (demo-private.html uniquement) — kaizenology.html n'a pas la
"journey spine" verticale (confirmé : sa `_newNavActive()` n'appelle jamais de fonction
spine). Pas encore vérifié si c'est un choix de design ou un retard de portage général
de la refonte visuelle du 06/09 (comme le mobile tab bar l'était) — à trancher avec
Thomas avant de classer en DÉLIBÉRÉ.

## À TRIER (pas encore investigué)

Presentes uniquement dans demo-private.html :
`_addCommitteeStakeholderToPipeline`, `_diagRow`, `_icpBreakdownFromColumns`,
`_isProspectStalled`, `_isoWeekNum`, `_loadLearnedPreferences`, `_parseNextActionJSON`,
`_renderNextActionHTML`, `_pdAdditionalContactsHTML`, `_pdBuildMessageHistoryHTML`,
`_pdOpenEditDetails`, `_pdRefreshMessageHistory`, `_pdToggleCompose`,
`_pdToggleLogInteraction`, `_updateQueuedCount`, `_weekLabelOf`, `_weeklyRecsHtml`

Presentes uniquement dans kaizenology.html :
`_loadFeedCache`, `_renderIntList`, `_renderSendSection`, `_saveFeedCache`,
`_senderSig`, `_showContactAction`, `_switchDTab`, `_systemRole`

---

*Dernière mise à jour : 2026-09-10, après la première exécution du script de diff
(34 divergences trouvées : 26 côté demo-private.html, 8 côté kaizenology.html) — cluster
J+5 reclassé de "À PORTER (probable)" à "DÉLIBÉRÉ" suite à correction de Thomas et
vérification de la source citée.*
