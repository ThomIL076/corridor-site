import { next } from '@vercel/edge';

// Chantier A (2026-09-11) : authentification serveur avant rendu, demo-private.html et
// kaizenology.html. Avant ce middleware, ces deux fichiers etaient servis tels quels par
// Vercel a n'importe quel GET anonyme -- le gate (#access-blocked, checkAccess()) tournait
// entierement en JS APRES que tout le HTML (nav, agents, panneaux d'integration) soit deja
// dans le document. Ce middleware intercepte la requete AVANT que le fichier complet ne soit
// servi : sans cookie de session valide, seul le shell de connexion (ci-dessous) est renvoye --
// le vrai fichier n'est jamais lu.
//
// Le SDK Supabase cote client garde son fonctionnement actuel (session en localStorage,
// signInWithPassword, onAuthStateChange) -- rien de tout ca ne change. Un cookie miroir
// ("corridor_session", non-httpOnly puisque c'est le JS du shell qui doit l'ecrire) est
// ajoute uniquement pour que ce middleware ait quelque chose a lire sur le tout premier GET,
// avant que le JS de la page n'ait pu s'executer.
//
// Fail-closed assume : toute erreur de validation (token invalide OU panne reseau vers
// Supabase Auth) sert le shell, jamais le fichier complet. Une panne Supabase Auth
// deconnecterait tout le monde temporairement plutot que de risquer une fuite anonyme
// pendant l'incident.

const SUPABASE_URL = 'https://oanokmugroiahtgcecbn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2EjvzlNU58xml_Q6lqt9IQ_2jWeGvmQ'; // cle publique, deja en dur partout ailleurs dans ce repo

export const config = {
  // Volontairement une liste litterale, jamais un pattern large -- /api/* et les sous-ressources
  // (css/js/images/logos) ne doivent jamais repasser par une validation Supabase en plus du
  // Bearer deja verifie cote endpoint.
  matcher: ['/demo-private', '/demo-private.html', '/kaizenology.html', '/wominds.html'],
};

function getCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  const match = header.split(';').map(c => c.trim()).find(c => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

async function isValidSession(token) {
  if (!token) return false;
  try {
    const res = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: {
        apikey: SUPABASE_ANON_KEY, // requis par GoTrue en plus du Bearer, sinon 401 systematique
        Authorization: 'Bearer ' + token,
      },
    });
    return res.ok;
  } catch (e) {
    return false; // fail-closed : une erreur reseau ne doit jamais laisser passer
  }
}

function shellResponse(html) {
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

const SUPABASE_JS_SRC = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

// Shell demo-private -- charte reprise a l'identique de #auth-gate (demo-private.html:1433-1465),
// reduite au strict necessaire pour se connecter (pas de #access-blocked : cet ecran ne peut
// s'afficher qu'APRES une connexion reussie, donc gere par le vrai fichier une fois servi).
const DEMO_PRIVATE_SHELL = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Corridor</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --accent:#2f6bff; --ink:#0e1a2e; --radius-sm:6px; --red-light:#fca5a5; --success:#1f8a5c; }
  body { margin:0; background:var(--ink); }
</style>
</head>
<body>
<div style="display:flex;position:fixed;inset:0;align-items:center;justify-content:center;font-family:'Instrument Sans',sans-serif;">
  <div style="width:100%;max-width:372px;padding:32px;">
    <div style="display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:8px;">
      <div style="display:grid;grid-template-columns:7px 7px;grid-template-rows:7px 7px;gap:2px;">
        <span style="background:var(--accent);border-radius:1px;"></span>
        <span style="background:#5c8bff;border-radius:1px;"></span>
        <span style="background:#5c8bff;border-radius:1px;"></span>
        <span style="background:#fff;border-radius:1px;"></span>
      </div>
      <span style="font-weight:600;font-size:22px;letter-spacing:0.18em;line-height:1;color:#fff;">CORRIDOR</span>
    </div>
    <p style="text-align:center;color:rgba(255,255,255,.5);font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:0.22em;margin:0 0 28px;">CORRIDOR GTM SYSTEM · THOMAS</p>
    <form id="login-form">
      <label for="login-email" style="display:block;font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:0.18em;color:rgba(255,255,255,.5);margin-bottom:5px;">EMAIL</label>
      <input id="login-email" type="email" autocomplete="email" required style="width:100%;box-sizing:border-box;padding:13px 14px;margin-bottom:14px;border:1px solid rgba(255,255,255,.14);border-radius:var(--radius-sm);background:rgba(255,255,255,.07);color:#fff;font-size:15px;font-family:'Instrument Sans',sans-serif;outline:none;">
      <label for="login-password" style="display:block;font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:0.18em;color:rgba(255,255,255,.5);margin-bottom:5px;">PASSWORD</label>
      <input id="login-password" type="password" autocomplete="current-password" required style="width:100%;box-sizing:border-box;padding:13px 14px;margin-bottom:18px;border:1px solid rgba(255,255,255,.14);border-radius:var(--radius-sm);background:rgba(255,255,255,.07);color:#fff;font-size:15px;font-family:'Instrument Sans',sans-serif;outline:none;">
      <button id="login-btn" type="submit" style="width:100%;padding:13px;border:none;border-radius:var(--radius-sm);background:#fff;color:var(--ink);font-weight:700;font-size:15px;cursor:pointer;font-family:'Instrument Sans',sans-serif;">Sign in</button>
      <p id="login-error" style="display:none;color:var(--red-light);font-size:13px;text-align:center;margin:14px 0 0;"></p>
    </form>
  </div>
</div>
<script src="${SUPABASE_JS_SRC}"></script>
<script>
  var sbClient = window.supabase.createClient('${SUPABASE_URL}', '${SUPABASE_ANON_KEY}', { auth: { storageKey: 'corridor-demo-private' } });
  document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;
    var btn = document.getElementById('login-btn');
    var err = document.getElementById('login-error');
    err.style.display = 'none'; btn.disabled = true; btn.textContent = 'Signing in…';
    var res = await sbClient.auth.signInWithPassword({ email: email, password: password });
    if (res.error) {
      btn.disabled = false; btn.textContent = 'Sign in';
      err.textContent = res.error.message; err.style.display = 'block';
      return;
    }
    // Ecriture synchrone (document.cookie n'est jamais async) AVANT le reload sur la ligne
    // suivante -- pas de gap possible ou le middleware verrait une requete sans cookie pose.
    var maxAge = res.data.session.expires_in || 3600;
    document.cookie = 'corridor_session=' + encodeURIComponent(res.data.session.access_token) + '; Secure; SameSite=Lax; Path=/; Max-Age=' + maxAge;
    window.location.reload();
  });
</script>
</body>
</html>`;

// Shell kaizenology -- charte reprise a l'identique de #auth-gate (kaizenology.html:1144-1163).
const KAIZENOLOGY_SHELL = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Corridor</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root { --navy:#1a2b5e; --navy-mid:#243875; --blue:#93A8D4; --radius-md:8px; --red-light:#fca5a5; }
  body { margin:0; background:var(--navy); }
</style>
</head>
<body>
<div style="display:flex;position:fixed;inset:0;align-items:center;justify-content:center;font-family:'Plus Jakarta Sans',sans-serif;">
  <div style="width:100%;max-width:360px;padding:32px;">
    <div style="display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:6px;">
      <div style="display:grid;grid-template-columns:9px 9px;grid-template-rows:9px 9px;gap:3px;">
        <span style="background:#fff;border-radius:2px;"></span>
        <span style="background:var(--blue);border-radius:2px;"></span>
        <span style="background:var(--blue);border-radius:2px;"></span>
        <span style="background:#fff;border-radius:2px;"></span>
      </div>
      <span style="font-weight:800;font-size:22px;letter-spacing:3px;color:#fff;">CORRIDOR</span>
    </div>
    <p style="text-align:center;color:var(--blue);font-style:italic;font-family:'Fraunces',serif;margin:0 0 28px;font-size:15px;">Partner Demo — private access</p>
    <form id="login-form">
      <input id="login-email" type="email" placeholder="Email" autocomplete="email" required style="width:100%;box-sizing:border-box;padding:13px 14px;margin-bottom:12px;border:1px solid #3a4a7a;border-radius:var(--radius-md);background:var(--navy-mid);color:#fff;font-size:15px;outline:none;">
      <input id="login-password" type="password" placeholder="Password" autocomplete="current-password" required style="width:100%;box-sizing:border-box;padding:13px 14px;margin-bottom:16px;border:1px solid #3a4a7a;border-radius:var(--radius-md);background:var(--navy-mid);color:#fff;font-size:15px;outline:none;">
      <button id="login-btn" type="submit" style="width:100%;padding:13px;border:none;border-radius:var(--radius-md);background:#fff;color:var(--navy);font-weight:700;font-size:15px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;">Sign in</button>
      <p id="login-error" style="display:none;color:var(--red-light);font-size:13px;text-align:center;margin:14px 0 0;"></p>
    </form>
  </div>
</div>
<script src="${SUPABASE_JS_SRC}"></script>
<script>
  var sbClient = window.supabase.createClient('${SUPABASE_URL}', '${SUPABASE_ANON_KEY}', { auth: { storageKey: 'corridor-demo-kaizenology' } });
  document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;
    var btn = document.getElementById('login-btn');
    var err = document.getElementById('login-error');
    err.style.display = 'none'; btn.disabled = true; btn.textContent = 'Signing in…';
    var res = await sbClient.auth.signInWithPassword({ email: email, password: password });
    if (res.error) {
      btn.disabled = false; btn.textContent = 'Sign in';
      err.textContent = res.error.message; err.style.display = 'block';
      return;
    }
    var maxAge = res.data.session.expires_in || 3600;
    document.cookie = 'corridor_session=' + encodeURIComponent(res.data.session.access_token) + '; Secure; SameSite=Lax; Path=/; Max-Age=' + maxAge;
    window.location.reload();
  });
</script>
</body>
</html>`;

// Shell wominds -- premier dashboard client entierement francais (brief 2026-09-12, Elodie
// Dratler / Wominds), storageKey dedie ("corridor-demo-wominds", jamais reutilise une cle
// existante). Charte alignee sur la vraie charte Corridor (Instrument Sans + IBM Plex Mono,
// --ink) apres correction du 2026-09-12 (capture Thomas : le premier shell, navy/Fraunces,
// n'etait pas le bon habillage) -- identique a DEMO_PRIVATE_SHELL ci-dessus, texte francais et
// storageKey different uniquement.
const WOMINDS_SHELL = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Corridor</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --accent:#2f6bff; --ink:#0e1a2e; --radius-sm:6px; --red-light:#fca5a5; --success:#1f8a5c; }
  body { margin:0; background:var(--ink); }
</style>
</head>
<body>
<div style="display:flex;position:fixed;inset:0;align-items:center;justify-content:center;font-family:'Instrument Sans',sans-serif;">
  <div style="width:100%;max-width:372px;padding:32px;">
    <div style="display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:8px;">
      <div style="display:grid;grid-template-columns:7px 7px;grid-template-rows:7px 7px;gap:2px;">
        <span style="background:var(--accent);border-radius:1px;"></span>
        <span style="background:#5c8bff;border-radius:1px;"></span>
        <span style="background:#5c8bff;border-radius:1px;"></span>
        <span style="background:#fff;border-radius:1px;"></span>
      </div>
      <span style="font-weight:600;font-size:22px;letter-spacing:0.18em;line-height:1;color:#fff;">CORRIDOR</span>
    </div>
    <p style="text-align:center;color:rgba(255,255,255,.5);font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:0.22em;margin:0 0 28px;">TABLEAU DE BORD WOMINDS</p>
    <form id="login-form">
      <label for="login-email" style="display:block;font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:0.18em;color:rgba(255,255,255,.5);margin-bottom:5px;">EMAIL</label>
      <input id="login-email" type="email" autocomplete="email" required style="width:100%;box-sizing:border-box;padding:13px 14px;margin-bottom:14px;border:1px solid rgba(255,255,255,.14);border-radius:var(--radius-sm);background:rgba(255,255,255,.07);color:#fff;font-size:15px;font-family:'Instrument Sans',sans-serif;outline:none;">
      <label for="login-password" style="display:block;font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:0.18em;color:rgba(255,255,255,.5);margin-bottom:5px;">MOT DE PASSE</label>
      <input id="login-password" type="password" autocomplete="current-password" required style="width:100%;box-sizing:border-box;padding:13px 14px;margin-bottom:18px;border:1px solid rgba(255,255,255,.14);border-radius:var(--radius-sm);background:rgba(255,255,255,.07);color:#fff;font-size:15px;font-family:'Instrument Sans',sans-serif;outline:none;">
      <button id="login-btn" type="submit" style="width:100%;padding:13px;border:none;border-radius:var(--radius-sm);background:#fff;color:var(--ink);font-weight:700;font-size:15px;cursor:pointer;font-family:'Instrument Sans',sans-serif;">Se connecter</button>
      <p id="login-error" style="display:none;color:var(--red-light);font-size:13px;text-align:center;margin:14px 0 0;"></p>
    </form>
  </div>
</div>
<script src="${SUPABASE_JS_SRC}"></script>
<script>
  var sbClient = window.supabase.createClient('${SUPABASE_URL}', '${SUPABASE_ANON_KEY}', { auth: { storageKey: 'corridor-demo-wominds' } });
  document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;
    var btn = document.getElementById('login-btn');
    var err = document.getElementById('login-error');
    err.style.display = 'none'; btn.disabled = true; btn.textContent = 'Connexion…';
    var res = await sbClient.auth.signInWithPassword({ email: email, password: password });
    if (res.error) {
      btn.disabled = false; btn.textContent = 'Se connecter';
      var msg = (res.error.message || '').toLowerCase();
      err.textContent = msg.indexOf('invalid login credentials') !== -1
        ? 'Email ou mot de passe incorrect.'
        : 'Une erreur est survenue. Réessayez.';
      err.style.display = 'block';
      return;
    }
    var maxAge = res.data.session.expires_in || 3600;
    document.cookie = 'corridor_session=' + encodeURIComponent(res.data.session.access_token) + '; Secure; SameSite=Lax; Path=/; Max-Age=' + maxAge;
    window.location.reload();
  });
</script>
</body>
</html>`;

export default async function middleware(request) {
  // Chantier A valide de bout en bout sur preview le 2026-09-11 (fix storageKey inclus) --
  // garde-fou VERCEL_ENV du meme jour retire deliberement : il n'avait de sens que tant que ce
  // middleware n'etait pas encore valide en conditions reelles (connexion, session apres F5,
  // zero 401). Bascule active sur corridor.systems a partir de ce deploiement.
  const url = new URL(request.url);
  const token = getCookie(request, 'corridor_session');
  const valid = await isValidSession(token);

  if (valid) return next();

  if (url.pathname === '/kaizenology.html') return shellResponse(KAIZENOLOGY_SHELL);
  if (url.pathname === '/wominds.html') return shellResponse(WOMINDS_SHELL);
  return shellResponse(DEMO_PRIVATE_SHELL);
}
