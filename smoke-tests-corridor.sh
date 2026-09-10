#!/usr/bin/env bash
# ============================================================
# SMOKE TESTS POST-DÉPLOIEMENT — Corridor, P1.3
# À lancer après tout déploiement touchant l'authentification,
# le RLS, ou un workflow critique (scoring, Morning Scan, outreach).
#
# Ne remplace pas un test manuel complet — c'est un filet de
# sécurité rapide (quelques minutes), pas une suite exhaustive.
# ============================================================

set -uo pipefail

SUPABASE_URL="https://oanokmugroiahtgcecbn.supabase.co"
ANON_KEY="sb_publishable_2EjvzlNU58xml_Q6lqt9IQ_2jWeGvmQ"

# Compteur d'echecs reels (pas les warnings ⚠, juste ce qui est sans ambiguite casse) --
# ajoute pour que deploy.sh puisse detecter un echec via le code de sortie plutot que de
# parser la sortie texte. Auparavant ce script imprimait toujours des infos, jamais un
# verdict machine-lisible -- exit 0 quoi qu'il arrive.
FAILED=0

echo "============================================================"
echo "SMOKE TESTS — $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"

# ------------------------------------------------------------
# TEST 1 — Fraîcheur des workflows critiques (workflow_health)
# Détecte un cron silencieusement cassé sans attendre l'alerte
# Health Watchdog (qui ne se déclenche qu'après 26h de silence).
# ------------------------------------------------------------
echo ""
echo "--- TEST 1 : Fraîcheur workflow_health (workflows critiques) ---"

CRITICAL_WORKFLOWS=(
  "Morning Scan — Corridor"
  "Morning Scan — Kaizenology"
  "Corridor - Auto ICP Scoring v1"
  "Corridor - Auto ICP Scoring v1 - kaizenology (multi-mandat)"
  "Trigify Signal Sync v1"
  "Corridor - Auto Invitations LinkedIn v1"
)

for wf in "${CRITICAL_WORKFLOWS[@]}"; do
  # Fix 2026-09-10 : python3 resout vers un stub Windows Store sur Git Bash/Windows (exit non-zero,
  # message d'erreur -- pas un vrai interpreteur), donc le fallback `|| echo "$wf"` se declenchait
  # en silence et envoyait le nom de workflow BRUT (espaces + tiret cadratin non encodes) dans
  # l'URL -- curl echouait purement et simplement (HTTP_STATUS:000), jamais une vraie reponse
  # PostgREST. node est deja une dependance confirmee de ce repo (deploy.sh, autres scripts) et
  # fonctionne de facon fiable ici, contrairement a python3 -- plus de fallback silencieux errone.
  encoded=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$wf")
  result=$(curl -s "$SUPABASE_URL/rest/v1/workflow_health?workflow_name=eq.$encoded&select=last_success_at" \
    -H "apikey: $ANON_KEY")
  # Detection d'erreur ajoutee (trouve en test le 10/09 : la reponse etait un objet d'erreur
  # PostgREST -- {"code":"42501",...} GRANT manquant sur workflow_health pour le role anon --
  # et ce test l'imprimait tel quel sans jamais le signaler comme un echec, silencieux depuis
  # une duree indeterminee).
  if echo "$result" | grep -q '"code"'; then
    echo "  $wf : ❌ ERREUR REQUETE -- $result"
    FAILED=$((FAILED + 1))
  elif [ -z "$result" ] || [ "$result" = "[]" ]; then
    # 2026-09-10 : GRANT confirme present sur cette table (verifie par Thomas), donc un [] silencieux
    # (200 OK, zero ligne, meme sans filtre de nom du tout) pointe vers RLS actif sans policy SELECT
    # pour anon plutot que vers un GRANT manquant -- les deux causes ont des symptomes differents
    # (42501 = GRANT, [] = RLS) mais le meme effet visible ici. Verifier : SELECT * FROM pg_policies
    # WHERE tablename = 'workflow_health';
    echo "  $wf : ⚠ Aucune ligne retournee (workflow jamais execute, nom desynchronise, ou policy RLS manquante pour anon malgre un GRANT correct)"
  else
    echo "  $wf : $result"
  fi
done

echo ""
echo "  ATTENDU : last_success_at récent (dans la fenêtre attendue de"
echo "  chaque workflow — quelques heures pour les crons fréquents,"
echo "  24h pour les crons quotidiens). Un last_success_at ancien ou"
echo "  absent = cron silencieusement cassé, à investiguer avant de"
echo "  considérer le déploiement sûr."


# ------------------------------------------------------------
# TEST 2 — RLS scoping par client (réutilise le script dédié)
# ------------------------------------------------------------
echo ""
echo "--- TEST 2 : RLS scoping par client ---"
echo "  Ce test nécessite une authentification réelle par client."
echo "  Lance séparément : bash test-rls-adversarial.sh"
echo "  (non inclus ici pour éviter de redemander les mots de passe"
echo "  à chaque smoke test — à faire à minima après tout changement"
echo "  touchant l'auth ou les policies RLS, pas après chaque déploiement)"


# ------------------------------------------------------------
# TEST 3 — Endpoints API critiques répondent
# ------------------------------------------------------------
echo ""
echo "--- TEST 3 : Endpoints Vercel critiques ---"

# expected="" (vide) : affiche juste le code, pas de verdict (garde l'ancien comportement
# pour un appel sans attente precise). expected="401" etc. : compare et incremente FAILED
# sur mismatch -- c'est ce qui permet a deploy.sh de detecter un vrai echec via l'exit code
# plutot que de faire relire le texte a chaque fois.
check_endpoint() {
  local url="$1"
  local label="$2"
  local expected="${3:-}"
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$url" \
    -H "Content-Type: application/json" \
    -d '{}' --max-time 10)
  if [ -z "$expected" ]; then
    echo "  $label : HTTP $status"
  elif [ "$status" = "$expected" ]; then
    echo "  $label : HTTP $status ✅ OK"
  else
    echo "  $label : HTTP $status ❌ FAIL (attendu $expected)"
    FAILED=$((FAILED + 1))
  fi
}

check_endpoint "https://corridor.systems/api/workflow-proxy?action=icp-score-batch" "workflow-proxy (icp-score-batch, sans auth)" "401"
# Attendu : 401 (pas 500) -- confirme que l'endpoint est vivant ET
# que la vérification d'auth fonctionne (rejette une requête sans token).

echo ""
echo "  ATTENDU pour workflow-proxy sans auth : HTTP 401 (pas 500,"
echo "  pas de timeout). Un 500 indiquerait un crash serveur, pas"
echo "  juste un rejet d'auth normal."

# Ajoutes le 10/09 : chemins J+5 touches par les fixes du jour (_generateSequenceMessage,
# _startEmailSeq/_bulkStartEmailSeq) -- ni l'un ni l'autre n'avait de check dedie jusqu'ici.
# Ni /api/generate ni /api/email-send n'ont de garde d'auth (pas de token attendu, contrairement
# a workflow-proxy) : un corps vide suffit a distinguer "vivant et repond correctement a une
# requete invalide" de "crash serveur" ou timeout, sans consommer de credit Anthropic/Smartlead
# (aucun des deux ne va jusqu'a l'appel externe reussi avec un payload vide).
echo ""
check_endpoint "https://corridor.systems/api/generate" "generate (utilise par _generateSequenceMessage, corps vide)" "502"
echo "  ATTENDU pour generate avec corps vide : HTTP 502 (Anthropic rejette 'messages'"
echo "  vide, relaye tel quel) -- pas 500 (crash de la fonction Vercel elle-meme, ex:"
echo "  cle Langfuse/Anthropic manquante) ni timeout."

echo ""
check_endpoint "https://corridor.systems/api/email-send" "email-send (utilise par _startEmailSeq/_bulkStartEmailSeq, corps vide)" "400"
echo "  ATTENDU pour email-send avec corps vide : HTTP 400 ('email required',"
echo "  cf. api/email-send.js) -- pas 500 ni timeout."


# ------------------------------------------------------------
# TEST 4 — Rappel manuel (non automatisable simplement)
# ------------------------------------------------------------
echo ""
echo "--- TEST 4 : Vérifications manuelles restantes ---"
echo "  Ce script ne peut pas vérifier automatiquement :"
echo "  - Absence d'erreur console sur les 6 fichiers dashboard"
echo "    (ouvrir chaque fichier, F12, onglet Console, vérifier)"
echo "  - Rendu visuel correct après un changement CSS/HTML"
echo "  - Scanner répond avec un vrai résultat (pas juste HTTP 200)"
echo "  Ces trois points restent à vérifier à l'oeil après tout"
echo "  déploiement touchant le frontend."
echo ""
echo "  Ajoutés le 10/09 (fixes J+5 du jour, état client-side pur -- aucun moyen de"
echo "  les couvrir en bash/curl, nécessitent un navigateur réel) :"
echo "  - Send (demo-private.html) : Generate sur un J+5 standard passe bien par le"
echo "    chemin IA complet (spinner + 'Researching...' visible), plus de rendu"
echo "    instantané sans requête -- régression possible si _generateSequenceMessage"
echo "    est retouchée sans relire le fix du court-circuit statique retiré."
echo "  - Send : générer un J+5, cliquer Mark ready, vérifier que 'Send email'"
echo "    devient cliquable SANS recharger la page (_markReady, bug id sli-/start-seq-)."
echo "  - Send : après Mark ready sur un J+5 sans l'envoyer, hard refresh -- le"
echo "    prospect doit rester visible dans Due Now/Scheduled today, pas disparaître"
echo "    (_isJ5Eligible, bug _sendSequences confondu avec _sendJ5Sent)."

echo ""
echo "============================================================"
if [ "$FAILED" -gt 0 ]; then
  echo "❌ SMOKE TESTS : $FAILED ECHEC(S) REEL(S) DETECTE(S) -- voir ci-dessus."
  echo "============================================================"
  exit 1
else
  echo "✅ Smoke tests terminés, aucun échec détecté automatiquement."
  echo "Vérifie quand même chaque section ci-dessus (TEST 1 fraîcheur,"
  echo "TEST 4 manuel) -- ce script ne couvre pas tout."
  echo "============================================================"
  exit 0
fi
