#!/usr/bin/env bash
# ============================================================
# POINT D'ENTREE DE DEPLOIEMENT — Corridor
#
# Remplace l'appel direct a `vercel --prod --force` : enchaine
# systematiquement le deploiement, les smoke tests PUIS la verification que la prod sert bien le code deploye, pour que le
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
echo "ETAPE 1/3 — DEPLOIEMENT (vercel --prod --force)"
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
echo "ETAPE 2/3 — SMOKE TESTS (./smoke-tests-corridor.sh)"
echo "============================================================"

bash ./smoke-tests-corridor.sh
SMOKE_EXIT=$?

echo ""
echo "============================================================"
echo "ETAPE 3/3 — VERIFICATION : la prod sert-elle bien CE code ?"
echo "============================================================"
# Incident 2026-10-04 : apres un changement de variable d'environnement, un clic sur
# "Redeploy" dans le dashboard Vercel redeploie l'ANCIEN deploiement de prod tel quel. S'il
# arrive apres ce script, corridor.systems repasse silencieusement sur l'ancien code sans
# qu'aucun test ne le voie (les smoke tests passaient). Ici : on compare l'empreinte des pages
# servies par le domaine de prod a celle des fichiers locaux. Une difference = le domaine ne
# sert pas ce qu'on vient de deployer. Surchargeable : PROD_URL=https://... ./deploy.sh
PROD_URL="${PROD_URL:-https://corridor.systems}"
VERIFY_FILES=(demo-private.html kaizenology.html)

_sha() { if command -v sha256sum >/dev/null 2>&1; then sha256sum | cut -d' ' -f1; else shasum -a 256 | cut -d' ' -f1; fi; }

VERIFY_EXIT=0
VERIFY_DETAIL=""
for f in "${VERIFY_FILES[@]}"; do
  [ -f "$f" ] || continue
  LOCAL_SHA="$(_sha < "$f")"
  REMOTE_SHA=""
  # Jusqu'a 3 essais (propagation du domaine apres le deploiement)
  for attempt in 1 2 3; do
    REMOTE_SHA="$(curl -fsS --max-time 30 "$PROD_URL/$f?verify=$(date +%s)" 2>/dev/null | _sha)"
    [ "$REMOTE_SHA" = "$LOCAL_SHA" ] && break
    sleep 5
  done
  if [ "$REMOTE_SHA" = "$LOCAL_SHA" ]; then
    echo "  ✅ $f identique en prod"
  else
    echo "  ❌ $f DIFFERENT en prod (local ${LOCAL_SHA:0:12}…, prod ${REMOTE_SHA:0:12}…)"
    VERIFY_EXIT=1
    VERIFY_DETAIL="$VERIFY_DETAIL $f"
  fi
done
if [ "$VERIFY_EXIT" -ne 0 ]; then
  echo ""
  echo "  Le domaine ne sert PAS le code qui vient d'etre deploye. Cause probable : un autre"
  echo "  deploiement est arrive apres (ex. bouton Redeploy du dashboard Vercel, qui redeploie"
  echo "  l'ancien code). Relancer 'npm run deploy' SANS toucher a Redeploy ensuite."
fi

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
if [ "$VERIFY_EXIT" -ne 0 ]; then
  echo "  Prod = local : ❌ ECART ($VERIFY_DETAIL )"
else
  echo "  Prod = local : ✅ OK"
fi
echo "============================================================"

if [ "$DEPLOY_EXIT" -ne 0 ] || [ "$SMOKE_EXIT" -ne 0 ] || [ "$VERIFY_EXIT" -ne 0 ]; then
  exit 1
fi
exit 0
