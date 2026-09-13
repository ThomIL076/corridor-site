# Divergences de fonctions connues — demo-private.html ↔ wominds.html

Alimente `scripts/diff-functions-corridor-wominds.sh` : toute fonction listée ici
(par son nom, entre backticks) n'est plus signalée comme "NOUVEAU" par le script.

Document distinct de `known-divergences.md` (comparaison demo-private.html ↔
kaizenology.html) — comparaison volontairement séparée, cf. brief d'audit
2026-09-13, pour ne pas laisser une raison valable pour Kaizenology masquer une
divergence réelle côté Wominds (les deux clients n'ont pas le même historique de
portage, ni le même produit shippé à date).

Même taxonomie de statuts que `known-divergences.md` :

- **DÉLIBÉRÉ** — la fonctionnalité elle-même est absente d'un fichier, par choix
  produit vérifiable (commentaire dans le code, arbitrage confirmé). Rien
  d'équivalent n'existe de l'autre côté.
- **ÉQUIVALENT (structure différente)** — le nom de fonction est absent d'un
  fichier, mais la fonctionnalité/donnée qu'il produit existe bien de l'autre
  côté, sous une forme différente.
- **À PORTER (probable)** — tout indique un simple oubli/retard de portage, pas
  encore confirmé par Thomas.
- **PORTÉ** — divergence confirmée puis effectivement corrigée : la
  fonctionnalité/le rendu manquant a été construit côté wominds.html, vérifié
  par lecture directe du code après coup (pas seulement le rapport de la
  passe qui l'a construit).
- **À TRIER** — pas encore d'investigation.

---

## Méthodologie de cette passe

1. `scripts/diff-functions-corridor-wominds.sh` (nouveau script, adapté de
   `diff-functions-corridor-kaizenology.sh` — même extraction, `FILE_B` pointé
   sur `wominds.html`, `KNOWN` pointé sur ce fichier) : **391 fonctions
   top-level côté demo-private.html, 209 côté wominds.html, 240 divergences de
   nom brutes** (211 présentes uniquement dans demo-private.html, 29
   uniquement dans wominds.html) au 2026-09-13.
2. Investigation approfondie, avec preuve réelle citée (ligne de code,
   commentaire, comportement observé), des 8 divergences remontées par
   capture d'écran (fiche Audrey Hatton / Daniel Lev) + la question navigation
   "Approvals" — demandées en priorité par le brief d'audit.
3. Le reste des 240 divergences de nom n'a pas été investigué item par item
   dans cette passe (hors périmètre du temps disponible) — listé en `À TRIER`
   en fin de document, comme le fait déjà `known-divergences.md` pour son
   propre reliquat non trié.

---

## DÉLIBÉRÉ (raison vérifiée dans le code)

- **"Generate message" absent de la barre d'actions du tiroir prospect**
  (wominds.html) — pas de fonction équivalente à porter, ce n'est pas un nom
  de fonction manquant mais un bouton absent par construction : le flux email
  J+5/séquences (`_generateSequenceMessage`, `_startEmailSeq`,
  `_bulkStartEmailSeq`, présentes uniquement côté demo-private.html) suppose
  des comptes d'envoi actifs (HeyReach/Smartlead) qui n'existent pas encore
  pour Wominds. Confirmé par le bandeau explicite déjà en place dans l'onglet
  Envoyer de wominds.html ("File d'envoi du jour... bouton d'envoi réel
  désactivé tant que les comptes HeyReach/Smartlead Wominds n'existent pas",
  cf. commentaire de code au-dessus de `<div class="tab-panel" id="tab-send">`)
  — arbitrage produit explicite de Thomas (2026-09-12), pas un oubli. Ne pas
  porter tant que ces comptes n'existent pas.

## ÉQUIVALENT (structure différente / nom différent)

- **Item screenshot — Next Action structuré (Channel/Why Now/Why This
  Person/Why This Action/What Not To Say)** : `_parseNextActionJSON` et
  `_renderNextActionHTML` existent **sous les mêmes noms** dans les deux
  fichiers (wominds.html:3955 et :3978 ; demo-private.html:9361 et :9386) —
  n'apparaissent dans aucune des deux listes de divergence du script, donc
  déjà porté à l'identique. Le "placeholder non généré" vu sur la capture
  Audrey Hatton est l'état attendu et **identique côté demo-private.html** :
  `_pdNextActionHTML` (wominds.html:4006-4021) affiche
  `cachedRendered || 'Cliquez pour générer la prochaine étape...'`, exactement
  le même pattern que demo-private.html:8709
  (`${_cachedRendered || 'Click to generate the next step...'}`) — dans les
  deux fichiers, rien n'est pré-généré automatiquement à l'ouverture du
  tiroir, il faut cliquer "▶ Prochaine action recommandée" /
  "▶ Next recommended action". Pas une divergence : Audrey Hatton n'avait
  simplement pas encore eu ce clic. (2026-09-13)

- **Item screenshot — Buying Committee, liens cliquables** :
  `_renderBuyingCommittee` (wominds.html:3646-3667) rend bien un `<a
  href="${r.linkedin}" target="_blank">` par stakeholder identifié quand un
  profil LinkedIn est connu, exactement le même principe que
  `_renderCommitteeCards` côté demo-private.html. Déjà porté (build du
  2026-09-13 matin, item 2 du brief "Points restants wominds.html"). Pas une
  divergence actuelle — possible que la capture d'écran de Thomas date d'avant
  ce build. (2026-09-13)

- **Item screenshot — Signal Timeline avec icône typée** :
  `_pdSignalTimelineHTML` (wominds.html:3529-3536) affiche `_sigBadge(p.signal_type)`
  (icône + libellé depuis `signal_taxonomy`) au-dessus du texte du signal,
  pas juste le texte brut. Même build du 2026-09-13 matin que ci-dessus — déjà
  porté, probablement pas encore vu par Thomas au moment de la capture.
  (2026-09-13)

- **Item screenshot — Onglet "Approvals" (priorité de l'audit, autonomie
  "approve")** : **présent et câblé**, sous son nom français
  "Actions en attente" — `data-nav="pending-actions"` dans la sidebar
  (wominds.html:1327-1329, avec badge de comptage `#pending-actions-count`),
  panneau `#tab-pending-actions` (wominds.html:1712-1718), entrée dans le
  menu mobile "Plus" (wominds.html:1866-1869), dispatch
  `if (name === 'pending-actions') loadPendingActionsView();`
  (wominds.html:2140). Rien n'est absent du menu — la recherche littérale du
  mot anglais "Approvals" dans un fichier entièrement francisé explique
  probablement le signalement initial. Fonctionnellement équivalent à
  l'onglet "Approvals" de demo-private.html/kaizenology.html (même
  mécanisme d'autonomie "approve", nom localisé). (2026-09-13)

- **`_pdOpenEditDetails`** (demo-private.html uniquement, fonction JS qui
  bascule l'affichage de la section édition) — équivalent structurel :
  wominds.html utilise un `<details><summary>Modifier / Valeur du
  deal</summary>` natif HTML (`_pdEditSectionHTML`, wominds.html:4319) pour le
  même comportement d'ouverture/fermeture, sans fonction JS dédiée (le
  navigateur gère nativement le toggle). Pas un manque produit, une
  différence de structure de code. (2026-09-13)

## PORTÉ (2026-09-13, brief "Portage parité wominds.html")

- **Item screenshot — AI Insight + Score Rationale, deux blocs distincts** —
  **PORTÉ.** `_pdAiInsightBoxesHTML` (wominds.html:3629-3633) construit les
  deux boîtes séparément, même structure inline que demo-private.html
  (aucune classe CSS dédiée non plus côté référence — vérifié, rien à
  nommer), mêmes tokens `--accent-bg`/`--accent-border` (ajoutés au point 1
  de ce brief), même libellé "✦ Analyse IA" (`p.signal_interpretation`) et
  "✦ Justification du score" (`p.icp_reason`). Insérées dans
  `openProspectDetail` juste après `_pdSignalTimelineHTML`. La ligne
  générique "Raison ICP" a été retirée du tableau `rows`, et le texte non
  étiqueté de `signal_interpretation` a été retiré de
  `_pdSignalTimelineHTML` — vérifié par lecture directe (0 occurrence de
  `'Raison ICP'` restante dans le fichier). Correction au passage : la
  référence positionne ces boîtes dans la section Signal/Contexte de
  l'édition, pas dans le corps toujours visible — choix délibéré de les
  garder toujours visibles côté wominds.html (c'est justement ce qui les
  rend enfin lisibles sans ouvrir un accordéon, l'objet même de ce fix).

  **Vérification post-déploiement (2026-09-13, sur signalement Thomas
  "toujours fusionnées") :** Audrey Hatton, testée en réel, n'affichait
  qu'une seule boîte ("Justification du score"). Cause recherchée avant de
  toucher au code : requête directe sur la ligne réelle en base —
  `signal_interpretation` vaut `''` (chaîne vide) pour cette fiche
  précise, `icp_reason` est renseigné. Reproduit avec le code réel exécuté
  en Node (extraction + exécution de `_pdAiInsightBoxesHTML` telle
  qu'écrite dans le commit `740eca0`, pas une supposition) : avec
  `signal_interpretation` vide, la fonction ne produit bien qu'un seul
  bloc "accent-bg" — comportement identique à demo-private.html, qui a
  exactement la même condition (`p.signal_interpretation ? ... : ''`) et
  afficherait donc rien du tout pour "AI Insight" avec la même donnée. Testé
  aussi avec une fiche ayant `signal_interpretation` renseignée (Vincent
  Beaudon, donnée réelle) : les deux boîtes "✦ Analyse IA" et
  "✦ Justification du score" s'affichent bien séparément, dans cet ordre.
  **Conclusion : le split n'a jamais cessé de fonctionner — la fiche
  choisie pour le test n'a simplement pas cette donnée en base.** 155 des
  242 prospects Wominds ont `signal_interpretation` renseignée (64%) ; pour
  vérifier visuellement les deux boîtes, ouvrir un prospect avec un signal
  `keyword-match` ou `fundraising` plutôt qu'un signal `activity` générique
  comme celui d'Audrey Hatton. Aucun changement de code nécessaire pour ce
  point. Statut inchangé : `PORTÉ`.

- **Item screenshot — Section Edit Details : Find email / Find phone /
  Enrich Company / toggle Known contact ↔ New prospect** — **PORTÉ.**
  `_findEmailDrawer`, `_findPhoneDrawer` (wominds.html:4598/4661, flux
  d'enrichissement réel avec `/api/enrich`, polling jusqu'à 180s, garde
  anti-tiroir-changé), `_enrichCompanyDrawer` (wominds.html:4723, via
  `/api/company-enrich`), `_setOrigin` (wominds.html:4577, bascule
  `p.origin` réseau/outbound) — tous scopés `client_id='wominds'`
  (`.eq('client_id', CLIENT_ID)` sur chaque écriture `prospects`), tous
  resynchronisés via `_patchProspectCaches`, tous avec erreur visible
  (toast) en cas d'échec, jamais de catch purement silencieux. Vérifié que
  `/api/enrich` et `/api/company-enrich` sont des proxys génériques sans
  paramètre `client_id` côté serveur (lecture directe des deux fichiers) —
  aucune configuration Wominds-spécifique nécessaire côté infra
  d'enrichissement, contrairement à ce que cette entrée supposait avant
  portage. Les 4 boutons sont câblés dans `_pdEditSectionHTML`
  (`find-email-*`, `find-phone-*`, `co-enrich-*`, `origin-network-*`/
  `origin-outbound-*`), libellés en français ("Trouver l'email", "Trouver
  le tél.", "Enrichir la société", "Contact connu"/"Nouveau prospect").

- **Item screenshot — Barre d'actions persistante en bas du tiroir** —
  **PORTÉ pour "Archive".** `#pd-footer` (wominds.html:1996) est maintenant
  un troisième enfant direct de `#drawer`, frère de `#prospect-detail-body`
  (pas un descendant) — même position dans l'arbre que `.pd-footer` côté
  demo-private.html, donc toujours visible sous le contenu qui défile.
  "Archiver ce prospect" y est déplacé et affiché dès l'ouverture du tiroir
  (`openProspectDetail`), retiré de sa position précédente à l'intérieur du
  `<details>` "Modifier". "Enregistrer les modifications" reste dans le
  formulaire d'édition (n'a de sens qu'après l'avoir ouvert et modifié —
  choix délibéré de ce portage, pas un oubli). "Generate message" reste
  `DÉLIBÉRÉ` absent (aucun changement, cf. ci-dessus). "Move stage" reste
  `ÉQUIVALENT (structure différente)` via le glisser-déposer du kanban,
  inchangé par ce portage.

- **Item post-déploiement — Signal n'affiche pas le nom de la personne
  ("A interagi avec votre profil")** — **PORTÉ.** Recherché d'abord côté
  référence : ni demo-private.html ni kaizenology.html n'ont de mécanisme
  de résolution "URL mot-clé → nom" (grep `mot-cl[eé]` : une seule
  occurrence dans chaque fichier, un commentaire sur le filtre anti-bruit,
  rien d'autre) — ce n'est donc pas un port d'un mécanisme existant, c'est
  un fix Wominds-spécifique, documenté comme tel. Vérifié en base : les 242
  prospects Wominds n'ont qu'**une seule** valeur distincte de signal
  contenant "mot-cle" — `"A interagi avec votre profil (mot-cle:
  https://www.linkedin.com/in/elodiedratler)"` — toujours la même URL,
  celle du compte Wominds lui-même (`clients.contact_name` =
  "Élodie Dratler" pour `client_id='wominds'`, vérifié en base). Fix : dans
  `_sanitizeSignal` (wominds.html, fonction partagée par tous les
  affichages de signal, pas seulement le tiroir), remplacement de la
  locution "votre profil" par "le profil d'Élodie Dratler" (ou le
  `contact_name` réel de n'importe quel client, jamais deviné depuis
  l'URL elle-même — repli honnête sur "votre profil" si `contact_name`
  est absent). Testé en exécutant le code réel (Node) sur la valeur
  exacte trouvée en base : `_sanitizeSignal("A interagi avec votre profil
  (mot-cle: https://www.linkedin.com/in/elodiedratler)")` →
  `"A interagi avec le profil d'Élodie Dratler"`. **Non couvert par ce
  fix** (même cause, pas encore touché, signalé pour info) : 3 autres
  endroits affichent `p.signal` sans passer par `_sanitizeSignal`
  (feed Briefing du matin/Scanner nouveaux prospects, ~wominds.html:2803
  et :2877 ; un prompt IA de génération de message, ~wominds.html:5268) —
  un prospect avec ce même signal "votre profil" y montrerait encore le
  texte générique. À corriger si Thomas le juge utile, hors périmètre
  explicite de ce brief (qui ne mentionnait que "la boîte Signal").

## Correction méthodologique (2026-09-13, découverte pendant le portage)

L'audit initial comptait **34 classes `.pd-*` côté demo-private.html** et
**16 côté wominds.html** en se basant sur une regex qui confondait les
attributs `id="pd-..."` et `class="pd-..."`. Vérification directe pendant le
portage : **4 des 34 "classes" de demo-private.html sont en réalité des
`id`** (`pd-editdetails`, `pd-logint-form`, `pd-msghistory-rows`,
`pd-section-nextaction` — aucune règle CSS n'existe pour ces noms nulle
part) — donc **33 vraies classes**, et **les 12 "classes propres à
wominds.html" sont, elles aussi, toutes des `id`** (vérifié une par une :
0 occurrence `class="..."`, 1 occurrence `id="..."` chacune, toutes
référencées par du `getElementById` réel — aucune n'était morte). Chiffres
corrects : 33 vraies classes `.pd-*` côté demo-private.html, 4 déjà
partagées (`pd-close`, `pd-empty`, `pd-link`, `pd-links` — 2 d'entre elles,
`pd-link`/`pd-empty`, avaient une définition légèrement divergente, corrigée
pour matcher la référence exactement), **29 réellement absentes → toutes les
29 copiées** dans wominds.html (2026-09-13). Le doc design
(`corridor-design-system-wominds-2026-09-13.md`) est mis à jour avec ces
chiffres corrigés.

## À TRIER (pas encore investigué)

Les 8 items priorisés par le brief d'audit 2026-09-13 (ci-dessus) ont été
entièrement qualifiés. Le reste des 240 divergences de nom brutes remontées
par `scripts/diff-functions-corridor-wominds.sh` n'a pas été investigué
individuellement dans cette passe — pur constat d'existence/absence de nom,
aucune preuve de raison produit recherchée. Prochaine étape naturelle :
même traitement item par item que ci-dessus, en particulier pour les
fonctions déjà connues comme fonctionnellement significatives ailleurs dans
le produit (ex. `_escalateProspect`, `_loadLearnedPreferences`,
`_icpBreakdownFromColumns` — cette dernière est en fait déjà portée côté
wominds.html sous le même nom, donc absente à tort de cette liste brute par
construction du script, qui ne liste que les *divergences*).

Présentes uniquement dans demo-private.html (211, liste brute du script,
2026-09-13) :

`_activateAgent`, `_addScannerToPipeline`, `_agentKeyFromName`,
`_aiScoreProspect`, `_applyCredentialMask`, `_applyCrmFilters`,
`_applyMandateFilter`, `_askBuildSuggestedPills`, `_askEngagedDealsCount`,
`_askFillPrompt`, `_askRenderSuggestedPills`, `_autoGenerateCsSteps`,
`_buildAskSystemPrompt`, `_buildCrmCard`, `_buildProspectLinks`,
`_bulkArchive`, `_bulkChangeStage`, `_bulkClear`, `_bulkStartEmailSeq`,
`_calcCompleteness`, `_calcComposite`, `_calcConfidence`, `_calcICP`,
`_calcRecency`, `_checkEmailSeqState`, `_cleanVariantText`, `_clearKanban`,
`_closingProb`, `_companyLine`, `_copyPostCall`, `_crmHighlightChips`,
`_crmSaveStep`, `_crmSetChip`, `_crmShowStepForm`, `_dataReliabilityLabel`,
`_deriveCountry`, `_drawerClientId`, `_drawerProfileHTML`,
`_enrichCompanyDrawer` (qualifiée ci-dessus), `_escalateProspect`,
`_extractSigUrl`, `_fetchAndRunDebrief`, `_fetchPipelineInsights`,
`_findEmailDrawer` (qualifiée ci-dessus), `_findPhoneDrawer` (qualifiée
ci-dessus), `_findSignalDecisionMaker`, `_formatPipelineInsights`,
`_generateFromManualNotes`, `_generatePostCallMsg`,
`_generateSignalInterpretation`, `_goToJ5Followup`, `_hsCopyKey`,
`_hsOnKeyInput`, `_hsRenderStageMapping`, `_hsRestoreMapping`,
`_hsRevealKey`, `_hsSaveMapping`, `_hsTestConnection`,
`_humanConnectionPoint`, `_hydrateJ5EligibilityFor`, `_inboxSend`,
`_inboxShowRaw`, `_inferRegion`, `_initAgentPanelHeaders`,
`_initHpFilters`, `_initKanbanFilterOptions`, `_intClosePanel`,
`_intOpenPanel`, `_intRenderGrid`, `_interpretSignal`,
`_isPipelinePerfQuestion`, `_isProspectStalled`, `_j5BadgeClick`,
`_kanbanCols`, `_langLine`, `_loadAgentsAtWork`, `_loadCrmEmptyStats`,
`_loadDealOptions`, `_loadFollowUpsDue`, `_loadLearnedPreferences`,
`_loadMandateOptions`, `_loadStageConversion`, `_mandateContext`,
`_mapStakeholders`, `_markPostCallSent`, `_mockMomentum`, `_newNavActive`,
`_onCardSelect`, `_onDealChange`, `_onMandateChange`, `_openAskFromMandate`,
`_openDrawerFromPriority`, `_openPipelineStage`, `_openPostCallDebrief`,
`_openProspectFromCrm`, `_ownerInboxEmail`, `_pHash`, `_parseDebrief`,
`_pdAdditionalContactsHTML`, `_pdCopyBrief`, `_pdOpenEditDetails` (qualifiée
ci-dessus), `_pdRefreshMessageHistory`, `_pdToggleCompose`,
`_pdToggleLogInteraction`, `_pdrvCopyKey`, `_pdrvOnKeyInput`,
`_pdrvRenderStageMapping`, `_pdrvRevealKey`, `_pdrvSaveMapping`,
`_pdrvTestConnection`, `_prOpenProspect`, `_prioritiesNext`,
`_prioritiesSkip`, `_priorityGenerate`, `_priorityScore`,
`_promoteContact`, `_proposalUseVariant`, `_regionTag`,
`_removeProposalCard`, `_renderAgentsStatus`, `_renderCrmDrawerContent`,
`_renderFollowUpRows`, `_renderInboxCards`, `_renderJ5LowSection`,
`_renderPriorityCards`, `_renderSignalLearningSummary`, `_renderSignalLink`,
`_replyIntel`, `_resetCrmFilters`, `_resetZoom`, `_resolveMandate`,
`_resolveViaEnrichment`, `_runFreeSearch`, `_runPipelineReview`,
`_runPostCallWorkflow`, `_saveEmail`, `_savePhone`, `_scannerSetMode`,
`_scheduleCall`, `_scoreReliabilityBadge`, `_selectMeetingNote`,
`_sendDiscoveryBrief`, `_sendPostCallLinkedIn`, `_sendViaLinkedIn`,
`_senderBio`, `_senderName`, `_setDrawerTouch`, `_setManualTouch`,
`_setOrigin` (qualifiée ci-dessus), `_setProposalsBadge`, `_sfCollectCreds`,
`_sfCopyField`, `_sfOnFieldInput`, `_sfRenderStageMapping`,
`_sfRevealField`, `_sfSaveMapping`, `_sfTestConnection`, `_showAgentsMap`,
`_showMeetingNotesPicker`, `_sigIcon`, `_sigLabel`, `_sortEMEAFirst`,
`_stageKey`, `_startEmailSeq`, `_staticFollowUp`, `_switchNewNav`,
`_switchSysTab`, `_syncNavHeight`, `_toggleDebrief`, `_toggleManualDebrief`,
`_toggleReplyIntel`, `_toggleSendCard`, `_updateBulkBar`,
`_updateIntelRowLayout`, `_updateKpiCards`, `_updateMobileTabActive`,
`_updatePrioritiesNextBtn`, `_updateQueuedCount`, `_viewInPipeline`,
`addKanbanLegends`, `addProspect`, `applyDealBadges`, `applyLang`,
`applyMomentum`, `buildCard`, `callAI`, `cleanAIOutput`, `clearAgent`,
`closeAddMandate`, `closeCallPrep`, `closeDrawer`, `copyCallPrep`,
`deleteProspect`, `getMomentumClass`, `getMomentumScore`, `handleEnter`,
`identityKey`, `loadClientsKanban`, `loadDailyPriorities`, `openAddMandate`,
`openCrmDrawer`, `openDrawer`, `renderStats`, `renderStatsRetainer`,
`renderWelcome`, `saveMandateForm`, `sendAgent`, `setLang`,
`showKanbanError`, `switchAgent`, `updateKanbanCounts`

Présentes uniquement dans wominds.html (29, liste brute du script,
2026-09-13) :

`_clientCardHTML`, `_closeIntDetail`, `_distRowHTML`, `_frAuthError`,
`_isIntlCountry`, `_loadDrawerInteractions`, `_mandateContextForPrompts`,
`_openIntDetail`, `_pdBuyingCommitteeHTML` (qualifiée ci-dessus),
`_pdEditSectionHTML` (qualifiée ci-dessus), `_pdInteractionsHTML`,
`_pdMessageHistoryHTML`, `_pdNextActionHTML` (qualifiée ci-dessus),
`_pdSignalTimelineHTML` (qualifiée ci-dessus), `_populateKanbanFilterOptions`,
`_prospectCardHTML`, `_renderDrawerInteractions`, `_renderInboxCard`,
`_scannerAddToPipeline`, `_statsActiveProspects`, `_todayCardHTML`,
`closeProspectDetail`, `loadClientsView`, `loadPipelineHealth`,
`loadTodayRun`, `openProspectDetail`, `renderStatsCountry`,
`renderStatsSector`, `saveProspectForm`

---

*Créé le 2026-09-13 (brief d'audit "parité fiche prospect + navigation"),
mis à jour le 2026-09-13 (brief "Portage parité wominds.html"). 8
divergences priorisées par capture d'écran : 5 ÉQUIVALENT (dont 1
partielle pour la barre d'actions), 3 PORTÉ (AI Insight/Score Rationale,
Edit Details/enrichissement, Archive persistant), 1 DÉLIBÉRÉ (Generate
message, jamais construit, confirmé). Plus 29 classes `.pd-*` portées
(section "Correction méthodologique"). 240 divergences de nom brutes au
total, 232 encore À TRIER (non prioritaires pour cette passe). Script :
`scripts/diff-functions-corridor-wominds.sh`.*

---

# Audit Scanner — diagnostic P0 + architecture P1 (2026-09-13)

Passe diagnostic/audit initiale, code modifié dans une passe de correction
séparée le même jour (voir bandeaux "CORRIGÉ" sous Item 0 et P0
ci-dessous) — un seul commit groupé pour les deux fixes.

## Item 0 — Racine de la "Fiche contact" à l'ancien design (traité en premier)

> **CORRIGÉ (2026-09-13, même jour, commit groupé avec le fix P0).**
> `openProspectDetail` (wominds.html:3846) reconstruit désormais un bloc
> `.pd-header`/`.pd-stats`/`.pd-stat` (Score ICP / Étape / Créé le) suivi de
> `.pd-row`/`.pd-row-mono`/`.pd-row-main` pour les champs restants
> (Email/Téléphone/LinkedIn/Site web/Secteur/Effectifs/Zone/Stade de
> financement/Date de la levée/Montant levé/Critères remplis/Notes) —
> mêmes classes que le tiroir principal, consommées pour la première fois
> depuis leur ajout ce matin. **Nom/Entreprise/Poste retirés de cette
> liste** : déjà affichés dans `.drawer-head` (`#pd-drawer-name`/
> `#pd-drawer-company`), les garder aussi ici les aurait dupliqués — et
> demo-private.html ne les répète pas non plus dans ses `.pd-row` (qui n'y
> servent qu'à la timeline signal/messages, jamais aux champs de contact
> eux-mêmes — nuance découverte en écrivant le fix, `.pd-row` n'a pas
> d'équivalent direct pour une liste de champs statiques côté référence,
> réutilisé ici pour le vocabulaire visuel plutôt que pour un usage
> identique). Vérifié en exécutant le rendu réel (Node, données réelles
> d'Audrey Hatton lues en base) : le nouveau bloc produit bien
> `<div class="pd-header">...<div class="pd-stats">` avec 3 tuiles
> (Score ICP 6/10, Étape Identifiés, Créé le 12 sept. 2026) puis 6
> `.pd-row` réels (Email/LinkedIn/Site web/Effectifs/Zone/Critères
> remplis — les 6 champs vides comme Téléphone/Secteur/Notes sont bien
> exclus, pas affichés vides). **Vérification visuelle dans un vrai
> navigateur non faite depuis ce siège (aucun outil de ce type
> disponible) — à confirmer par Thomas.**

**Ni (a) ni (b) exactement : un seul et même composant, aucun paramètre de
mode différent — mais une portion précise de son rendu n'a jamais été
migrée vers les classes `.pd-*` ajoutées ce matin, alors que le reste du
même rendu (juste en dessous) l'a été.**

**Preuve, pas une supposition :**

- La liste plate NOM/ENTREPRISE/POSTE/EMAIL/... vue sur la capture n'est
  produite qu'à un seul endroit dans tout le fichier — `openProspectDetail`
  (wominds.html:3846), tableau `rows` (lignes 3853-3872), rendu ligne 3880 :
  ```
  rows.map(([label, val]) => `<div style="margin-bottom:10px;">
    <div style="font-size:var(--fs-xs);font-weight:600;color:var(--muted);
      text-transform:uppercase;letter-spacing:.04em;">${_esc(label)}</div>
    <div style="font-size:var(--fs-sm);color:var(--text);white-space:pre-wrap;">
      ${_esc(val)}</div></div>`).join('')
  ```
  Aucune classe `.pd-*` — uniquement des styles en ligne. C'est le
  `text-transform:uppercase` en ligne qui fait apparaître "NOM"/"ENTREPRISE"
  en majuscules sur la capture (le code source est en minuscules,
  "Nom"/"Entreprise" — l'affichage visuel seul les met en capitales).
- **C'est le même `openProspectDetail` qui, à la ligne suivante (3881-3889),
  enchaîne** `_renderBreakdownPanel`, `_pdSignalTimelineHTML`,
  **`_pdAiInsightBoxesHTML`** (les boîtes "AI Insight"/"Score Rationale"
  construites et vérifiées ce matin), `_reminderBannerHTML`,
  `_pdNextActionHTML`, `_pdInteractionsHTML`, `_pdMessageHistoryHTML`,
  `_pdBuyingCommitteeHTML`, `_pdEditSectionHTML` — **toutes ces sections
  vivent dans la MÊME fonction, le MÊME appel, pas un mode différent, pas
  un composant séparé.** Ce n'est donc pas un cas (b) au sens strict
  ("composant totalement distinct"). Ce n'est pas non plus un cas (a) au
  sens strict ("mode d'affichage différent qui saute le rendu moderne") —
  il n'y a qu'un seul mode, pas de paramètre à identifier.
- **Ce qui s'est réellement passé** : ce matin, le brief demandait
  d'ajouter les 29 règles CSS `.pd-*` manquantes (fait, vérifié) et de
  construire les boîtes AI Insight/Score Rationale + le footer épinglé
  (fait, vérifié) — mais **jamais de réécrire le rendu des champs plats
  eux-mêmes pour qu'il consomme ces nouvelles classes**. Vérifié
  maintenant, une par une, les 20 classes `.pd-header`, `.pd-head-top`,
  `.pd-name`, `.pd-name-row`, `.pd-stage-chip`, `.pd-role`, `.pd-firmo`,
  `.pd-stats`, `.pd-stat`, `.pd-stat-label`, `.pd-stat-value`,
  `.pd-stat-edit`, `.pd-row`, `.pd-row-main`, `.pd-row-mono`,
  `.pd-row-name`, `.pd-section`, `.pd-section-label`, `.pd-body`,
  `.pd-plus` : **0 occurrence `class="..."` dans tout le fichier pour
  chacune d'entre elles.** Elles existent dans la feuille de style (ajoutées
  ce matin, commit `740eca0`) et ne sont consommées **nulle part** — du
  CSS mort à 100%, pas une supposition.
- **Historique** : `wominds.html` n'a été committé pour la première fois
  qu'aujourd'hui (`740eca0`, aucun historique git antérieur possible — le
  fichier était non suivi avant). Le diff de ce commit montre le fichier
  entier comme "ajouté", donc impossible de dater précisément *quand* ce
  bloc de rendu plat a été écrit avant aujourd'hui via git seul — mais il
  n'a été touché par **aucun** des deux commits d'aujourd'hui
  (`740eca0`, `89a6cf5` — vérifié par grep sur les deux, ligne identique
  des deux côtés), donc il préexistait tel quel avant toute passe de
  parité de ce jour, jamais mis à jour depuis.

**Conclusion pour la suite (remplace le chiffrage initialement demandé en
cas (b))** : il n'y a rien à "faire pointer vers le même composant" — c'est
déjà le même composant. Le travail réel est un **refactor ciblé, à faible
risque, à l'intérieur d'une seule fonction déjà identifiée**
(`openProspectDetail`, wominds.html:3846-3889) : remplacer le
`rows.map(...)` par une structure `.pd-header`/`.pd-head-top`/`.pd-name`/
`.pd-stats`/`.pd-stat`/`.pd-row` qui consomme les classes déjà présentes
dans la feuille de style (aucune nouvelle règle CSS à écrire, elles
existent déjà) — pas une réécriture architecturale, pas de nouvelle donnée
à charger, juste swap de balisage. Effort estimé : petit à moyen (une
seule fonction, quelques dizaines de lignes), nettement plus léger que
les chantiers portés plus tôt aujourd'hui. Non fait dans cette passe
(diagnostic demandé, pas de code).

## P0 — Cause racine de "Impossible d'obtenir un score exploitable"

> **CORRIGÉ (2026-09-13, même jour, commit groupé avec le fix Item 0).**
> `runScanner()` (wominds.html) : `max_tokens` remonté de 300 à **600**
> (dimensionné au besoin réel — 1 seul sous-score contre les 4 de
> demo-private.html, qui utilise 1000 — pas une copie réflexe de cette
> valeur). Ajout d'une vérification `!res.ok || data.type === 'error'`
> juste après le fetch, avec un message distinct
> ("Erreur API (status)...") de "Impossible d'obtenir un score
> exploitable" pour ne plus confondre les deux causes. **Vérifié par 3
> appels réels au endpoint de production** (`https://corridor.systems/api/generate`,
> même payload theravia/mandat Wominds réel) après le fix :
> les 3 se terminent en `stop_reason: "end_turn"` (plus jamais
> `"max_tokens"`) et produisent chacun un JSON exploitable —
> `{"score":2,...}`, `{"score":3,...}`, `{"score":2,...}` — latences
> 2,3s à 5,7s, thinking_tokens 0 à 188 selon l'essai, jamais assez pour
> retronquer avec la nouvelle marge. 3/3, pas un coup de chance isolé.

**Cause identifiée : `max_tokens: 300` trop bas pour le modèle
`claude-sonnet-5` en mode "thinking" étendu — la réponse est tronquée avant
la fin du JSON, pas un timeout, pas une erreur HTTP, pas un mandat manquant.**

**Reproduction réelle** (pas une lecture de code — appel HTTP réel envoyé à
`https://corridor.systems/api/generate` le 2026-09-13, payload identique à
celui que `runScanner()` de wominds.html construirait pour
entreprise="theravia", avec les vrais critères du mandat actif Wominds
lus en base) :

- Endpoint : `/api/generate` (identique aux deux fichiers, cf. section
  architecture ci-dessous).
- Payload envoyé : `{"messages":[{"role":"user","content":"<prompt>"}],
  "max_tokens":300}` — pas de `client_id` ni `mandate_id` dans le payload
  API (les deux fichiers résolvent le mandat côté client via une requête
  Supabase directe et l'injectent en texte dans le prompt — même
  architecture des deux côtés sur ce point précis).
- Réponse HTTP réelle : **200 OK**, en **6,3 secondes**. Corps réel
  (extrait) :
  ```
  "stop_reason":"max_tokens"
  "usage":{"input_tokens":1068,"output_tokens":300,"output_tokens_details":{"thinking_tokens":228}}
  content: [{"type":"thinking","thinking":""}, {"type":"text","text":
    "{\"score\": 2, \"confidence\": \"faible\", \"rationale\": \"Aucune
    information disponible sur la taille, le secteur ou les signaux clés
    de Theravia ne permet d'évaluer l'adéquation avec les"
  ```
- Le modèle a consommé **228 des 300 tokens de sortie autorisés en
  "thinking"** avant de commencer à écrire la réponse visible — il ne
  restait que ~72 tokens pour le JSON, coupé net en plein milieu du champ
  `rationale`, sans accolade fermante.
- Le code de `runScanner()` (wominds.html) fait `text.match(/\{[\s\S]*\}/)`
  — cette regex exige une accolade fermante `}` pour matcher. Comme le
  texte est tronqué avant toute accolade fermante, **aucun match**, `m` est
  `null`, `parsed` est `null` → branche `else` → exactement le message
  observé : "Impossible d'obtenir un score exploitable, réessayez."
- Ce n'est **pas** une erreur HTTP (le statut est 200, ce chemin ne passe
  jamais par le `catch` qui produirait "Erreur, vérifiez votre
  connexion."), **pas** un timeout (6,3s, largement sous n'importe quel
  seuil raisonnable), **pas** un mandat/ICP manquant (le mandat Wominds
  actif a été lu et injecté correctement — `input_tokens: 1068` le confirme,
  un prompt vide aurait ~200 tokens d'entrée).

**Comparaison avec demo-private.html ("Scan signals")** — même endpoint
`/api/generate` (`API_URL`), mais :
| | wominds.html `runScanner()` | demo-private.html `runScanner()` (appel score, ligne ~4724) |
|---|---|---|
| `max_tokens` de l'appel de scoring | **300** | **1000** |
| Vérifie `res.ok` avant de parser | **Non** | Oui (`_scoreResp.ok ? await _scoreResp.json() : null`) |
| Champs JSON demandés | 3 (`score`,`confidence`,`rationale`) | 4 sous-scores + confidence + rationale (plus complexe, donc plus de tokens de sortie nécessaires, pas moins) |
| Recherche web avant scoring | Non (seule `_runContactIntelligence`, niveau personne, fait une recherche web) | Oui — étape "STEP 1" obligatoire dans le prompt, brief complet généré avant le score |

demo-private.html demande un JSON **plus complexe** que wominds.html
(4 sous-scores au lieu d'1 score global) mais lui alloue **plus de trois
fois** le budget de tokens de sortie — c'est directement ce qui lui permet
d'absorber le "thinking" du modèle sans jamais tronquer la réponse.
**Correction recommandée (pas appliquée dans cette passe, diagnostic
uniquement) : remonter `max_tokens` de 300 à au moins 1000 dans
`runScanner()` de wominds.html, et ajouter la vérification `res.ok`/
`data.type === 'error'` avant de parser (même classe de garde manquante
que celle corrigée aujourd'hui plus tôt sur `_escalateProspect`,
jamais appliquée à `runScanner()`).**

## P1 — Architecture du Scanner : demo-private.html ↔ wominds.html

| Élément | demo-private.html | wominds.html | Statut |
|---|---|---|---|
| Onglets "ICP Scan / Free Search" | Présents (`.scanner-mode-toggle`, `_scannerSetMode('icp'\|'free')`, demo-private.html:15280-15281) | **Absents** — un seul panneau, un seul mode (équivalent implicite à "ICP Scan" toujours actif, jamais de "Free Search") | **À PORTER** — le commentaire existant dans wominds.html ("ampleur disproportionnee pour un premier passage") justifie l'absence de comité d'achat/fiche contact/déclencheurs & stratégie *au moment où il a été écrit*, mais ces trois éléments existent en fait déjà aujourd'hui (voir plus bas) — le commentaire est obsolète, et ne mentionne de toute façon jamais spécifiquement le toggle de mode. Aucune raison produit vérifiée trouvée pour l'absence du toggle lui-même. |
| Brief "Company Intelligence" (Why Now / Pain Points / Opening Angle, recherche web obligatoire) | Présent — prompt en 2 étapes explicites ("STEP 1 — recherche web", "STEP 2 — brief"), rendu via `callAI()`/`renderMarkdown()` | **Absent** — le score wominds n'a pas de brief prose associé, seulement score/confidence/rationale en une phrase, sans recherche web | **À PORTER** — pas un renommage, une fonctionnalité entière (brief qualitatif motivé par une recherche web réelle) manque côté Wominds. Aucun commentaire ne justifie cette absence. |
| Section "Buying Triggers" | Présente (extraite du brief complet par regex sur `## BUYING TRIGGERS`) | Absente (dépend du brief ci-dessus, qui n'existe pas) | **À PORTER** — même cause que la ligne précédente, pas une divergence indépendante. |
| Section "Behavioural Profile & Strategy" (niveau entreprise : style de décision, angle d'approche) | Présente (extraite du même brief, `## BEHAVIOURAL PROFILE & STRATEGY`) | Partiellement recouverte par "Fiche contact"/"Brief personne" (`_runContactIntelligence`, wominds.html:6427) — mais celle-ci est **au niveau de la personne**, pas de l'entreprise (pas de "style de décision de l'organisation dans son ensemble") | **ÉQUIVALENT partiel** pour le volet personne (qui/priorités/comment l'aborder/présence en ligne recouvre "Comment l'aborder" + une partie du profil comportemental) ; **À PORTER** pour le volet entreprise (aucun équivalent). |
| Tags "Buying signals" auto-détectés (fundraise/senior hire/expansion/partnership, regex sur le brief) | Présents (`sigList`, compteur `#sc-signals`) | Absents (pas de brief à analyser, cause identique aux lignes Company Intelligence/Buying Triggers) | **À PORTER** — même cause racine, pas une divergence isolée à traiter séparément. |
| Comité d'achat depuis le Scanner autonome | Présent (`_mapStakeholders`, function dédiée) | Présent (`_scannerMapCommittee`, construit le 2026-09-12 selon le commentaire de code, wominds.html:~1963) — 3 recherches web + IA structurée, même garde anti-invention ("uniquement des personnes avec un profil LinkedIn confirmé par une citation réelle") | **ÉQUIVALENT (nom différent)** — le commentaire "sans cartographie du comité d'achat" plus haut dans le fichier est **obsolète** : cette fonctionnalité a été ajoutée après coup et le commentaire n'a pas été mis à jour. À corriger dans le code (juste le commentaire, hors périmètre "pas de code" de cette passe — signalé pour une passe future). |
| Fiche contact / Brief personne (niveau personne) | Présent (`_runContactIntelligence`, partagée entre tiroir et Scanner) | Présent (même nom de fonction `_runContactIntelligence`, wominds.html:6427, "identique demo-private.html:4503, sans le fallback LinkedIn déjà connu en base" selon le commentaire) | **ÉQUIVALENT** — déjà porté, avec une différence documentée et justifiée (pas de prospect de tiroir ouvert dans le Scanner autonome, donc pas de LinkedIn déjà connu à réutiliser en fallback). |
| Score ICP — nombre de sous-scores | 4 (`role_score`,`size_score`,`signal_strength_score`,`mandate_fit_score`) + panneau de détail (`_renderBreakdownPanel`) | 1 seul score global (`score` 0-10), pas de sous-scores, pas de panneau de détail pour un scan autonome | **À PORTER (probable)** — le tiroir prospect de wominds.html a bien un panneau de sous-scores (`_renderBreakdownPanel`/`ICP_WEIGHTS`, porté ce matin) mais le Scanner autonome ne les calcule pas du tout, contrairement à demo-private.html qui les calcule dans les deux contextes. Cause probable la même que le score global : le prompt actuel ne demande qu'un seul chiffre, pas 4 — corrélé au problème de `max_tokens` du P0 (un JSON à 4 champs numériques + confidence + rationale a besoin d'encore plus de budget de sortie que les 300 tokens actuels, donc ce n'est pas un simple ajout de champs sans revoir aussi `max_tokens`). |
| Endpoint API | `/api/generate` (`API_URL`) | `/api/generate` | **ÉQUIVALENT** — identique. |
| `client_id`/`mandate_id` dans le payload API | Ni l'un ni l'autre (résolu côté client, injecté en texte) | Ni l'un ni l'autre (même mécanisme) | **ÉQUIVALENT** — identique, confirmé par lecture des deux et par l'appel réel du P0. |

**Résumé P1 :** la divergence structurelle principale n'est pas une
question de nommage (peu de vrais renommages ici, contrairement à l'audit
du matin sur le tiroir) — c'est une fonctionnalité entière absente
(le brief qualitatif "Company Intelligence" + tout ce qui en découle :
Buying Triggers, tags de signaux, Behavioural Profile niveau entreprise,
mode Free Search) plutôt qu'un ensemble de petites divergences
indépendantes. Le Comité d'achat et la Fiche contact, en revanche, sont
déjà correctement portés (juste sous des noms différents) — l'ancien
commentaire qui dit le contraire dans wominds.html doit être corrigé lors
d'une prochaine passe de code.

*Ajouté le 2026-09-13 (brief "diagnostic + audit Scanner wominds.html").
Diagnostic P0 vérifié par appel HTTP réel au endpoint de production, pas
par lecture de code seule.*

## Mise à jour — Company Intelligence + sous-scores ICP construits (2026-09-13)

> **PORTÉ.** Les lignes du tableau P1 ci-dessus "Brief Company Intelligence",
> "Buying Triggers", "Tags de signaux auto-détectés", "Behavioural
> Profile" et "Score ICP — nombre de sous-scores" sont désormais
> construites côté wominds.html (`runScanner()`), sur le même mécanisme
> que la référence : un seul prompt en 5 sections `##` (traduites en
> français, catégories mandat/décideurs Wominds réelles au lieu des
> critères Corridor), découpage par regex identique (section principale
> avant `## DÉCLENCHEURS D'ACHAT`, deux zones extraites séparément),
> recherche web réelle avant rédaction (`_prefetchWebContext`/
> `_marketIntelSearch`, réutilisées telles quelles, déjà présentes côté
> wominds.html — vérifié avant d'écrire le code, pas supposé). Score ICP
> passé de 1 à 4 sous-scores (`role_score`/`size_score`/
> `signal_strength_score`/`mandate_fit_score`), branché sur
> `_renderBreakdownPanel` (2 arguments côté wominds.html, ne réécrit pas
> le DOM directement contrairement à la version à 3 arguments de
> demo-private.html — vérifié par lecture directe des deux avant
> d'écrire le code, un conteneur dédié `#scanner-breakdown-panel` a été
> ajouté puisque la fonction elle-même n'écrit jamais dans le DOM côté
> wominds.html).
>
> **Tags de signaux — PROPOSITION, pas encore validée par Thomas** (6
> catégories construites sur `mandates.signals` réel de Wominds :
> Échéance réglementaire, Indicateurs RH, Engagement égalité F/H, Label/
> certification, Recrutement mixité, M&A/levée — jamais copiées des
> catégories anglophones fundraise/senior-hire/expansion/partnership de
> demo-private.html, qui n'ont aucun sens pour ce mandat). À revoir avant
> de les considérer figées.
>
> **Écart trouvé pendant la vérification réelle, corrigé avant de
> considérer ce point clos** : le brief demandait `max_tokens: 1800`
> minimum pour le brief Company Intelligence. Testé réellement contre
> `https://corridor.systems/api/generate` (entreprise réelle Duralex,
> contact réel Maxime Nélia, contexte injecté) : **1800 a réellement
> tronqué** (`stop_reason:"max_tokens"`, `thinking_tokens:1214/1800`,
> coupé en plein "Points de douleur", jamais atteint Déclencheurs ni
> Profil comportemental) — même classe de bug que le P0 du matin, sur un
> prompt différent et plus long. Remonté à **3000**, retesté sur le même
> cas réel : `stop_reason:"end_turn"`, 5 sections complètes, Déclencheurs
> et Profil correctement extraits, 5 des 6 catégories de tag détectées
> (celles réellement présentes dans le contexte injecté, la 6e -- M&A/
> levée -- correctement absente, aucun faux positif). Cas négatif
> (entreprise fictive, sans contexte) testé aussi : le marqueur "Aucune
> information publique vérifiable trouvée" déclenche bien, 0 tag détecté
> comme attendu. Score ICP à 4 sous-scores testé séparément (`max_tokens:
> 1000`, valeur demandée) : `stop_reason:"end_turn"` sur 2 essais réels,
> `size_score` renvoyé à `-1` sur un cas volontairement ambigu (secteur/
> effectifs non précisés) les deux fois, et le breakdown transmis à
> `_renderBreakdownPanel` omet bien `company_size_fit` dans ce cas (pas
> affiché à 0%).

*Ajouté le 2026-09-13 (brief "Company Intelligence Wominds, Phase 2" +
brief "Sous-scores ICP détaillés, Scanner autonome Wominds", traités
ensemble car modifiant la même fonction `runScanner()`). Toutes les
vérifications ci-dessus sont des appels réels au endpoint de production,
pas des suppositions de code.*

---

# Extraction de référence — "Company Intelligence" (demo-private.html, 2026-09-13)

Diagnostic uniquement, aucun code modifié. Code cité **verbatim**, pas
paraphrasé — sert de base réelle à toute future conception d'une version
Wominds, pour ne pas deviner ce que fait la référence.

## 1. Le prompt exact

Construit dans `runScanner()`, demo-private.html:4610-4641 (`_scannerMode !== 'free'`,
branche "ICP Scan"). Variables interpolées : `company`, `sector`, `stage`,
`fundingStr`, `urlStr`, `personStr`, `contextStr`, `currentLang`.

```
You are Corridor's signal intelligence engine analysing a real prospect.

Company: ${company}
Sector: ${sector}
Stage: ${stage}
${fundingStr}${urlStr}${personStr}${contextStr}

STEP 1 — Use web search to find recent, verifiable facts about ${company}: funding rounds, expansion moves, key hires, leadership, recent news. Search the web before analysing.
STEP 2 — Write a sharp intelligence brief based ONLY on verified facts from your search and the context provided above. Do NOT invent figures, names, dates, or events. If web search returns nothing reliable about this specific company, say so explicitly at the very top — "⚠️ No verifiable public information found for ${company} — the brief below is generic, based only on sector and stage." — rather than fabricating details.

Structure your response with exactly these five ## section headers:

## WHY NOW
Why this company is a strong fit for international GTM advisory right now. Be specific about the timing window, citing the verified signals you found.

## PAIN POINTS
The 2-3 most likely pain points they are experiencing at this stage.

## OPENING ANGLE
The single best opening angle for outreach to this company.

## BUYING TRIGGERS
The 2-3 specific signals that indicate this company is ready to buy GTM advisory now.

## BEHAVIOURAL PROFILE & STRATEGY
Two short paragraphs: first on the likely decision-making style ${person ? `of ${person}, the primary contact` : `of the company's likely buying process (no contact name provided)`}; second on the exact approach strategy — what to lead with, what to avoid, what the close looks like.

Be direct, commercial, and specific. No generic consulting language. Max 420 words.

Rules: Never use em-dashes (—) or horizontal rules (---) in your response.

Language instruction: Write your entire response in ${currentLang === 'fr' ? 'French' : 'English'}. All section headers, bullet points, and analysis must be in that language.
```

Ce prompt seul contient déjà les 5 sections (WHY NOW / PAIN POINTS /
OPENING ANGLE / BUYING TRIGGERS / BEHAVIOURAL PROFILE & STRATEGY) — **un
seul et même prompt produit les 5**, pas 5 prompts séparés.

Avant l'envoi, ce prompt est préfixé (demo-private.html:4645-4647) :

```js
const _scanLive = await _prefetchWebContext(company, sector, siteUrl);
const _scanNoCtx = _scanLive ? '' : '\nNO LIVE CONTEXT AVAILABLE: Do not invent company-specific facts, figures, or events. If no verified data is found, state so explicitly.\n';
const _sp1 = callAI(_scanLive + _scanNoCtx + prompt, _scanEl, 'scanner-spinner');
```

## 2. Endpoint + mécanisme de grounding web

**Deux appels réseau distincts, pas un seul** :

1. **Recherche web réelle avant génération** — `_prefetchWebContext(company, sector, siteUrl, _out)`
   (demo-private.html:4455-4463) :
   ```js
   async function _prefetchWebContext(company, sector, siteUrl, _out = null) {
     if (!company) return '';
     const _dom = siteUrl ? siteUrl.replace(/^https?:\/\//, '').split('/')[0] : '';
     const q = (company + (_dom ? ' ' + _dom : '') + ' ' + (sector || '') + ' recent news expansion').trim();
     const ctx = await _marketIntelSearch(q, 500, _dom, _out);
     return ctx
       ? '\nLIVE CONTEXT about ' + company + ' (from web search, today):\n' + ctx + '\nUse this to make the analysis accurate and specific. Never suggest expansion into a market the company is already clearly established in based on the web search.\n'
       : '';
   }
   ```
   qui appelle `_marketIntelSearch(query, maxTokens=500, domain, _out)`
   (demo-private.html:4429-4452), lequel POST sur **`/api/web-search`**
   (un wrapper Perplexity côté serveur, jamais nommé côté client — cf.
   règle de confidentialité vendor déjà en vigueur) :
   ```js
   const r = await fetch('/api/web-search', {
     method: 'POST', headers: { 'Content-Type': 'application/json' },
     signal: ctrl.signal,
     body: JSON.stringify({ max_tokens: 500, messages: [{ role: 'user', content: query }], search_domain_filter: domain ? [domain] : undefined })
   });
   ```
   Timeout 20s (`AbortController`), retour `''` en cas d'échec (fail-open,
   pas d'exception qui casserait le scan).
2. **Génération du brief** — `callAI(prompt, outputEl, spinnerId, maxTokens=1000, renderAsText=false)`
   (demo-private.html:4379-4416), qui POST sur **`/api/generate`**
   (`API_URL`, constante définie demo-private.html:3607 = `'/api/generate'`) :
   ```js
   const payload = { model: 'claude-sonnet-5', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] };
   const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
   ```
   Appelé ici **sans 4e argument** (`callAI(_scanLive + _scanNoCtx + prompt, _scanEl, 'scanner-spinner')`,
   demo-private.html:4647) → utilise la valeur par défaut **`maxTokens = 1000`**.

**Donc : oui, recherche web réelle avant génération** (pas des données déjà
en base) — le contexte web est injecté en texte dans le prompt envoyé au
modèle, pas fourni séparément à l'API.

## 3. Structure de réponse exacte

**Ce n'est PAS du JSON.** `callAI()` retourne du texte libre (markdown),
rendu via `renderMarkdown()` (demo-private.html:4407 :
`outputEl.innerHTML = renderMarkdown(text);`). La "structure" est
purement textuelle — 5 blocs `## HEADER` en clair dans la réponse du
modèle, extraits ensuite côté client par regex sur le texte brut complet
(`_scanFullText`), pas par un parseur JSON.

Affichage découpé en plusieurs zones DOM à partir du **même texte
complet** (demo-private.html:4657-4672) :
```js
if (_scanRawText && _scanEl) {
  const _scanCoreText = _scanFullText.split(/\n##\s*BUYING TRIGGERS/i)[0].trim();
  _scanEl.innerHTML = renderMarkdown(_scanCoreText);
}
const triggersMatch = _scanFullText.match(/^## BUYING TRIGGERS\s*\n([\s\S]*?)(?=\n##\s|$)/mi);
const strategyMatch = _scanFullText.match(/^## BEHAVIOURAL PROFILE & STRATEGY\s*\n([\s\S]*?)(?=\n##\s|$)/mi);
if (_scanTriggersEl) _scanTriggersEl.innerHTML = triggersMatch ? renderMarkdown(triggersMatch[1].trim()) : '';
if (_scanStrategyEl) _scanStrategyEl.innerHTML = strategyMatch ? renderMarkdown(strategyMatch[1].trim()) : '';
```
`_scanEl` (zone "Company Intelligence" visible) reçoit tout le texte
**avant** `## BUYING TRIGGERS` (donc WHY NOW + PAIN POINTS + OPENING
ANGLE réunis, jamais séparés en 3 zones DOM distinctes malgré les 3
en-têtes ## différents) ; `_scanTriggersEl` et `_scanStrategyEl` sont deux
zones séparées, remplies par extraction regex du même texte.

## 4. Buying Triggers — comment ils sont détectés

**Sortie du même appel LLM que Why Now/Pain Points/Opening Angle — pas un
appel séparé, pas des règles codées en dur pour la génération.** Seule
l'*extraction* (pas la génération) est codée en dur, par regex sur le
texte complet déjà généré (citation exacte ci-dessus, section 3). Le
contenu réel des Buying Triggers est écrit par le modèle, à partir de
l'instruction `## BUYING TRIGGERS\nThe 2-3 specific signals that indicate
this company is ready to buy GTM advisory now.` dans le prompt unique.

## 5. Tags "Buying signals" auto-détectés — source

**Règles codées en dur (regex JavaScript), zéro appel LLM.** Appliquées
directement sur `aiTxt` (= `_scanFullText`, le texte complet déjà généré
par le même unique appel), demo-private.html:4677-4688 :
```js
const aiTxt = _scanFullText;
const noInfo = /no verifiable|no public information|no information found|unable to find|cannot find/i.test(aiTxt);
const sigs = [];
if (!noInfo) {
  if (/fund|raised|series [abc]|investm/i.test(aiTxt)) sigs.push({type:'s1', label:'Fundraise signal'});
  if (/new.*(?:vp|cro|cmo|cto|svp|director|head of)|appointed|joined/i.test(aiTxt)) sigs.push({type:'s3', label:'Senior hire'});
  if (/expan|new market|international|new country|new region|enter.*market/i.test(aiTxt)) sigs.push({type:'s4', label:'Expansion move'});
  if (/partner|acqui|merger/i.test(aiTxt)) sigs.push({type:'s2', label:'Partnership'});
  if (sigList && sigs.length > 0) {
    sigList.innerHTML = '<div class="signal-list">' + sigs.map(s => `<span class="signal-tag signal-${s.type}">${s.label}</span>`).join('') + '</div>';
  }
}
```
4 catégories fixes, mots-clés anglais en dur (`fund|raised|series [abc]`,
`new.*(vp|cro|cmo|cto|svp|director|head of)|appointed|joined`,
`expan|new market|international|...`, `partner|acqui|merger`) — aucune
classification LLM, aucune configuration externe. Un premier garde-fou
(`noInfo`) désactive complètement la détection si le texte contient une
formule d'absence de données ("no verifiable", "unable to find", etc.),
pour ne jamais tagger un signal à partir d'un brief qui dit explicitement
n'avoir rien trouvé.

## 6. Behavioural Profile & Strategy — comment il est généré

**Même réponse que Why Now/Pain Points/Opening Angle/Buying Triggers —
un seul appel LLM, extraction par regex** (citation exacte section 3,
`strategyMatch`). Instruction dans le prompt unique : "Two short
paragraphs: first on the likely decision-making style [...] second on
the exact approach strategy — what to lead with, what to avoid, what the
close looks like." Rien de codé en dur ici, contrairement aux Buying
signals (section 5) — c'est un texte généré, pas une règle.

## 7. Nombre total d'appels API pour un scan complet

| Appel | Endpoint | Fonction | Toujours déclenché ? |
|---|---|---|---|
| Recherche web entreprise | `/api/web-search` | `_prefetchWebContext` → `_marketIntelSearch` | Oui (si `company` renseignée) |
| Brief complet (5 sections en un seul texte) | `/api/generate` | `callAI(...)` | Oui |
| Recherche web personne | `/api/web-search` | `_runContactIntelligence` (interne) | Seulement si `person` renseigné |
| Bio/brief personne | `/api/generate` | `_runContactIntelligence` (interne) | Seulement si `person` renseigné |
| Score ICP (4 sous-scores) | `/api/generate` | appel direct `fetch(API_URL, ...)` dans `runScanner()`, ligne 4724 | Oui (si `_scannerMode !== 'free'`) |

**Total réel pour un scan complet** :
- **3 appels** (1 web-search + 2 generate) si aucun contact/personne saisi.
- **5 appels** (2 web-search + 3 generate) si un nom de contact est
  saisi — le brief entreprise et la fiche personne tournent **en
  parallèle** (`Promise.all([_sp1, _sp2])`, demo-private.html:4649), pas
  en séquence, donc pas de latence additive entre les deux malgré le
  nombre d'appels plus élevé. Le score ICP, lui, tourne **après** ces
  deux-là (séquentiel, pas en parallèle) puisqu'il utilise les signaux
  détectés dans le brief déjà généré.

*Ajouté le 2026-09-13 (brief "extraction de la référence Company
Intelligence"). Toutes les citations de code ci-dessus sont copiées
verbatim depuis demo-private.html, pas paraphrasées ni reconstituées de
mémoire.*

---

# Diagnostic — 3 points Scanner wominds.html (2026-09-13, passe diagnostic uniquement)

Aucun code modifié dans cette passe. Les 3 points ci-dessous répondent
chacun à une question précise posée par Thomas, avec preuve directe
(lecture de code + appel réel au endpoint de production pour le point 1).

## Point 1 — Signaux absents sur theravia/Audrey Hatton : VRAI BUG, isolé

> **CORRIGÉ (2026-09-13).** `_scannerDetectSignals` (wominds.html) ne
> bloque plus la détection dès que le disclaimer "aucune information
> vérifiable" apparaît en tête — il vérifie désormais s'il reste du texte
> substantiel après ce disclaimer (`afterDisclaimer.length < 40` pour
> considérer le brief réellement vide) avant de renvoyer `[]`.
> **Revérifié sur le texte réel exact capturé pour theravia/Audrey
> Hatton** (celui-là même qui avait révélé le bug, pas un nouveau cas
> inventé) : `_scannerDetectSignals` renvoie maintenant
> `['Échéance réglementaire', 'Indicateurs RH', 'Engagement égalité F/H',
> 'M&A / levée de fonds']` — les 4 catégories exactes que le diagnostic
> avait confirmées comme présentes mot pour mot dans ce texte. Le garde-
> fou reste actif pour un cas réellement vide (testé avec seulement la
> phrase disclaimer, sans aucune suite) : renvoie bien `[]`.

**Le mécanisme ne tourne que sur le texte généré par la recherche web
entreprise (`briefText`), jamais sur les signaux déjà connus en base**
(`prospects.signal`/`signal_type` pour un prospect existant) — confirmé
par lecture directe de `runScanner()` : aucune requête vers `prospects`
n'y figure pour le nom d'entreprise tapé, uniquement vers `mandates`. Le
Scanner autonome est conçu pour évaluer une entreprise nommée à la main,
pas pour relire les signaux Trigify déjà stockés sur une fiche existante
homonyme (Audrey Hatton a bien un signal réel en base, mais `runScanner()`
ne le consulte jamais, qu'il s'agisse de "theravia" ou d'un autre nom).

**Test réel effectué** : rejoué l'appel exact que `runScanner()`
construirait pour entreprise="theravia", contact="Audrey Hatton"
(Deputy CFO), avec le vrai mandat Wominds, contre
`https://corridor.systems/api/generate` (`max_tokens: 3000`,
`stop_reason: "end_turn"`, aucune troncature). Réponse réelle obtenue :

```
⚠️ Aucune information publique vérifiable trouvée pour Theravia concernant son actualité RH/RSE, son Index EgaPro, ses labels ou une levée de fonds récente. Le brief ci-dessous est générique, basé sur le secteur (pharma spécialisée/maladies rares), la taille probable de l'entreprise et le mandat Wominds.

## POURQUOI MAINTENANT
[...] échéance de la Directive Transparence Salariale (fin 2026) [...]

## POINTS DE DOULEUR
[...] Turnover féminin potentiellement élevé [...] Risque [...] en cas d'opération de M&A ou de levée de fonds [...]

## DÉCLENCHEURS D'ACHAT
[...] Publication ou mise à jour de l'Index EgaPro. [...]
```

**Chaque catégorie testée individuellement sur ce texte réel** :
Échéance réglementaire → `true`, Indicateurs RH → `true`, Engagement
égalité F/H → `true`, M&A/levée de fonds → `true` (4 des 6 catégories
matchent réellement des mots-clés présents dans le texte). **Mais
`_scannerDetectSignals(briefText)` renvoie `[]` (vide).**

**Cause racine identifiée, pas supposée** : le brief commence par la
phrase-marqueur exacte prévue par le prompt pour signaler une absence de
données vérifiées — "⚠️ Aucune information publique vérifiable trouvée
pour Theravia..." — qui correspond mot pour mot au garde-fou `noInfo`
(`_scannerDetectSignals`, wominds.html) :
```js
const noInfo = /aucune information (publique )?vérifiable|aucune donnée fiable|impossible de trouver|rien de fiable trouvé/i.test(text);
if (noInfo) return [];
```
Ce garde-fou est **délibérément conçu** (même logique que le `noInfo` de
demo-private.html cité dans l'extraction Company Intelligence) pour ne
jamais tagger un signal quand le modèle dit explicitement n'avoir rien
trouvé — mais il coupe la détection sur **tout le texte**, y compris la
partie "générique" qui suit et qui, elle, discute légitimement de sujets
réglementaires/RH/M&A en lien avec le mandat (de façon spéculative,
"probablement"/"potentiellement" — pas des faits vérifiés, mais du texte
catégorisable quand même selon la logique actuelle des regex).

**Verdict, selon le critère posé par Thomas** : le brief mentionne bien
quelque chose qui aurait dû matcher (4 catégories sur 6, vérifié mot par
mot) et le tag n'apparaît quand même pas → **c'est le "vrai bug de rendu
à isoler" décrit dans la demande, pas un "Force du signal: 0" cohérent**.
La cause est un garde-fou anti-invention trop large : il traite la
présence de la phrase-disclaimer comme une preuve d'absence totale de
signal, alors que le prompt lui-même prévoit explicitement qu'un brief
"générique" substantiel soit rédigé après ce disclaimer. **Corrigé et
revérifié, cf. bandeau en tête de section.**

## Point 2 — "Qui a interagi" : localisé, un des 3 endroits déjà identifiés

> **CORRIGÉ (2026-09-13).** La construction de `sigText` dans
> `runMorningScan()` (wominds.html) appelle désormais `_sanitizeSignal(p.signal)`
> (même fonction/même résolution `clients.contact_name` que le fix de ce
> matin sur la fiche prospect) au lieu de faire son propre
> `.replace(/<[^>]*>/g,'')` brut. Ajustement associé : `_sanitizeSignal`
> renvoie déjà du texte `_esc()`-safe en interne, donc le double
> échappement en aval (`_esc(sigText)` dans le HTML de la carte) a été
> retiré pour éviter des entités doublées (`&amp;amp;`). **Revérifié en
> exécutant le code réel** avec le signal exact d'Audrey Hatton
> (`"A interagi avec votre profil (mot-cle: https://www.linkedin.com/in/elodiedratler)"`) :
> le texte produit pour la carte est maintenant
> `"Pourquoi : A interagi avec le profil d'Élodie Dratler"` — plus de
> "votre profil" non résolu, aucune entité doublée observée.

**Ce n'est pas un 4e emplacement** — c'est le premier des "3 autres
endroits" déjà notés ce matin (`_pdAiInsightBoxesHTML`/section PORTÉ,
note "non couvert par ce fix"), avec une précision qui manquait alors :
il s'agit du récapitulatif "top prospects" du **Briefing du matin**
(`runMorningScan()`), pas du panneau "Scanner une entreprise" lui-même
(qui, point 1 ci-dessus le confirme, ne lit jamais `prospects.signal`
pour un nom tapé à la main). Si Thomas a vu le texte non résolu en
testant "quelque chose appelé Scanner", c'est très probablement en ayant
lancé "▶ Briefing du matin" (ou en relisant son résultat dans le flux
Signaux) et en y voyant apparaître Audrey Hatton parmi les prospects
récapitulés.

**Code exact, cité, pas supposé** (wominds.html, dans `runMorningScan()`) :
```js
// ligne ~2902-2904
const sigText = p.signal_interpretation
  ? p.signal_interpretation.slice(0, 140)
  : p.signal.replace(/<[^>]*>/g, '').trim().slice(0, 90) + (p.signal.replace(/<[^>]*>/g, '').trim().length > 90 ? '…' : '');
...
// ligne ~2917 — sigText injecte directement dans la carte, jamais passe par _sanitizeSignal
'<div ...><span style="font-weight:700;">Pourquoi :</span> ' + _esc(sigText) + '</div>';
// ligne ~2918 — devient htmlContent d'un item 'morning'
return { timestamp: runTs, type: 'morning', ..., htmlContent: cardHtml };
```
Et le rendu final, `_renderSignalsFeed()` (wominds.html, ligne ~2690-2691) :
```js
const bodyHtml = item.type === 'morning'
  ? `<div>${item.htmlContent || _esc(item.content || '').replace(/\n/g, '<br>')}${item.linkHtml || ''}</div>`
  : `<div ...>${item.signal ? _sanitizeSignal(item.signal) + '<br>' : ''}${...}`; // branche 'live' : deja corrigee
```
La branche `'live'` (Alerte en direct) appelle bien `_sanitizeSignal` —
seule la branche `'morning'` (Briefing du matin) l'évite, parce que
`sigText` a déjà été construit brut, en amont, sans passer par cette
fonction. Pour Audrey Hatton (`signal_interpretation` vide, confirmé
plus tôt aujourd'hui), le fallback `p.signal.replace(...)` afficherait
donc "Pourquoi : A interagi avec votre profil" non résolu, si elle
apparaît dans le top des prospects scorés d'un Briefing du matin.

**Précision utile pour éviter une confusion future** : `runPipelineIntel()`
("▶ Scanner les nouveaux prospects", le seul des 3 boutons Signaux à
porter littéralement le mot "Scanner" dans son libellé) utilise déjà
correctement `_sanitizeSignal(p.signal)` (wominds.html, ligne ~2603) —
ce n'est pas là que ça casse. Le nom "Scanner" a probablement été
utilisé par Thomas au sens large (les 3 boutons du bloc Signaux),
pas au sens strict du panneau "Scanner une entreprise".

**Corrigé et revérifié, cf. bandeau en tête de section.**

## Point 3 — "Historique des interactions" : même pattern qu'Item 0 ce matin, confirmé

> **CORRIGÉ (2026-09-13, option (b) — fusion complète, pas un reskin).**
> `_pdInteractionsHTML()` (l'ancienne carte "Historique des interactions")
> supprimée. `_pdMessageHistoryHTML()` remplacée par
> `_pdMessageHistorySectionHTML()` : une seule carte "Historique des
> messages", liste rendue par `_pdBuildMessageHistoryHTML()` (réécrite
> avec `.pd-row`/`.pd-row-mono`/`.pd-row-main`) dans `#pd-msghistory-rows`,
> suivie d'un `#pd-logint-form` masqué par défaut (`display:none`) révélé
> par un nouveau bouton `.pd-plus` "+ Log interaction"
> (`_pdToggleLogInteraction()`, copié du comportement demo-private.html:8860).
> Le formulaire lui-même (`int-type-btns`/`int-note-input`/`int-save-btn`)
> **n'a pas été touché**, seul son conteneur (masqué/révélé au lieu de
> toujours visible) a changé, conformément à l'instruction. `_saveInteraction()`
> et `_loadDrawerInteractions()` réutilisent `_renderDrawerInteractions()`
> (nom de fonction conservé, contenu repointé vers `#pd-msghistory-rows`)
> — aucun changement de schéma sur la table `interactions`.
>
> **Vérification réelle effectuée** (pas de navigateur disponible ici,
> donc vérification par exécution du code réel + écriture/lecture réelle
> en base, la plus proche possible d'un test en conditions réelles) :
> aucun prospect Wominds n'avait encore d'historique d'interactions réel
> en base au moment de vérifier (`0` lignes toutes fiches confondues) —
> deux interactions de test (`type: 'call'` puis `type: 'linkedin'`,
> notes explicitement marquées "Test de vérification Claude... à
> supprimer") ont été insérées pour de vrai sur la fiche réelle d'Audrey
> Hatton, via le même chemin d'écriture que `_saveInteraction()`
> (`client_id='wominds'`, `mandate_id: null`). Relues immédiatement après
> insertion et passées dans le code réel et actuel de
> `_pdBuildMessageHistoryHTML()` (extrait du fichier, pas réécrit à la
> main) : les deux lignes apparaissent bien, triées par date décroissante
> (la plus récente en premier), avec les classes `.pd-row`/`.pd-row-mono`/
> `.pd-row-main` correctement appliquées et les libellés attendus
> ("ENVOYÉ · LinkedIn", "NOTÉ · Appel"). Les deux lignes de test ont
> ensuite été supprimées de la base (`DELETE ... RETURNING id` confirmé,
> 2 lignes supprimées) — aucune trace laissée dans les données réelles de
> Wominds. Le comportement "sans rechargement" est garanti par lecture du
> code (`_saveInteraction()` fait
> `_drawerInteractions = [data, ..._drawerInteractions]; _renderDrawerInteractions();`
> en synchrone après l'insert, jamais de rechargement de page) — la seule
> partie non vérifiable sans navigateur est le rendu visuel final à
> l'écran, à confirmer par Thomas.

**Fonction identifiée** : `_pdInteractionsHTML()` (wominds.html, ligne
~4054, carte "Historique des interactions") + `_renderDrawerInteractions()`
(ligne ~4076, rendu de la liste elle-même) — bien distincte de
`openProspectDetail()` comme Thomas le supposait, mais aussi distincte de
`_pdMessageHistoryHTML()`/`_pdBuildMessageHistoryHTML()` (ligne ~3671 et
~3687, carte séparée "Historique des messages") : **wominds.html a deux
cartes séparées là où demo-private.html n'en a qu'une.**

**Comparaison directe avec demo-private.html** (lignes 8739-8753, section
"3. MESSAGE HISTORY" de `_drawerProfileHTML`) : dans la référence, il n'y
a **pas de section "Interactions" séparée** — une seule section
`.pd-section` intitulée "Message history" contient à la fois la liste
(`#pd-msghistory-rows`, rendue avec les classes `.pd-row`/`.pd-row-mono`/
`.pd-row-main`, citées dans l'extraction Company Intelligence pour un
usage différent mais définies au même endroit du CSS) et un formulaire
de log repliable (`#pd-logint-form`, masqué par défaut, révélé par un
bouton `.pd-plus` "+ Log interaction"). wominds.html a scindé ceci en
deux cartes toujours visibles (jamais de repli/masquage), et **aucune des
deux ne consomme les classes `.pd-row`/`.pd-plus`** :

- `_renderDrawerInteractions()` (ligne ~4084) : `<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">...` — styles en ligne, pas `.pd-row`.
- `_pdBuildMessageHistoryHTML()` (ligne ~3681) : `<div style="display:flex;align-items:center;gap:6px;">...` — styles en ligne, pas `.pd-row`/`.pd-row-mono`/`.pd-row-main`, alors que la structure (dir/canal à gauche, date à droite en `margin-left:auto`, texte tronqué à 160 caractères en dessous) reproduit quasi trait pour trait celle de demo-private.html qui, elle, utilise `.pd-row-mono`/`.pd-row-main`.
- Le bouton "+ Log interaction" (`.pd-plus`) n'existe pas côté wominds.html — le formulaire de log (`int-type-btns`/`int-note-input`/`int-save-btn`, ces classes-là bien partagées et fonctionnelles avec la référence) est **toujours visible**, jamais replié derrière un toggle.

**Verdict** : ni composant entièrement différent (la logique de données —
`interactions` table, mêmes types linkedin/email/call/meeting/note — est
la même), ni simple renommage — **même diagnostic qu'Item 0 ce matin**
(classes CSS `.pd-row`/`.pd-row-mono`/`.pd-row-main`/`.pd-plus` déjà
présentes dans la feuille de style depuis ce matin, jamais consommées
ici) plus une différence structurelle réelle (1 section unifiée et
repliable côté référence vs 2 cartes séparées et toujours visibles côté
wominds.html). **Corrigé et revérifié, cf. bandeau en tête de section.**

*Ajouté le 2026-09-13 (brief "diagnostic (pas de fix) sur 3 points
Scanner wominds.html"). Point 1 vérifié par appel réel au endpoint de
production ; points 2 et 3 par lecture directe et comparaison ligne à
ligne des deux fichiers, jamais par supposition. Mis à jour le même jour
(brief de correction) : les 3 points sont désormais corrigés, chacun
revérifié en conditions réelles (rejeu du texte réel capturé pour le
point 1 ; exécution du code réel avec le signal réel d'Audrey Hatton
pour le point 2 ; écriture/lecture réelles en base, nettoyées ensuite,
pour le point 3) — voir les bandeaux "CORRIGÉ" en tête de chaque section
ci-dessus pour le détail et la preuve.*
