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

# FIX 24/09 (faux echec recurrent de TEST 1, SUPABASE_SECRET_KEY jamais chargee dans ce
# shell) : charge .env.local (ou .env a defaut) situe a cote de ce script, s'il existe --
# jamais en dur ici, jamais affiche/logge. set -a exporte tout ce qui est source pour que
# les variables soient bien visibles des commandes lancees plus bas (curl, etc.), pas
# seulement dans ce process. Un environnement CI/deploy.sh qui exporte deja la variable
# autrement continue de fonctionner a l'identique (${VAR:-} en dessous ne l'ecrase pas si
# le fichier ne redefinit pas cette cle).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env.local" ]; then
  set -a; source "$SCRIPT_DIR/.env.local"; set +a
elif [ -f "$SCRIPT_DIR/.env" ]; then
  set -a; source "$SCRIPT_DIR/.env"; set +a
fi

SUPABASE_URL="https://oanokmugroiahtgcecbn.supabase.co"
# service_role, jamais codee en dur (meme regle que les credentials n8n) -- lue depuis
# l'environnement. Fix securite RLS du 2026-09-11 : anon a perdu SELECT sur workflow_health
# intentionnellement (ne doit plus jamais y avoir acces), donc TEST 1 ne peut plus utiliser
# la cle publique -- service_role est necessaire pour lire cette table de monitoring interne.
SUPABASE_SECRET_KEY="${SUPABASE_SECRET_KEY:-}"

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
#
# NOTE (2026-09-17) : ce test peut échouer ou se comporter de façon
# inattendue tant que SUPABASE_SECRET_KEY reste typée "Sensitive" côté
# Vercel -- cette catégorie bloque définitivement la relecture de la
# valeur en clair via CLI/API (`vercel env pull` la renvoie toujours
# vide, ce n'est pas un bug). Toute portion de ce script qui dépend de
# la clé lue localement (plutôt que déjà présente dans l'environnement
# d'exécution) ne pourra donc pas s'exécuter automatiquement sans
# action manuelle. Deux options pour rétablir l'exécution automatique
# si besoin un jour :
#   1. Exporter la clé localement à partir de la valeur déjà détenue
#      par ailleurs (password manager, note) -- jamais en dur ici.
#   2. Repasser la variable en type standard non-Sensitive dans le
#      dashboard Vercel -- moins sûr.
# ------------------------------------------------------------
echo ""
echo "--- TEST 1 : Fraîcheur workflow_health (workflows critiques) ---"

if [ -z "$SUPABASE_SECRET_KEY" ]; then
  # Echec propre plutot qu'un 401 silencieux -- sans cette variable, les 7 requetes ci-dessous
  # echoueraient une par une avec une erreur PostgREST peu parlante (et anon n'est plus une
  # option de repli valide : cf. fix securite RLS ci-dessus).
  echo "  ❌ SUPABASE_SECRET_KEY n'est pas definie dans l'environnement -- TEST 1 impossible."
  echo "     export SUPABASE_SECRET_KEY='...' avant de relancer ce script (jamais en dur ici)."
  FAILED=$((FAILED + 1))
else
  CRITICAL_WORKFLOWS=(
    "Morning Scan — Corridor"
    "Morning Scan — Kaizenology"
    "Corridor - Auto ICP Scoring v1"
    "auto_icp_scoring_kaizenology"
    "Trigify Signal Sync v1 — Thomas"
    "Trigify Signal Sync v1 — Kaizenology"
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
      -H "apikey: $SUPABASE_SECRET_KEY" \
      -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
    # Detection d'erreur ajoutee (trouve en test le 10/09 : la reponse etait un objet d'erreur
    # PostgREST -- {"code":"42501",...} GRANT manquant -- et ce test l'imprimait tel quel sans
    # jamais le signaler comme un echec, silencieux depuis une duree indeterminee). Avec
    # service_role (bypass RLS/GRANT par nature), un 42501 ici pointerait vers autre chose
    # qu'un probleme de droits anon -- a investiguer specifiquement si ca se reproduit.
    if echo "$result" | grep -q '"code"'; then
      echo "  $wf : ❌ ERREUR REQUETE -- $result"
      FAILED=$((FAILED + 1))
    elif [ -z "$result" ] || [ "$result" = "[]" ]; then
      echo "  $wf : ⚠ Aucune ligne retournee (workflow jamais execute, ou nom desynchronise)"
    else
      echo "  $wf : $result"
    fi
  done
fi

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
  local method="${4:-POST}"
  status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" \
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

# Routes fermees par jeton de session Supabase (verifie cote serveur AVANT tout appel sortant) : un appel
# ANONYME (corps vide, aucun en-tete Authorization) doit etre rejete en 401 -- ce test n'envoie donc rien
# (aucun email, message LinkedIn, notification, credit Anthropic/FullEnrich/Apollo/Perplexity consomme).
# Un autre code = route re-ouverte (200/400/502...) ou crash serveur (500) ou timeout.
# Ajoutes le 10/09 : chemins J+5 (_generateSequenceMessage, _startEmailSeq/_bulkStartEmailSeq) ; etendus le
# 21/09 a toutes les routes d'envoi et payantes.
echo ""
check_endpoint "https://corridor.systems/api/generate" "generate (utilise par _generateSequenceMessage, sans auth)" "401"
check_endpoint "https://corridor.systems/api/enrich" "enrich (utilise par _findEmailDrawer/_findPhoneDrawer, sans auth)" "401"
check_endpoint "https://corridor.systems/api/email-send" "email-send (utilise par _startEmailSeq/_bulkStartEmailSeq, sans auth)" "401"
check_endpoint "https://corridor.systems/api/linkedin-send" "linkedin-send (sans auth)" "401"
check_endpoint "https://corridor.systems/api/linkedin-remove" "linkedin-remove (sans auth)" "401"
check_endpoint "https://corridor.systems/api/inbox-send" "inbox-send (sans auth)" "401"
check_endpoint "https://corridor.systems/api/team-notify" "team-notify (sans auth)" "401"
check_endpoint "https://corridor.systems/api/crm-sync" "crm-sync (sans auth)" "401"
check_endpoint "https://corridor.systems/api/enrich-contact" "enrich-contact (sans auth)" "401"
check_endpoint "https://corridor.systems/api/market-intel" "market-intel (sans auth)" "401"
check_endpoint "https://corridor.systems/api/web-search" "web-search (sans auth)" "401"
check_endpoint "https://corridor.systems/api/company-enrich?domain=example.com" "company-enrich (GET, sans auth)" "401" "GET"
check_endpoint "https://corridor.systems/api/search" "search (route retiree)" "410"
echo "  ATTENDU : HTTP 401 pour chaque route ci-dessus (410 pour search) -- pas 200/400/502 (route ouverte"
echo "  ou corps traite), pas 500 (crash de la fonction Vercel elle-meme, ex : import _auth.js manquant)"
echo "  ni timeout."

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
