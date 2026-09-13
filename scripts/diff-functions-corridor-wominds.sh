#!/usr/bin/env bash
# ============================================================
# DIFF DE FONCTIONS — demo-private.html vs wominds.html
#
# Adapte de diff-functions-corridor-kaizenology.sh (meme logique
# d'extraction/diff), pointe vers known-divergences-wominds.md pour
# garder les deux comparaisons (kaizenology / wominds) distinctes,
# comme demande dans le brief d'audit 2026-09-13.
# ============================================================

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILE_A="$DIR/demo-private.html"
FILE_B="$DIR/wominds.html"
KNOWN="$DIR/scripts/known-divergences-wominds.md"

extract_functions() {
  local file="$1"
  {
    grep -oE '^(async )?function[[:space:]]+_?[A-Za-z0-9]+[[:space:]]*\(' "$file" \
      | grep -oE '_?[A-Za-z0-9]+[[:space:]]*\($' | grep -oE '^[A-Za-z0-9_]+'
    grep -oE '^const[[:space:]]+_?[A-Za-z0-9]+[[:space:]]*=[[:space:]]*(async[[:space:]]*)?\(' "$file" \
      | grep -oE '_?[A-Za-z0-9]+[[:space:]]*=' | grep -oE '^[A-Za-z0-9_]+'
  } | sort -u
}

if [ ! -f "$FILE_A" ] || [ ! -f "$FILE_B" ]; then
  echo "ERREUR : demo-private.html et/ou wominds.html introuvable(s) depuis $DIR"
  exit 1
fi

TMP_A=$(mktemp)
TMP_B=$(mktemp)
extract_functions "$FILE_A" > "$TMP_A"
extract_functions "$FILE_B" > "$TMP_B"

ONLY_A=$(comm -23 "$TMP_A" "$TMP_B")
ONLY_B=$(comm -13 "$TMP_A" "$TMP_B")
COUNT_A=$(wc -l < "$TMP_A" | tr -d ' ')
COUNT_B=$(wc -l < "$TMP_B" | tr -d ' ')
COUNT_ONLY_A=$(echo "$ONLY_A" | grep -c . || true)
COUNT_ONLY_B=$(echo "$ONLY_B" | grep -c . || true)

is_known() {
  local name="$1"
  [ -f "$KNOWN" ] && grep -q "\`$name\`" "$KNOWN"
}

echo "============================================================"
echo "DIFF FONCTIONS — demo-private.html ($COUNT_A) vs wominds.html ($COUNT_B)"
echo "============================================================"
echo ""
echo "--- Presentes UNIQUEMENT dans demo-private.html ($COUNT_ONLY_A) ---"
NEW_A=0
while IFS= read -r name; do
  [ -z "$name" ] && continue
  if is_known "$name"; then
    :
  else
    echo "  ⚠ NOUVEAU : $name"
    NEW_A=$((NEW_A + 1))
  fi
done <<< "$ONLY_A"
[ "$NEW_A" -eq 0 ] && [ "$COUNT_ONLY_A" -gt 0 ] && echo "  (toutes deja triees dans known-divergences-wominds.md)"

echo ""
echo "--- Presentes UNIQUEMENT dans wominds.html ($COUNT_ONLY_B) ---"
NEW_B=0
while IFS= read -r name; do
  [ -z "$name" ] && continue
  if is_known "$name"; then
    :
  else
    echo "  ⚠ NOUVEAU : $name"
    NEW_B=$((NEW_B + 1))
  fi
done <<< "$ONLY_B"
[ "$NEW_B" -eq 0 ] && [ "$COUNT_ONLY_B" -gt 0 ] && echo "  (toutes deja triees dans known-divergences-wominds.md)"

echo ""
echo "============================================================"
TOTAL_NEW=$((NEW_A + NEW_B))
if [ "$TOTAL_NEW" -eq 0 ]; then
  echo "Aucune nouvelle divergence non triee. ($COUNT_ONLY_A + $COUNT_ONLY_B deja connues/documentees)"
else
  echo "$TOTAL_NEW nouvelle(s) divergence(s) non triee(s) -- a classer dans"
  echo "scripts/known-divergences-wominds.md comme 'A PORTER' ou 'DELIBERE' avant"
  echo "de considerer ce rapport clos. Ne bloque pas le deploiement --"
  echo "lecture manuelle requise."
fi
echo "============================================================"

rm -f "$TMP_A" "$TMP_B"
