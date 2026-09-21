# Divergences de fonctions connues — demo-private.html ↔ kaizenology.html

Alimente `scripts/diff-functions-corridor-kaizenology.sh` : toute fonction listée ici
(par son nom, entre backticks) n'est plus signalée comme "NOUVEAU" par le script.

Chaque entrée doit avoir un statut et une raison réelle — jamais une raison inventée.
Tant qu'une divergence n'a pas de raison vérifiée, elle reste `À TRIER`, pas `DÉLIBÉRÉ`.

Statuts possibles :
- **DÉLIBÉRÉ** — la fonctionnalité elle-même est absente d'un fichier, par choix produit
  vérifiable (commentaire dans le code, arbitrage confirmé). Rien d'équivalent n'existe
  de l'autre côté. Le script ne la re-signale jamais.
- **ÉQUIVALENT (structure différente)** — le nom de fonction est absent d'un fichier, mais
  la fonctionnalité/donnée qu'il produit existe bien de l'autre côté, sous une forme
  différente (inline plutôt que factorisé, nom différent, logique dupliquée avec une
  branche en moins). Pas une divergence de comportement produit, une divergence de
  structure de code. Le script ne la re-signale jamais.
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

## ÉQUIVALENT (structure différente)

- `_pdAdditionalContactsHTML` (demo-private.html) — équivalent construit **inline** dans
  `_drawerProfileHTML()` côté kaizenology.html (kaizenology.html:10467-10480) : même
  contenu (liste `p.additional_contacts`, nom/titre/LinkedIn) et même bouton "Promouvoir
  en prospect & préparer l'invitation" appelant le `_promoteContact()` partagé. Pas de
  fonction séparée côté Kaizenology, juste construit en ligne dans une fonction plus
  large — pas un manque produit, une différence de structure de code. Corrige un
  classement précédent ("À PORTER (probable)") fondé sur une prémisse fausse. (2026-09-10)

- `_addCommitteeStakeholderToPipeline` (demo-private.html) — équivalent :
  `_addStakeholderToPipeline(s, company, sector, icpScore, btn)` côté kaizenology.html
  (kaizenology.html:8322 post-fix), appelée depuis `_renderCommitteeCards()` (présente
  dans les deux fichiers), même rôle ("+ Add to pipeline" sur une carte buying committee
  issue du Scanner). Nom différent côté Kaizenology — ce nom était d'ailleurs entré en
  collision avec une autre fonction du même nom (`_addStakeholderToPipeline(idx, btn)`,
  Signals feed) ; collision trouvée et corrigée le 2026-09-10, renommée
  `_addSignalStakeholderToPipeline` (kaizenology.html:8241). Vérifié par exécution réelle
  du code (Node, dépendances Supabase/IA simulées) : avant le fix, le bouton "+ Add to
  pipeline" du Signals feed exécutait le mauvais corps de fonction (échec silencieux,
  avalé par `catch(e){console.warn(...)}` — cf. CLAUDE.md, "Fiabilité — écritures upsert
  silencieuses") ; après le fix, chaque fonction reçoit les bons arguments et insère les
  bonnes données. Pas de test dans un vrai navigateur (aucun outil de ce type disponible
  ici) — exécution directe du code réel du fichier avec mocks, la meilleure vérification
  possible sans navigateur ni accès DB. (2026-09-10)

- `_sendCardHTML` / `_senderSig` / `_systemRole` (demo-private.html a `_sendCardHTML` ;
  kaizenology.html a `_renderSendSection` + `_senderSig` + `_systemRole`) — équivalents
  fonctionnels sous forme différente, tous liés à la même cause racine que le cluster J+5
  ci-dessus (Kaizenology = vertical M&A, vocabulaire/signature différents de Corridor).
  Sortis du cluster J+5 DÉLIBÉRÉ : leur nature réelle n'est pas "délibérément absent"
  (rien d'équivalent) mais "présent sous une autre forme" — distinction différente de
  celle du reste du cluster J+5 (qui, elle, décrit une fonctionnalité réellement absente).
  - `_renderSendSection` (kaizenology.html) est l'analogue de `_sendCardHTML`
    (demo-private.html) pour les cartes Send invite/j0 — même structure, sans la branche
    email (le flux email J+5 lui-même reste DÉLIBÉRÉ, cf. cluster ci-dessus ; ici on
    documente seulement l'existence d'un analogue de rendu de carte, pas la question
    email).
  - `_senderSig`/`_systemRole` (kaizenology.html uniquement) : branches
    `CLIENT_ID === 'kaizenology'` qui produisent la signature ("Stéphane Rogovsky,
    CAIA...") et le vocabulaire ("Kaizenology's outreach system") M&A. Côté
    demo-private.html, l'équivalent est un texte en dur ("Thomas", "Corridor's outreach
    system") directement dans les prompts — pas besoin d'une fonction dédiée puisque
    demo-private.html ne sert qu'un seul client (pas de branchement `CLIENT_ID` à faire).
  (2026-09-10)

## À PORTER (probable — pattern identique au mobile tab bar, pas encore confirmé)

`_loadLearnedPreferences` (demo-private.html uniquement) — affiche la carte "Learned
Preferences" (résumé IA des votes 👍/👎 sur `learned_preferences`,
`agent_name='signal_interpretation'`). Absente de Kaizenology = aucune visibilité sur ce
que le système apprend, alors que Stéphane est le validateur produit désigné. (2026-09-10,
triage Thomas)

`_icpBreakdownFromColumns` (demo-private.html uniquement) — construit le détail
"pourquoi ce score ICP" (role_fit, company_size_fit, signal_strength, recency,
mandate_fit, completeness). Sans elle, le score reste une boîte noire côté Kaizenology.
(2026-09-10, triage Thomas)

`_parseNextActionJSON` + `_renderNextActionHTML` (demo-private.html uniquement) —
parsent et affichent proprement le JSON structuré "prochaine action" généré par l'IA
(canal/action/pourquoi + linkification email). Le filtre `next_action` existe déjà côté
Kaizenology (chantier filtres) — sans ces deux fonctions, le contenu s'affiche
probablement en JSON brut non formaté. Incohérence entre "filtrable" et "lisible".
(2026-09-10, triage Thomas)

## À TRIER (pas encore investigué)

Presentes uniquement dans demo-private.html :
`_diagRow`, `_isProspectStalled`, `_isoWeekNum`,
`_pdBuildMessageHistoryHTML`, `_pdOpenEditDetails`, `_pdRefreshMessageHistory`,
`_pdToggleCompose`, `_pdToggleLogInteraction`, `_updateQueuedCount`, `_updateSpineActive`,
`_weekLabelOf`, `_weeklyRecsHtml`

Note (2026-09-10) sur `_updateSpineActive` : l'absence côté kaizenology.html est
**confirmée intentionnelle, mais sans raison produit connue**. Preuve trouvée ce soir --
kaizenology.html:3467-3468 porte un commentaire d'une session antérieure : "heroAwaiting/
heroRun/heroActions (agent-hero-*, spine-count-send/reply) : elements absents du HTML
kaizenology.html (verifie avant ce port)". Ça confirme que l'absence de la "journey
spine" (`#journey-spine`, `.spine-stage`, `spine-count-*`) a déjà été vérifiée et
respectée délibérément lors d'un port antérieur (aucun élément orphelin créé) -- ce
n'est donc pas un oubli qui se serait glissé après coup. Mais **pourquoi** la journey
spine elle-même n'a jamais été construite pour Kaizenology au départ reste inconnu : ni
Thomas ne s'en souvient, ni aucune source (code, memory/MEMORY.md d'alliance-grid-agent)
ne documente une raison produit. Volontairement classée `À TRIER` plutôt que
`À PORTER (probable)` (ce serait trompeur : rien n'indique que c'est un simple oubli de
portage) ni `DÉLIBÉRÉ` (aucune raison produit vérifiée, seulement une absence
vérifiée) -- catégorie intermédiaire de fait : absence confirmée volontaire à un moment
donné, motif produit non retrouvé.

Presentes uniquement dans kaizenology.html :
`_addSignalStakeholderToPipeline` (nouvelle, cf. entrée `_addCommitteeStakeholderToPipeline`
dans ÉQUIVALENT ci-dessus pour le détail de la collision corrigée),
`_loadFeedCache`, `_saveFeedCache`, `_renderIntList`, `_showContactAction`, `_switchDTab`

`_loadFeedCache`/`_saveFeedCache` (ci-dessus) : trois bugs réels trouvés et corrigés côté
base par Thomas le 2026-09-10 sur la table qu'elles utilisent (`signals_feed_cache`) —
voir CLAUDE.md, section "Fiabilité — écritures upsert silencieuses". Le statut de
divergence de fonction (existence) reste À TRIER ; c'est un bug de fiabilité distinct,
pas une raison de porter ou pas ces fonctions.

## Passe d'harmonisation scan_entries v1 (2026-09-21) — divergences restantes, NON TRIÉES une à une

Passe locale (rien commité, rien déployé) qui aligne sur `wominds.html` (référence) les
fonctions partagées du chantier scan_entries v1 entre les trois dashboards. Ce script ne
compare que les **noms** de fonctions, pas leurs corps : 67 noms non triés avant la passe,
49 après. La passe a aligné `kaizenology.html` sur les noms/corps communs : `_mscEntryToDecision`,
`_mscEntriesToDecisions`, `_mscDedupeDecisions`, `_mscPersonKey`, `_mscIcpStateChipHTML`,
`_mscParagraphHTML`, `_mscResolveSource`, `_mscFetchLiveProspects` (et `_cacheProspectRow`,
`_MSC_LIVE_COLS`) existent maintenant dans les deux pages. Doublures supprimées côté
kaizenology.html : `_mscEntryToCardData` (= `_mscEntryToDecision`), `_mscSourceLink`
(= `_mscResolveSource`), `_mscLoadLiveById` (= `_mscFetchLiveProspects`), `_mscLinkifyHTML`
(= `_mscParagraphHTML`), `_mscExtractRows` (= option `rich` de `_mscParseEmailSections`),
`_mscEntryKey` (= `_mscPersonKey`), `_mscSortByRank` et `_mscRankOf` (= tri de
`_mscEntriesToDecisions`), `_mscNum` et `_mscStr` (plus utilisées).

Les 49 noms restants sont consignés ci-dessous **regroupés par famille, sans être triés un à
un** (décision de Thomas : pas nécessaire ce soir). Statut de l'ensemble : `À TRIER`. Les
familles sont indicatives (nom et rôle lus dans le code le 2026-09-21) ; aucune raison
produit n'a été recherchée hors du chantier scan_entries.

### Famille « rendu propre à la page » (chantier scan_entries v1, lu dans le code le 2026-09-21)

- demo-private.html uniquement : `_mscRenderScanEntries`, `_mscSectionKeyForHeading`,
  `_mscV1SectionLabel`, `_mscFmtDate` (panneau Corridor : sections stream1, pipeline_growth,
  stakeholder… ; date du signal).
- kaizenology.html uniquement : `_mscScanEntriesPanelHTML`, `_mscRenderScanEntriesPanel`
  (panneau par mandat), `_mscFilterSectionItems`, `_mscMandateKeyFromHeading`,
  `_mscMentionCardsHTML`, `_mscMentionKey`, `_mscMentionNames`, `_mscParagraphCitesNames`,
  `_mscParagraphsWithoutMentions` (retrait de la prose déjà rendue en carte et cartes
  market_mention ; l'heuristique de retrait est validée au premier scan réel, non modifiée).
  demo-private.html a une logique voisine mais différente (`_mscRenderScanEntries`, en ligne
  dans `_mscMentionsForSection`) — non factorisée, non tranchée.

### Famille « chantier sans lien avec scan_entries » (non investiguée)

- demo-private.html uniquement : intégrations `_intClosePanel`, `_intOpenPanel`,
  `_intRenderGrid`, `_intStatus`, `_pdrvCopyKey`, `_pdrvOnKeyInput`, `_pdrvRenderStageMapping`,
  `_pdrvRevealKey`, `_pdrvSaveMapping`, `_pdrvTestConnection`, `_sfCollectCreds`, `_sfCopyField`,
  `_sfOnFieldInput`, `_sfRenderStageMapping`, `_sfRevealField`, `_sfSaveMapping`,
  `_sfTestConnection`, `_slkCopyField`, `_slkNotify`, `_slkOnFieldInput`, `_slkRevealField`,
  `_slkSaveConfig` ; rappels `_reminderClose`, `_reminderSnooze`, `_removeReminderBacklogRow`,
  `_renderReminderBacklogRows`, `_toggleReminderBacklog` ; statut système
  `_loadSystemActiveStatus`, `_renderSystemActiveLabel` ; signaux et actions
  `_actionButtonLabel`, `_effectiveSignalStrength`, `_loadDeprioritizedTypes`,
  `_qualificationNote`.
- kaizenology.html uniquement : `_drawerBuyingCommitteeHTML`, `_handleDeepLinkAction`,
  `_openScannerPrefilled`.

### Fonctions partagées scan_entries dont le CORPS reste différent (invisible pour ce script)

Identiques aux trois pages (comparaison des corps, commentaires ignorés) : `_mscSafeUrl`,
`_mscSafeId`, `_mscValidScanEntries`, `_mscEntryToDecision`, `_mscEntriesToDecisions`,
`_mscIcpState`, `_mscIcpStateChipHTML`, `_mscResolveSource`, `_mscExtractLinks`,
`_mscParseEmailSections`, `_cacheProspectRow`, `_mscFetchLiveProspects` ; identiques avec
demo-private.html seulement (wominds.html n'en a pas) : `_mscPersonKey`, `_mscDedupeDecisions`.
Différences restantes, toutes de page :
- `_mscParagraphHTML`, `_mscNarrativeBlockHTML`, `_mscSectionLabel`, `_mscConfidenceBadge` : jeton
  de style propre à la page (`--fill-accent` / `--accent`, `--dim` / `--text-secondary`).
- `_mscDecisionCardHTML` : jetons de style ; force et date du signal côté Corridor, date brute
  seule côté Kaizenology ; règle du résumé identique à demo-private.html (masqué si FAITS ou ACTION).
- `_mscDecisionCardHTML` : le mandat masqué sous un groupe de mandat se fait en passant
  `mandate: null` (plus de 3e paramètre `opts`).
- Constantes propres au client : `_MSC_ENTRY_SECTION_TO_CATEGORY`, `_MSC_V1_SECTIONS`,
  `_MSC_V1_DEDUPE_PRIORITY`.
- Comportements kaizenology.html modifiés par l'alignement (voulu, wominds.html = référence) :
  chaîne JSON de `scan_entries` non acceptée, URL contenant un guillemet refusée, confiance
  inconnue = badge « Spéculatif » (avant : aucun badge), libellés EN d'état ICP sans espace
  avant les deux-points.

*Passe du 2026-09-21. Commandes de contrôle : `node scratchpad/dk_test_scan_entries.js`,
`node scratchpad/dc_run_node.js`, `node scratchpad/dc_mutation.js`.*

---

*Dernière mise à jour : 2026-09-10. Historique complet des reclassements successifs
(cluster J+5 À PORTER→DÉLIBÉRÉ, 4 fonctions À TRIER→À PORTER, `_updateSpineActive`
À PORTER→À TRIER, création de la catégorie ÉQUIVALENT et migration de
`_pdAdditionalContactsHTML`/`_addCommitteeStakeholderToPipeline`/`_sendCardHTML`/
`_senderSig`/`_systemRole`) consultable via `git log -p -- scripts/known-divergences.md`.
État courant : 34 divergences de noms trouvées par le script (26 côté demo-private.html,
9 côté kaizenology.html, ce dernier chiffre ayant augmenté de 1 avec l'introduction de
`_addSignalStakeholderToPipeline` lors du fix de collision) — 4 catégories, aucune
non triée.*
