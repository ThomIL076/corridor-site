#!/usr/bin/env bash
# ============================================================
# DIFF DE FONCTIONS — demo-private.html vs kaizenology.html
#
# Objectif : signaler toute fonction presente dans un fichier mais
# absente de l'autre, AVANT un deploiement -- pas de blocage
# automatique (pas d'historique de faux positifs pour l'instant),
# juste un rapport lu et confirme a la main.
#
# Extrait les noms de fonctions via :
#   - `function NomFonction(` / `async function NomFonction(`
#   - `const NomFonction = (...) =>` / `const NomFonction = async (...) =>`
#     (necessaire pour couvrir les quelques fonctions definies en const
#     arrow, ex: _senderBio -- "ou equivalent" de la demande initiale)
#
# Toute divergence deja triee (a porter / delibere) doit etre listee
# dans scripts/known-divergences.md pour que ce rapport arrete de la
# re-signaler -- tant qu'elle n'y est pas, elle apparait ici a chaque
# lancement.
# ============================================================

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILE_A="$DIR/demo-private.html"
FILE_B="$DIR/kaizenology.html"
KNOWN="$DIR/scripts/known-divergences.md"

extract_functions() {
  local file="$1"
  # Ancre en debut de ligne (^) : ne retient que les declarations de haut niveau (colonne 0),
  # pas les fonctions flechees/closures locales indentees a l'interieur d'une autre fonction --
  # sans cette ancre, le motif "const NOM = (...) =>" matchait aussi des variables locales
  # (ex: const dayNr = (...) => ..., a l'interieur d'une autre fonction), pur bruit pour ce rapport.
  {
    grep -oE '^(async )?function[[:space:]]+_?[A-Za-z0-9]+[[:space:]]*\(' "$file" \
      | grep -oE '_?[A-Za-z0-9]+[[:space:]]*\($' | grep -oE '^[A-Za-z0-9_]+'
    grep -oE '^const[[:space:]]+_?[A-Za-z0-9]+[[:space:]]*=[[:space:]]*(async[[:space:]]*)?\(' "$file" \
      | grep -oE '_?[A-Za-z0-9]+[[:space:]]*=' | grep -oE '^[A-Za-z0-9_]+'
  } | sort -u
}

if [ ! -f "$FILE_A" ] || [ ! -f "$FILE_B" ]; then
  echo "ERREUR : demo-private.html et/ou kaizenology.html introuvable(s) depuis $DIR"
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
echo "DIFF FONCTIONS — demo-private.html ($COUNT_A) vs kaizenology.html ($COUNT_B)"
echo "============================================================"
echo ""
echo "--- Presentes UNIQUEMENT dans demo-private.html ($COUNT_ONLY_A) ---"
NEW_A=0
while IFS= read -r name; do
  [ -z "$name" ] && continue
  if is_known "$name"; then
    : # deja triee, cf. known-divergences.md -- pas re-signalee en detail
  else
    echo "  ⚠ NOUVEAU : $name"
    NEW_A=$((NEW_A + 1))
  fi
done <<< "$ONLY_A"
[ "$NEW_A" -eq 0 ] && [ "$COUNT_ONLY_A" -gt 0 ] && echo "  (toutes deja triees dans known-divergences.md)"

echo ""
echo "--- Presentes UNIQUEMENT dans kaizenology.html ($COUNT_ONLY_B) ---"
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
[ "$NEW_B" -eq 0 ] && [ "$COUNT_ONLY_B" -gt 0 ] && echo "  (toutes deja triees dans known-divergences.md)"

echo ""
echo "============================================================"
TOTAL_NEW=$((NEW_A + NEW_B))
if [ "$TOTAL_NEW" -eq 0 ]; then
  echo "Aucune nouvelle divergence non triee. ($COUNT_ONLY_A + $COUNT_ONLY_B deja connues/documentees)"
else
  echo "$TOTAL_NEW nouvelle(s) divergence(s) non triee(s) -- a classer dans"
  echo "scripts/known-divergences.md comme 'A PORTER' ou 'DELIBERE' avant"
  echo "de considerer ce rapport clos. Ne bloque pas le deploiement --"
  echo "lecture manuelle requise."
fi
echo "============================================================"

rm -f "$TMP_A" "$TMP_B"
