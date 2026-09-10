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
