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
