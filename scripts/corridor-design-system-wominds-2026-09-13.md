# Parité visuelle — demo-private.html ↔ wominds.html (2026-09-13)

**Note préalable, importante :** le brief demandait d'étendre
`corridor-design-system-2026-09-09.md` avec une section wominds.html. Ce
fichier est introuvable — recherché dans `corridor-site/`, dans tout
`OneDrive/Bureau/` (y compris `Corridor DOCS/`), dans `Documents/alliance-grid-agent`
et `Documents/Alliance Grid/alliance-grid-agent`, et dans une recherche plus large
du système de fichiers utilisateur. Aucune trace. Je ne l'ai pas recréé de
mémoire (ça aurait été inventer son contenu Corridor/Kaizenology, contraire à
la règle de preuve réelle de ce brief) — ce document est donc un **nouveau
comparatif autonome demo-private.html ↔ wominds.html**, même méthodologie que
demandée (tokens puis composants puis structure du tiroir), mais sans la
colonne Kaizenology qui existait peut-être dans l'original. Si Thomas
retrouve le fichier original, ce contenu pourra y être fusionné.

---

## 0. État après portage (2026-09-13, brief "Portage parité wominds.html")

Ce document décrit l'état **avant** portage (sections 1-4 ci-dessous,
inchangées — gardées comme preuve de ce qui a été trouvé). Résumé de ce qui a
depuis été corrigé dans wominds.html, dans le même après-midi :

- **Section 1.3** : les 36 tokens listés comme absents (Groupe H +
  `--success-bg`/`--success-border`/`--danger-bg`/`--danger-border`/
  `--accent-bg`/`--accent-border`) sont maintenant tous présents dans
  wominds.html, valeurs identiques à la source, aucun renommé. **PORTÉ.**
  (Les 4 tokens `--agent-group-*` restent délibérément non consommés — pas
  d'écran Agents côté wominds.html, cf. section 1.3 originale — mais existent
  désormais dans `:root` pour rester disponibles si besoin futur, sans
  conséquence visuelle actuelle.)
- **Section 2, `.module-title`** : remplacé par la règle exacte de
  demo-private.html (`font-size:26px; font-weight:600; color:var(--ink);
  font-family:'Instrument Sans'`), y compris l'override mobile `≤760px`
  (21px). **PORTÉ.**
- **Section 3** : correction de comptage découverte pendant le portage — 4
  des 34 "classes" `.pd-*` citées pour demo-private.html étaient en réalité
  des `id`, donc **33 vraies classes**, pas 34 ; et les 12 "classes propres à
  wominds.html" étaient, elles aussi, toutes des `id` (aucune n'était une
  vraie classe CSS, ni une divergence de nom réelle). Chiffre correct : 29
  vraies classes `.pd-*` manquantes (33 moins les 4 déjà partagées) — **les
  29 sont maintenant portées** (règles CSS copiées à l'identique, 2 des 4
  classes déjà partagées — `.pd-link`/`.pd-empty` — corrigées pour matcher
  la référence exactement). **PORTÉ.**
- **Boîtes "AI Insight"/"Score Rationale"** et **barre d'actions
  persistante (`.pd-footer`, "Archiver")** : construites, cf.
  `known-divergences-wominds.md` section PORTÉ pour le détail — dépendaient
  directement des tokens du point ci-dessus.
- **Non touché par ce portage, toujours vrai** : l'écart de valeur des
  tokens `--sidebar-*` (section 1.2, toujours sans raison produit
  confirmée), et les composants non comparés en détail (`.btn-primary`,
  `.card-badge`, `.ai-box`, section 2 — toujours À TRIER).
- **Vérification visuelle en conditions réelles (fiche Audrey Hatton ou un
  prospect test) demandée par Thomas avant déploiement — pas faite depuis
  ce siège** (pas d'outil navigateur disponible ici) : le portage a été
  vérifié par lecture directe du code (structure, tokens, absence de
  duplication, écritures réelles), pas par un rendu visuel réel. À confirmer
  par Thomas à l'oeil avant de considérer ce chantier définitivement clos.

---

## 1. Tokens CSS (`:root`)

Extraction directe des deux blocs `:root { ... }` (demo-private.html:19,
wominds.html:25).

### 1.1 Identiques (échantillon — palette de base, ~30 tokens)

`--navy`, `--navy-mid`, `--navy-light`, `--blue`, `--blue-light`, `--bg`,
`--white`, `--border`, `--border-mid`, `--text`, `--muted`, `--dim`,
`--green*`, `--amber*`, `--red`, `--fill-accent`, `--drawer-width` (620px
dans les deux), `--radius-*` (6 tokens), `--btn-h-*` (3 tokens), `--fs-*`
(9 tokens), `--ink`, `--accent`, `--danger`, `--success` — valeurs
strictement identiques des deux côtés. Bonne nouvelle : la base de palette et
l'échelle typographique/radius/hauteur de bouton sont bien la même source,
pas une réinvention.

### 1.2 Tokens avec valeurs différentes (légitime si voulu — pas vérifié comme
tel, à confirmer avec Thomas)

| Token | demo-private.html | wominds.html |
|---|---|---|
| `--sidebar-bg` | `#0e1a2e` | `#12213f` |
| `--sidebar-accent` | `#2f6bff` | `#5B9CF6` |
| `--sidebar-label` | `rgba(255,255,255,.5)` | `#B7BFD6` |
| `--sidebar-sub` | `rgba(255,255,255,.72)` | `#EDEFF6` |

Aucun commentaire de code trouvé ni côté fichier justifiant cet écart comme
une identité de marque Wominds délibérée (contrairement à d'autres écarts de
ce document, sourcés). À vérifier avec Thomas/Élodie avant de trancher
DÉLIBÉRÉ ou À PORTER — visuellement, la sidebar Wominds est un bleu plus
clair/plus saturé que la sidebar Corridor (quasi-noire).

### 1.3 Tokens manquants côté wominds.html (dette confirmée)

- `--sidebar-hover` (`rgba(255,255,255,.06)` chez demo-private) — absent de
  wominds.html, mais **aucune règle CSS de wominds.html ne le référence non
  plus** (vérifié par recherche de `var(--sidebar-hover)` dans le fichier :
  0 occurrence) — absence cohérente, pas une référence cassée.

- **36 tokens du "Groupe H"** (neutres + paires sémantiques, introduits
  demo-private.html au commit du 6 septembre selon son propre commentaire de
  code) : `--text-strong`, `--text-body`, `--text-dim2`, `--text-muted2`,
  `--text-faint`, `--text-fainter`, `--text-ghost`, `--border-control`,
  `--rule`, `--rule-soft`, `--rule-faint`, `--surface-sunken`,
  `--border-hover`, `--status-live`, `--status-idle`, `--status-error`,
  `--positive`, `--positive-bg`, `--objection`, `--objection-bg`,
  `--bad-data`, `--bad-data-bg`, `--neutral-chip`, `--neutral-chip-bg`,
  `--fundraising`, `--fundraising-bg`, `--signals-purple`,
  `--signals-purple-bg`, `--agent-group-content`, `--agent-group-gtm`,
  `--agent-group-pipeline`, `--agent-group-hub`, **et aussi**
  `--success-bg`/`--success-border`/`--danger-bg`/`--danger-border`/
  `--accent-bg`/`--accent-border` (ces 6 derniers documentés dans
  demo-private.html comme servant spécifiquement le tiroir prospect —
  boîtes "AI Insight"/édition inline). **Zéro occurrence** de chacun de ces
  36 tokens dans wominds.html (vérifié un par un, `var(--nom-token)`) — donc
  pas des références cassées, mais un **vocabulaire de couleur entier jamais
  adopté**, pas seulement inutilisé par hasard.
  - `--agent-group-*` (4 tokens) : absence cohérente avec l'absence de
    l'écran Agents sur wominds.html (jamais construit, choix produit établi
    plus tôt cette session — "ne jamais inventer de contenu de marque pour
    les agents Wominds"). **DÉLIBÉRÉ pour ce sous-groupe.**
  - `--success-bg`/`--success-border`/`--danger-bg`/`--danger-border`/
    `--accent-bg`/`--accent-border` : cause directe et vérifiée de la
    divergence "AI Insight / Score Rationale" documentée dans
    `known-divergences-wominds.md` — ces tokens sont l'infrastructure CSS
    de ces boîtes, absente, donc la boîte elle-même ne peut pas exister
    sous la même forme. **À PORTER**, pas délibéré (aucun commentaire ne
    justifie l'omission spécifique de ce sous-groupe).
  - Les 26 tokens restants (texte/rule/status/signal génériques) :
    vocabulaire jamais adopté, cause probable d'un repli sur des couleurs
    en dur ou sur les tokens plus anciens (`--muted`, `--border`) plutôt que
    la palette la plus récente — **À TRIER**, pas assez de preuve pour dire
    si c'est un oubli ou un simple "pas encore eu besoin".

---

## 2. Composants partagés (même nom de classe)

| Composant | demo-private.html | wominds.html | Écart |
|---|---|---|---|
| `.card` | `border:1px solid var(--rule); border-radius:9px; padding:22px;` + `box-shadow:0 1px 2px rgba(14,26,46,.03)` | `border:1px solid var(--border); border-radius:var(--radius-lg)` (12px); `padding:24px;` **pas de box-shadow** | Radius différent (9px vs 12px), token de bordure différent (mais valeur quasi identique, `--rule` #e4e9f0 vs `--border` #e2e8f0), **ombre absente** côté wominds → rendu visiblement plus plat |
| `.section-sub` | `color:var(--text-muted2)` (#6b7a90, clair) | `color:var(--muted)` (#576185, plus sombre/saturé) | Le sous-titre de section est plus voyant/contrasté sur wominds que sur demo-private (censé être discret) |
| `.module-title` | `font-size:26px; font-weight:600; color:var(--ink); font-family:'Instrument Sans'` | `font-size:var(--fs-lg)` (18px); `font-weight:800; color:var(--navy); font-family:'Plus Jakarta Sans'` | **Écart le plus important trouvé dans ce document.** Le titre principal de chaque écran est ~30% plus petit, dans une police différente (Plus Jakarta Sans au lieu d'Instrument Sans), et navy au lieu de quasi-noir. |
| `.btn-primary`/`.btn-secondary` | non comparé en détail (hors budget de cette passe) | — | À TRIER |
| `.card-badge`/`.badge-*` | non comparé en détail | — | À TRIER |
| `.ai-box` | non comparé en détail | — | À TRIER |

**Sur `.module-title` :** les trois fichiers ont le même `body { font-family:
'Plus Jakarta Sans' }` de base (vérifié — Plus Jakarta Sans est la police de
corps partagée par les trois dashboards, pas une police "Kaizenology").
Ce qui diverge, c'est la couche de surcharge "Instrument Sans" que
demo-private.html applique à la plupart des titres/libellés (46 occurrences
du nom de police dans le fichier) — wominds.html ne l'a reprise que
partiellement (21 occurrences, kaizenology.html quasiment jamais, 1
occurrence). `.module-title` est un des endroits où wominds.html n'a pas
reçu cette surcharge et est resté sur le traitement Plus-Jakarta-Sans/navy,
plus proche du style pré-refonte (kaizenology) que du style actuel
demo-private.html. Comme `.module-title` est utilisé en tête de **chaque**
écran du dashboard, c'est probablement le contributeur le plus visible au
"déficit visuel" ressenti par Thomas, plus large que la seule fiche
prospect.

---

## 3. Structure du tiroir prospect — quelle version wominds.html a-t-elle clonée ?

Comptage direct des classes CSS déclarées, par fichier :

- **demo-private.html** : coquille `#drawer`/`.drawer-overlay` +
  `.drawer-head`/`.drawer-close`/`.drawer-section-title`/`.drawer-last-contact`
  (7 classes `.drawer-*`), et un vocabulaire de **contenu** riche et
  entièrement séparé : **34 classes `.pd-*`** (`.pd-header`, `.pd-stats`,
  `.pd-links`, `.pd-name`/`.pd-name-row`, `.pd-role`, `.pd-firmo`,
  `.pd-stage-chip`, `.pd-section-label`, `.pd-next-action-text`, `.pd-empty`,
  etc.)

- **kaizenology.html** : **pas** de vocabulaire `.pd-*` séparé — le même
  namespace `.drawer-*` couvre tout, contenu inclus (**24 classes
  `.drawer-*`**, dont `drawer-next-action`, `drawer-int-list`,
  `drawer-output`, `drawer-signal`, `drawer-escalate-btn`,
  `drawer-discovery-btn`...), plus un système d'onglets interne dédié,
  **`.dtab`/`.dtab-panel`** (2 classes), absent de demo-private.html.
  Architecture réellement différente de demo-private.html, pas juste un
  renommage.

- **wominds.html** : coquille `.drawer-*` alignée sur les deux références (12
  classes, dont les 7 partagées avec demo-private.html + `drawer-tabs`,
  `drawer-icon-btn`, comptage partiel côté kaizenology) — **mais seulement
  16 classes `.pd-*`**, dont **12 sont des noms inédits, absents des deux
  fichiers de référence** (`pd-drawer-name`, `pd-msghistory`,
  `pd-interactions-list`, `pd-reminder-input`, `pd-next-action-*`, etc. —
  construits cette session pour les nouvelles sections Interactions/Rappel/
  Conseil IA). Seulement **4 des 34 classes `.pd-*` de demo-private.html
  existent aussi côté wominds.html** — **30 sur 34 sont absentes.**

**Réponse à la question du brief :** wominds.html n'est un clone fidèle
d'aucune des deux références. Il reprend la coquille externe `.drawer-*`
(commune aux deux), mais son vocabulaire de contenu est une **troisième
version, partielle** : ni la richesse `.pd-*` de demo-private.html (16
classes contre 34, donc moins de la moitié), ni le système unifié +
onglets de kaizenology.html. Combiné aux tokens du Groupe H absents
(section 1.3, notamment `--accent-bg`/`--accent-border` qui alimentent les
boîtes "AI Insight" de `.pd-*` côté demo-private.html) et au `.module-title`
non aligné (section 2), ça explique techniquement et de façon vérifiable le
déficit visuel constaté entre la fiche Audrey Hatton (wominds.html) et la
fiche Daniel Lev (demo-private.html) : ce n'est pas un seul bug ponctuel,
c'est l'effet cumulé de trois couches de style (tokens de couleur, classes
de composant, classes de contenu du tiroir) partiellement portées plutôt
qu'entièrement clonées.

---

## 4. Composants propres à un seul fichier (aperçu, non exhaustif)

- **demo-private.html uniquement** : classes liées à Agents/Orchestration
  (`.agent-*`, absentes de wominds.html — cohérent avec l'absence
  délibérée de l'écran Agents), classes CRM avancées (`.crm-*`), momentum
  (`.momentum-dot*` — délibérément pas porté côté wominds.html non plus,
  cf. brief Pipeline 2026-09-12, données non disponibles pour la majorité
  des prospects Wominds encore "Identified").
- **wominds.html uniquement** : `.pipe-*` (bandeau stats + funnel du
  Pipeline, construit 2026-09-12, pas encore présent côté demo-private.html
  à cette date — sens inverse de divergence, wominds a une fonctionnalité
  que demo-private n'a pas encore).

Inventaire complet non fait dans cette passe (hors budget) — à approfondir
si Thomas veut une parité composant par composant exhaustive plutôt que le
ciblage "déficit visuel fiche prospect" de ce brief.

---

*Créé le 2026-09-13. Comparaison directe des fichiers réels
(`:root` extrait programmatiquement, classes comptées par regex sur les deux
fichiers, valeurs vérifiées ligne par ligne — aucune valeur reconstituée de
mémoire). Fichier original `corridor-design-system-2026-09-09.md` non
retrouvé — voir note en tête de document.*
