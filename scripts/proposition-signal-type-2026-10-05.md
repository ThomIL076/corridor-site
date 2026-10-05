# Proposition — hygiène de `signal_type` (audit persona QA du 05/10/2026)

Document de travail : **rien de ce qui suit n'est publié ni écrit en base**. Lecture seule faite le 05/10/2026 (SQL en lecture, workflows n8n lus par MCP).
Source des extraits de workflows : lecture directe des nœuds (Signal Backfill v1 `fx0EglQFgFR3MNVH`, Morning Scan Corridor `1bxEf0CFXFKlQaaS`).

## 1. Cause de « levée étiquetée expansion » (Hope Care, Spotable)

Deux causes cumulées dans **Morning Scan - Corridor** :

1. Deux classeurs par mots-clés identiques (`classifySignalType` dans `Extraire STAKEHOLDERS → Supabase`, `classifyMarketMentionSignalType` dans `Build Decision Prospects Upsert Body — Corridor`). Leur regex fundraising commence par `lev[ée]e|financement|…` : elle ne reconnaît pas « a levé » (masculin, un seul e). Le texte retombe ensuite sur la regex expansion. `Upsert Decision Prospects — Corridor` (merge-duplicates) écrase `signal_type` des fiches existantes.
2. Une règle de prompt (`Inject Audit 05-10 Rules — Corridor`, règle 4) dit l'inverse de la règle voulue : « Une levée accompagnée d'une expansion annoncée est un signal 'expansion', pas 'activite' ni 'engagement passif'. »

`Corridor - Signal Backfill v1` (juge Haiku) n'a, lui, **aucune** règle fundraising/expansion : seulement la liste `fundraising, hiring, expansion, leadership-change, activity`, sans liste blanche en sortie (`signal_type: found ? (parsed.signal_type || null) : null`).

## 2. Diff proposé (à valider avant toute publication n8n)

### 2.a Backfill v1 — nœud `Build Claude Judge Prompt` (juge), ligne de sortie et règle de priorité

```diff
-{"found": true or false, "signal_type": "one of: ${taxonomy.join(', ')}, only if found", ...}
+{"found": true or false, "signal_type": "exactly ONE value among: ${taxonomy.join(' | ')}, only if found", ...}
+
+SIGNAL TYPE RULES (choose ONE value, never a list or a comma-separated pair):
+- 'fundraising' if the CENTRAL fact of the signal is a funding round (the company raised / secured / closed funding: seed, series, round),
+  EVEN IF the funds are earmarked for an expansion, hiring or a new market. The use of proceeds never changes the type.
+- 'expansion' ONLY for an office / market / product opening where a funding round is NOT the central fact.
+- A round mentioned as background ("has raised $108M to date", "following its Series B in April") does NOT make the signal 'fundraising'.
+- 'leadership-change' = appointment, departure or succession of a senior executive. 'hiring' = job posting / recruiting push.
```
(la règle ne s'applique qu'à la taxonomie de Corridor, qui contient `expansion` ; pour Kaizenology et Wominds, garder leurs taxonomies, `fundraising` y existe déjà pour Kaizenology.)

### 2.b Backfill v1 — nœud `Parse Judgment` (garde-fou d'écriture, corrige aussi les types composés)

```diff
-signal_type: found ? (parsed.signal_type || null) : null,
+signal_type: (() => {
+  if (!found || !parsed.signal_type) return null;
+  const PRIORITY = ['fundraising','leadership-change','hiring','expansion','activity'];   // taxonomie du client courant (la meme que le prompt)
+  const parts = String(parsed.signal_type).toLowerCase().split(/[,;/|]/).map(x => x.trim()).filter(x => taxonomy.includes(x));
+  return parts.length ? (PRIORITY.find(p => parts.includes(p)) || parts[0]) : null;   // jamais de valeur composee ni hors taxonomie
+})(),
```

### 2.c Morning Scan — les deux classeurs, regex fundraising

Remplacer la première ligne de chaque classeur (`if (/lev[ée]e|financement|…/.test(t)) return 'fundraising';`) par :

```js
const RAISE = /(?<![\p{L}])(?:a|ont|vient de|viennent de)\s+lev[ée](?![\p{L}])|(?<![\p{L}])lev[ée]e\s+de\s+fonds|(?<![\p{L}])raise[sd]?\s+(?:[$€£]|\d|us\$|usd|eur|chf|sar)|(?<![\p{L}])secured\s+[^.]{0,40}(?:funding|round|capital)(?![\p{L}])|(?<![\p{L}])closed\s+(?:a\s+)?[^.]{0,25}\b(?:round|series [a-e])\b/iu;
const FUND_LOOSE = /(?<![\p{L}])lev[ée]e(?![\p{L}])|financement|s[ée]rie [a-e]\b|series [a-e]\b|seed round|funding round|capital lev[ée]|investisseurs|closes? (a )?round|tour de table/iu;
const CTX_BEFORE = /(to date|in total|au total|à ce jour|following|after|funded by|financé par|suite à|citing|has raised over)[\s\S]{0,40}$/iu;
const m = FUND_LOOSE.exec(t);
if (RAISE.test(t) || (m && !CTX_BEFORE.test(t.slice(0, m.index + m[0].length)))) return 'fundraising';
```
(`\b` ne gère pas « é » en JavaScript : d'où les `(?<![\p{L}])`. La regex `rais(e|ing|ed)\s` trop large est retirée.)

### 2.d Morning Scan — règle de prompt 4 (`Inject Audit 05-10 Rules — Corridor`)

```diff
-4. Une levée accompagnée d'une expansion annoncée est un signal 'expansion', pas 'activite' ni 'engagement passif'.
+4. Une levée de fonds (fait central : « a levé X … ») est un signal 'fundraising', même si les fonds financent une expansion ; 'expansion' = ouverture de bureau/marché/produit sans levée comme fait central. Une levée citée en contexte (« a levé 108M à ce jour », « suite à sa série B ») ne change pas le type.
```

### 2.e Test hors ligne du classeur proposé (21 textes réels, client `thomas`)

Script : `classify_test.js` (scratchpad de la session, reproduit ci-dessous en résultat). « Actuel » = classeur Morning Scan modélisé avec la regex en place.

| société | type en base | classeur actuel | classeur proposé |
|---|---|---|---|
| Falak / Sirdab (levée d'un tiers) | activity | fundraising | fundraising |
| Capchase (facilité de financement) | activity | activity | activity |
| Eagle Street (financement d'acquisition) | activity | expansion | expansion |
| Hutility / Outpost (levée d'un tiers) | activity | fundraising | fundraising |
| Antares | activity | fundraising | fundraising |
| **Hope Care** | expansion | activity | **fundraising** |
| **Spotable** | expansion | expansion | **fundraising** |
| HULO (seed d'octobre 2025 en contexte) | expansion | fundraising | activity |
| Reducto (« has raised over $108M to date ») | expansion | fundraising | activity |
| Bug Bounty Switzerland (CHF 12M au printemps) | expansion | fundraising | expansion |
| Omnichat (A+ en cours) | expansion | activity | activity |
| PALMONAS (« following … Series B in April ») | expansion | fundraising | expansion |
| DRIVN (MoU de leasing) | expansion | activity | activity |
| **Sona** | expansion | fundraising | **fundraising** |
| Thermosphr / ThinkWell / Improvado | hiring | hiring | hiring |
| Amperecloud, Backops | hiring | fundraising | hiring |
| neonVest | hiring | fundraising | activity |
| StormHarvester | leadership-change, expansion | leadership-change | leadership-change |

Limites : le classeur proposé retire les faux « fundraising » de contexte (Reducto, HULO, PALMONAS, BugBounty, Amperecloud, Backops) ; HULO et Reducto retombent sur « activity » parce que la regex expansion existante ne connaît pas `expand`/`opened` (écart préexistant, hors périmètre ; ajout possible : `expand(s|ed|ing)?\b|opened (a|its|in)`). Le classeur ne voit que le texte : il ne distingue pas une levée de la société du prospect d'une levée d'un tiers (Falak/Sirdab, Hutility/Outpost).

## 3. Étape A — listes (lecture seule) et classement

Constats préalables :
- La préférence apprise n'existe que pour `thomas` : `learned_preferences.deprioritized_types = ['fundraising','keyword-match']` (généré le 28/09/2026). **Kaizenology et Wominds n'ont aucune préférence apprise** : re-typer leurs fiches ne changerait aucun classement.
- Chiffres relevés (non archivées, hors Wominds, regex « levée » stricte) : thomas = 21 fiches (activity 5, expansion 9, hiring 6, dont 1 type composé) ; kaizenology = 41 lignes, dont ~19 faux positifs « firmographic-match » (le critère de recherche contient le mot « fundraising »), 7 « keyword-match » (mot-clé « capital raising », simple engagement LinkedIn) et ~20 lignes orphelines à société et nom NULL (voir plus bas).

### thomas (21)

| id | société | type | ICP | extrait | classement |
|---|---|---|---|---|---|
| 86deb9e7-2cc0-4d1b-8c62-561b90f73268 | Hope Care | expansion | 8 | « a levé 6M€ le 15 septembre 2026 pour étendre son suivi médical… » | **vraie levée** |
| d8164d90-d13d-4ab6-938b-f2789a3d78b8 | Spotable | expansion | 8 | « a levé 4M€ le 29 septembre 2026 pour étendre son activité… » | **vraie levée** |
| 82982207-1a68-4a75-92ee-e41a1524bd35 | Sona | expansion | 6 | « raised $45M Series B funding led by N47, supporting US expansion » | **vraie levée** |
| fd94910d-fa7a-4037-b4fc-a7bb53a22485 | Antares | activity | 6 | « secured $1B+ in contracts … and raised $470M Series C recently » | vraie levée (mixte : contrats + levée, levée récente) |
| 14273661-eefc-4573-b92c-fd64b68c05e5 | Falak (signal sur Sirdab) | activity | 7 | « Sirdab raises SAR 37.5M Series A… » | **à trancher** : levée d'un tiers (société ≠ prospect) |
| 618780ad-8128-406c-9d48-0e687328f3f8 | Hutility (signal sur Outpost) | activity | 6 | « Outpost has raised $17.5M in Series A… » | **à trancher** : levée d'un tiers |
| a64d4b65-b9ed-4bb2-ace2-631f3cc5a969 | HULO | expansion | 7 | « plans to expand into LatAm… funded by €2.3M seed closed October 2025 » | contexte (garder expansion) |
| d72f9eb8-42cc-4c2e-872e-cdf43d15db88 | Reducto | expansion | 7 | « opened a New York City office… has raised over $108M to date » | contexte |
| ef3297a0-91a4-4180-aee5-1204e0e44e19 | Bug Bounty Switzerland | expansion | 6 | « rebranded… CHF 12M raised in spring 2026 for international expansion » | contexte |
| b8bb6d53-4496-4a5b-b016-001fef6d7b8c | Omnichat | expansion | 6 | « plans to expand… is in A+ round fundraising » | contexte (levée en cours, non conclue) |
| 747172ad-a667-4b21-a37a-c251acc25721 | PALMONAS | expansion | 6 | « targeting 10 Gulf stores… following ~$40M Series B in April 2026 » | contexte |
| 773d88d5-69fa-499c-a3c5-604ed4b0931b | DRIVN | expansion | 6 | MoU de leasing/financement de camions | faux positif |
| 8c03e5f5-fde2-4f85-b100-9ffb67eb7a51 | Backops Ai | hiring | 6 | « job listing… after Series A funding round » | contexte |
| d37debb1-c622-4679-8c51-0292908a738c | Improvado | hiring | 6 | « role, citing $34M raised » | contexte |
| fe31068f-1b55-4115-9927-95c67927c48e | Amperecloud | hiring | 6 | « intern supporting fundraising materials » | faux positif |
| 844c59c8-d0f8-4d57-a0ff-f4dc47528d7d | Thermosphr | hiring | 7 | « Head of Finance… investor reporting, financing » | faux positif |
| 14a41c3d-7a5f-4cf3-bb29-27dbd374880c | ThinkWell | hiring | 6 | « Director Health Financing » | faux positif |
| 33a19253-1620-4d7b-8fc0-2a2ac80c0aab | neonVest | hiring | 6 | « Investor Relations… fundraising operations » | faux positif |
| d3c5e545-a093-414d-94de-9707447dac19 | Capchase | activity | 7 | facilité de financement 5M$ | faux positif |
| 532890f0-bb68-4ea7-9475-53d806f0f013 | Eagle Street Partners | activity | 6 | financement d'acquisition 82,6M£ | faux positif |

**Proposition pour l'étape C (non exécutée)** : re-typer en `fundraising`, par id, uniquement les 4 « vraies levées » : Hope Care, Spotable, Sona, Antares. Falak et Hutility : à votre arbitrage (levée d'un tiers). Aucun toucher à `icp_score` ni `icp_reason`. Effet attendu : ces 4 fiches passent sous la préférence apprise (`effective_signal_strength` = 0), donc plus basses dans Today (Hope Care et Spotable sont à ICP 8).

### kaizenology (recommandation : ne rien re-typer)

Aucune préférence apprise, et la taxonomie propre à Kaizenology (conseil en levée de fonds / M&A) utilise `live-transaction` pour une opération en cours. Lignes réellement concernées par une levée : Letter AI (activity, 8, « raised $40M Series B »), Seasats (« Raised funding · February 2026 »), Aimer Farming (« Raised funding · May 2026 »), tZERO (round annoncé, conditionnel), Nauta ×3 (« closed a strategic raise… now targeting a $20-30M Series A »), Astra Space (« seeking $250M »). Levées en contexte : Bretton AI, Homebound. Faux positifs : 19 `firmographic-match` (critère de recherche contenant « fundraising »), 7 `keyword-match` (« capital raising »), Metrikflow, Sonas Pharma.
**Anomalie de données à part** : ~20 lignes `live-transaction` à société et nom NULL partagent le même signal « Appointed CEO of Practo… exploring a $100-125M pre-IPO funding round » (doublons orphelins probables du Live Transaction Detector) ; à examiner séparément.

## 4. Étape D — parité vue SQL / miroir navigateur

`prospects_effective` : `signal_deprioritized = signal_type IS NOT NULL AND lp.deprioritized_types @> to_jsonb(signal_type)` ; ligne `learned_preferences` la plus récente (`mandate_id IS NULL`, `agent_name='signal_interpretation'`). Miroir navigateur `_effectiveSignalStrength` : `_deprioTypes.has(p.signal_type)` avec la même ligne. Même règle (correspondance exacte sur `signal_type`) : **rien à changer**. Conséquence directe : une valeur composée (« leadership-change, expansion ») ou hors taxonomie contourne la préférence, d'où le garde-fou 2.b.

## 5. Point 3a — `signal_type` composé

- Fiche `thomas` : **StormHarvester / Brian Moloney** (`5cb0619c-8d0c-4acc-a40e-87f3a5f4a99a`, ICP 8) : « appointed Greg Brazeau as VP North America… active US/Canada expansion ». Type principal d'après le texte : `leadership-change` (nomination = fait central).
- Fiche `kaizenology` (hors demande, même défaut) : **LogicGate / Matt Kunkel** (`956f8d20-3de7-42cd-bf85-96faeb8b9d9c`, ICP 1) : « leadership-change, activity » → `leadership-change`.
- Écrivain : **Corridor - Signal Backfill v1** (`Parse Judgment` recopie `parsed.signal_type` sans liste blanche ; le prompt dit « one of: fundraising, hiring, expansion, leadership-change, activity » et le modèle recopie deux valeurs). La fiche StormHarvester a été créée le 04/10 03:00 UTC par Apollo Prospect Discovery avec un type de « bucket » puis modifiée le 05/10 06:26 UTC, ce qui colle avec un passage du Backfill (cause non confirmée par l'historique d'exécution).
- Garde-fou proposé (rien appliqué) : (1) `Parse Judgment` 2.b (liste blanche + priorité fixe) ; (2) optionnel, DDL à valider : `ALTER TABLE prospects ADD CONSTRAINT prospects_signal_type_check CHECK (signal_type IS NULL OR signal_type !~ '[,;|]')` (n'interdit que les valeurs composées ; une liste blanche stricte est impossible tant que chaque client a sa taxonomie : `headcount_growth`, `active_hiring`, `firmographic-match`, `keyword-match`, `live-transaction`, `buy-side`… coexistent).
- Aucun CHECK n'existe aujourd'hui sur `signal_type` (`prospects_origin_check`, `prospects_stage_check`, `prospects_linkedin_tag_check` existent).

## 6. Point 3b — autres funnels présentés comme conversion

| Endroit | Ce qui est affiché | État / action |
|---|---|---|
| demo-private, Pipeline, carte funnel | effectifs par étape actuelle | titre « Répartition actuelle » déjà posé (e1c14ce) |
| kaizenology, wominds, phci-demo : `#pipe-funnel-bar` | mêmes effectifs par étape actuelle | **libellé « Répartition actuelle » ajouté** (ce lot) |
| `#stats-funnel` (onglet Stats hérité) : kaizenology, lka-demo, yellowwood-demo, partner-demo, phci-demo-p2test (+ variantes p2test) | barres « Pipeline Funnel » = effectifs par étape actuelle | **légende « Répartition actuelle » ajoutée** (ce lot) ; le titre de carte « Pipeline Funnel » est inchangé |
| demo-private, Système > santé du pipeline, « Stage conversion » (`_loadStageConversion`) | déjà **cumulatif** (« a atteint au moins l'étape » = rang d'étape actuel ≥ étape) vs cibles `conversion_targets` | correct mais approximatif : exclut les fiches archivées (3 962 `Archived` pour thomas) qui ont perdu leur étape maximale |
| « While you were away » (`_loadTodayStats`) | signaux du jour, messages rédigés, envoyés, en attente : aucune notion d'étape | rien à faire |
| Ask Corridor, snapshot pipeline (`By stage: …`) | effectifs bruts par étape, libellé « By stage » | correct |
| E-mail Morning Scan (n8n) | non vérifié dans le dépôt : à relire dans les workflows (je n'ai pas inspecté ce nœud) | à vérifier avec vous |

Pour un vrai cumulatif « a atteint au moins l'étape » : `prospects.last_tracked_stage` n'est **pas** un historique (valeurs identiques à `stage` dans 99,5 % des cas pour thomas, 100 % pour kaizenology ; c'est le dernier état vu, pas l'étape maximale). Il n'existe pas d'historique d'étapes fiable : le seul calcul honnête reste « étape actuelle ≥ étape », avec libellé, ce que fait déjà `_loadStageConversion`. **Je n'ai pas codé de cumulatif** (décision avant).

## 7. Backfill du pays (proposition, rien exécuté)

Fiches thomas non archivées, ICP ≥ 7, `country` NULL ou vide : **25** (6 NULL + 19 chaînes vides ; 2 958 fiches ICP ≥ 7 au total). Latitude a déjà `country_code='US'` : la carte l'affiche désormais via Intl (aucun UPDATE nécessaire). Pour les autres :
1. Source fiable, par ordre : Apollo `organizations_enrich` (domaine ou nom de société, renvoie le pays du siège) ou FullEnrich `search_companies` ; ~25 appels, coût en crédits à annoncer avant de lancer.
2. À éviter : déduire du texte du signal (« Allemagne et Roumanie » pour Hope Care = pays visés par l'expansion, pas le siège).
3. Écriture : `UPDATE prospects SET country = …, country_code = … WHERE id = …` par id, journal avant/après, uniquement après votre validation.
