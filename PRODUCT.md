# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — clients acheteurs**
CEO ou Co-Founder d'une entreprise de 11 à 200 employés, dans l'AdTech, la Fintech ou le B2B SaaS, basée en Europe ou en Israël (priorité : France, Belgique, Pays-Bas, Israël). Ce fondateur veut un pipeline commercial prévisible sans recruter une équipe SDR complète. Il achète un système, pas un consultant.

**Secondaire — prospects en évaluation**
Même profil, en phase de découverte. Ils accèdent à une instance de démo personnalisée, pré-peuplée avec leurs propres prospects et données ICP, pour évaluer Corridor avant signature.

**Opérateur**
Thomas Dratler, solo founder. Livre, configure, et maintient chaque instance client. Toute communication externe et le design de l'interface parlent en "nous" — choix de positionnement assumé : Corridor est un système automatisé, pas un consultant solo.

## Product Purpose

Corridor est un GTM system complet : signal intelligence + outreach automatisé + pipeline dashboard + agents IA, installé et opérationnel en 3 à 4 semaines. Le produit résout le fait que la plupart des efforts commerciaux B2B sont fragmentés, manuels, et dépendants de la bande passante individuelle — le pipeline n'avance que si quelqu'un le pousse.

Succès = le client a un pipeline prévisible et autonome. Les signaux arrivent sans chercher, les séquences partent sans rédiger, le pipeline se met à jour sans pousser. L'opérateur améliore le système chaque mois à partir des données réelles du client.

## Positioning

Un système GTM complet livré en 3–4 semaines, qui tourne et s'améliore tout seul. Pas une agence SDR. Pas un consultant en retainer. Pas un outil SaaS à configurer soi-même.

Le mécanisme différenciant : signal intelligence + outreach automatisé + pipeline IA + 15 agents configurés pour la marque du client, sur une seule base de code, opérée par un partenaire unique qui connaît la stack et les données.

## Operating Context

**Architecture multi-instance**
`demo-private.html` est le template maître / sandbox privé de l'opérateur, jamais montré directement. À la signature, une copie est forkée pour devenir soit :
- une démo de vente personnalisée (prospect avec ses données pré-chargées), ou
- le produit livré au client (connecté à ses outils tiers, avec son `client_id` Supabase).

Architecture multi-instance : template maître demo-private.html, forké par client à la signature. Instances actives : Clémence, neurohagana. askelie et stern : relations closes, fichiers supprimés du repo.

**Modules du produit**
- **Module 01 · Signal Scanner** — ICP scoring, détection de signaux d'achat, intelligence société et contact via Claude AI. Modes ICP Scan et Free Search.
- **Module 02 · Outreach Generator** — séquences LinkedIn personnalisées (Invite + J+0), en EN / FR / NL.
- **Module 03 · CMO IA** — 11 agents spécialisés : CMO Orchestrator, Positioning Analyst, Content Strategist, Copywriter, Repurposing Engine, SEO & AEO, et 5 agents sales (Prospect, Objection Handler, Post-call, etc.).
- **Module 04 · Pipeline** — kanban 6 colonnes : Identified → 1st Contact → Engaged → Proposal → Negotiation → Closed. Drag-and-drop, drawer de prospect, rappels, historique d'interactions, scoring ICP.
- **Module 05 · Send** — file de messages à envoyer, avec aperçu et validation avant envoi.
- **Module 06 · Stats** — funnel analytique et distribution par secteur / région.
- **Module 07 · System** — modules d'automatisation (Pipeline Intelligence, Morning Scan, Weekly Report, Prospect Review, etc.) déclenchés via l'interface.

**Contexte d'usage quotidien**
Le client ouvre l'interface chaque matin : check pipeline + send queue + signaux. L'opérateur fait une revue mensuelle : refresh séquences, affinage ICP, nouvelles features.

**Bilingue**
L'interface bascule EN ↔ FR via un toggle. Tous les labels critiques portent `data-en` / `data-fr`.

## Capabilities and Constraints

- Stack : HTML/CSS/JS vanilla + Supabase (auth + BDD) + Vercel (serverless) + Claude AI (génération) + Langfuse (tracing) + Resend (email)
- PWA : manifests par instance, installable sur mobile
- Fichier unique : toute la logique UI est dans un seul `.html` par instance (~360 KB)
- Pas de framework front : pas de React, pas de Tailwind — CSS custom et JS vanilla natif
- Auth : Supabase email/password, gating par `client_id` en BDD
- Déploiement : Vercel, domaine canonical `corridor.systems`

**Indécidé**
- Tarification publique non confirmée (comparaison vs SDR agency visible sur la landing mais pas les prix exacts)
- Roadmap produit non documentée ici

## Brand Commitments

- **Nom** : Corridor
- **Tagline** : "More sales performance. Not more sales effort."
- **Sous-titre** : "GTM System"
- **Voix** : "nous" dans toute communication externe et UI — jamais "je". Confiant, direct, sans jargon VC.
- **Logo** : grille 2×2 de carrés arrondis — navy (#1a2b5e) aux coins diagonaux (1 et 4), bleu clair (#93A8D4) aux coins centraux (2 et 3).
- **Couleurs primaires** : Navy `#1a2b5e` (autorité, profondeur), Blue `#93A8D4` (accent, signal), fond `#f8f9fb` (app) / `#ffffff` (landing)
- **Typographie landing** : Geist + Geist Mono (sans-serif moderne, technique)
- **Typographie app** : Fraunces (serif display, titres) + Plus Jakarta Sans (UI, corps)
- **Domaine** : corridor.systems

## Evidence on Hand

- Site live : https://corridor.systems (index.html)
- App démo live : https://corridor.systems/demo-private.html (accès auth)
- Instances clients actives : manifests pour askelie, ibos, stern, clemence, neurohagana
- Page légale : privacy.html, privacy-fr.html, legal/sub-processors.html
- Pas de témoignages publics confirmés dans le repo — ne pas fabriquer

## Product Principles

1. **Le système tourne sans l'utilisateur.** Les signaux arrivent, les séquences partent, le pipeline se met à jour — le fondateur dirige, il ne pousse pas.
2. **Livré, pas vendu.** Corridor n'est pas un outil à configurer soi-même. Chaque instance est installée, testée, et opérationnelle par l'opérateur avant que le client y touche.
3. **Un seul partenaire connaît tout.** Signaux, outreach, pipeline, agents IA — même base, même opérateur, même données. Aucun silo, aucune intégration à maintenir soi-même.
4. **Les données du client améliorent le système.** Chaque revue mensuelle affine l'ICP, rafraîchit les séquences, et ajoute des features. Le système devient plus efficace dans le temps, pas juste maintenu.
5. **Voix de plateforme, pas de consultant.** Corridor parle en "nous" et se présente comme un système, même s'il est opéré par une seule personne. Le positionnement est assumé et tenu dans chaque point de contact.

## Accessibility & Inclusion

Aucune exigence WCAG formelle documentée. Interface bilingue EN/FR confirme un souci d'accessibilité linguistique. PWA confirme un besoin de compatibilité mobile. Focus rings absents à ce stade (constaté lors de l'audit — à corriger progressivement).
