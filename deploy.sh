#!/usr/bin/env bash
# ============================================================
# POINT D'ENTREE DE DEPLOIEMENT — Corridor
#
# Remplace l'appel direct a `vercel --prod --force` : enchaine
# systematiquement le deploiement PUIS les smoke tests, pour que le
# test ne puisse plus etre oublie separement du deploiement lui-meme
# (roadmap "empecher la recurrence", point 5, 2026-09-10).
#
# Pas un vrai pipeline CI/CD (GitHub Actions non configure ici) --
# juste un wrapper local qui rend l'enchainement systematique. Aucun
# rollback automatique : un echec de smoke test est signale de facon
# impossible a manquer (exit code non-zero + bloc bien visible), mais
# ne defait rien -- decision manuelle ensuite.
# ============================================================

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "============================================================"
echo "ETAPE 1/2 — DEPLOIEMENT (vercel --prod --force)"
echo "============================================================"

vercel --prod --force
DEPLOY_EXIT=$?

echo ""
if [ "$DEPLOY_EXIT" -ne 0 ]; then
  echo "============================================================"
  echo "❌ DEPLOIEMENT ECHOUE (exit code $DEPLOY_EXIT) -- smoke tests lances"
  echo "quand meme ci-dessous pour verifier l'etat de la prod actuelle,"
  echo "mais ils portent sur l'ANCIEN deploiement, pas le nouveau."
  echo "============================================================"
else
  echo "============================================================"
  echo "✅ DEPLOIEMENT OK -- lancement des smoke tests"
  echo "============================================================"
fi

echo ""
echo "============================================================"
echo "ETAPE 2/2 — SMOKE TESTS (./smoke-tests-corridor.sh)"
echo "============================================================"

bash ./smoke-tests-corridor.sh
SMOKE_EXIT=$?

echo ""
echo "============================================================"
echo "RESUME"
echo "============================================================"
if [ "$DEPLOY_EXIT" -ne 0 ]; then
  echo "  Déploiement : ❌ ECHEC (exit $DEPLOY_EXIT)"
else
  echo "  Déploiement : ✅ OK"
fi
if [ "$SMOKE_EXIT" -ne 0 ]; then
  echo "  Smoke tests : ❌ ECHEC (exit $SMOKE_EXIT) -- voir le detail plus haut"
else
  echo "  Smoke tests : ✅ OK"
fi
echo "============================================================"

if [ "$DEPLOY_EXIT" -ne 0 ] || [ "$SMOKE_EXIT" -ne 0 ]; then
  exit 1
fi
exit 0
