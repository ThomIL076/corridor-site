import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import { supabase } from './_auth.js';
import './_sentry.js';

// Fix securite 2026-09-21 (lot 3). Route publique PAR CONCEPTION (lien cliquable dans un email ou un message Slack :
// pas de jeton de session). Avant : un simple GET enregistrait le vote (un scanner d'email, un apercu Slack ou un
// prechargement du navigateur votait a la place de l'utilisateur), redirect libre (redirect ouvert), client_id / mandate_id /
// prospect_id pris tels quels dans l'URL (votes forgeables pour n'importe quel client). Desormais :
//  0. GET et HEAD n'ont AUCUN effet de bord : aucun appel Supabase, aucun appel sortant. Ils affichent une page de confirmation
//     statique (aucun secret, chaque parametre reflechi est echappe et n'apparait que dans un champ cache, en-tetes anti-cache,
//     noindex, CSP restrictive) avec un bouton qui envoie un POST vers cette meme route. Seul le POST enregistre le vote ;
//  1. redirect : liste blanche stricte (https, hote exact corridor.systems / www.corridor.systems, plus les hotes de
//     FEEDBACK_REDIRECT_HOSTS s'il est defini), sans identifiants ni port ; sinon page de confirmation, jamais de redirection ;
//  2. client_id JAMAIS lu dans l'URL : il est derive de la fiche prospect (prospects.client_id) ; mandate_id doit appartenir
//     a ce client, sinon refus ; prospect_id doit exister ;
//  3. signature HMAC-SHA256 des parametres (secret = variable Vercel FEEDBACK_LINK_SECRET), en acceptation double :
//     - secret absent : liens non signes acceptes (comportement d'avant, mais points 0, 1 et 2 appliques) ;
//     - secret present, FEEDBACK_LINK_ENFORCE != '1' : un lien signe doit etre valide, un lien SANS signature reste
//       accepte (periode de transition pour les liens deja envoyes) ;
//     - FEEDBACK_LINK_ENFORCE = '1' : signature obligatoire et valide (sinon 403) ; sans secret, refus total (503).
//     Message signe : v1 \n prospect_id \n vote \n mandate_id \n signal_type \n redirect \n exp (champ vide si absent).
//     Un parametre exp (secondes Unix) signe et depasse renvoie une page "lien expire".
//     La signature est verifiee au GET (calcul pur, sans reseau) ET au POST ;
//  4. le POST exige un jeton de confirmation `ct` (HMAC des parametres + de la signature + d'un horodatage `ts`, cle derivee
//     par separation de domaine de FEEDBACK_LINK_SECRET, sinon de la cle serveur Supabase deja presente) valable 30 minutes :
//     un POST forge sans passer par la page de confirmation, ou dont un parametre a ete modifie, est refuse (403) sans ecriture.
//     Defense en profondeur : un POST dont Origin / Sec-Fetch-Site indique un autre site est refuse. La route n'a aucun cookie
//     ni session : il n'y a pas d'autorite ambiante a detourner, le jeton empeche surtout un POST direct hors parcours ;
//  5. un vote identique (meme prospect, client, vote, mandat, signal_type, source email) deja enregistre dans les dernieres 24 h
//     n'est pas duplique (POST rejoue = meme reponse, une seule ligne). Le schema n'a AUCUNE contrainte d'unicite (seulement la
//     cle primaire et deux CHECK) : la deduplication est faite par lecture avant ecriture, deux POST strictement simultanes
//     peuvent encore passer ensemble (une contrainte d'unicite partielle en base serait la vraie garantie, non appliquee ici).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_REDIRECT_HOSTS = ['corridor.systems', 'www.corridor.systems'];
const CONFIRM_TTL_S = 1800;
const DEDUPE_WINDOW_MS = 24 * 3600 * 1000;
const PATH = '/api/signal-feedback-click';

function one(v) { return Array.isArray(v) ? v[0] : v; }
function str(v) { const x = one(v); return (x === undefined || x === null) ? '' : String(x); }
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/`/g, '&#96;');
}

function allowedRedirectHosts() {
  const extra = String(process.env.FEEDBACK_REDIRECT_HOSTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return DEFAULT_REDIRECT_HOSTS.concat(extra);
}

// Retourne l'URL de destination si (et seulement si) elle est sur la liste blanche, sinon null.
function safeRedirect(raw) {
  if (!raw || raw.length > 500) return null;
  const parse = s => { try { return new URL(s); } catch (e) { return null; } };
  let u = parse(raw);
  if (!u) { try { u = parse(decodeURIComponent(raw)); } catch (e) { u = null; } } // ancien format : valeur encodee deux fois
  if (!u) return null;
  if (u.protocol !== 'https:' || u.username !== '' || u.password !== '' || u.port !== '') return null;
  if (!allowedRedirectHosts().includes(u.hostname.toLowerCase())) return null;
  return u.toString();
}

// ── Reponses HTML : jamais de contenu reflechi hors champ cache, en-tetes de securite systematiques ──
function send(res, status, bodyHtml, title, extra) {
  const nonce = randomBytes(16).toString('base64');
  const formHosts = allowedRedirectHosts().map(h => 'https://' + h).join(' ');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'nonce-" + nonce + "'; form-action 'self' " + formHosts + "; base-uri 'none'; frame-ancestors 'none'");
  const html = '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<meta name="robots" content="noindex, nofollow"><title>' + title + '</title>'
    + '<style nonce="' + nonce + '">body{font-family:-apple-system,sans-serif;text-align:center;padding:80px 24px;color:#1e293b;background:#f8fafc;}'
    + 'p{font-size:18px;line-height:1.6;}small{font-size:14px;color:#64748b;}'
    + 'button{font:inherit;font-size:18px;padding:14px 28px;border:0;border-radius:8px;background:#1a2b5e;color:#fff;cursor:pointer;}'
    + '</style></head><body>' + bodyHtml + '</body></html>';
  if (extra && extra.headOnly) return res.status(status).end();
  return res.status(status).send(html);
}
const page = (res, status, msg, title) => send(res, status, '<p>' + msg + '</p>', title);

// ── Signature du lien (acceptation double) et jeton de confirmation ──
function signPayload(p) {
  return ['v1', p.prospect_id, p.vote, p.mandate_id, p.signal_type, p.redirect, p.exp].join('\n');
}
function hmac(key, msg) { return createHmac('sha256', key).update(msg).digest('base64url'); }
function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}
function masterSecret() {
  return process.env.FEEDBACK_LINK_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}
function confirmKey() { return createHmac('sha256', masterSecret()).update('signal-feedback-click/confirm/v1').digest(); }
function confirmPayload(p, sig, ts) {
  return ['c1', ts, p.prospect_id, p.vote, p.mandate_id, p.signal_type, p.redirect, p.exp, sig].join('\n');
}

// Retourne null si la signature est acceptable, sinon { status, msg, title }. Calcul pur : aucun acces reseau.
function checkSignature(p, sig) {
  const secret = process.env.FEEDBACK_LINK_SECRET || '';
  const enforce = process.env.FEEDBACK_LINK_ENFORCE === '1';
  if (enforce && !secret) return { status: 503, msg: 'Service momentanément indisponible.', title: 'Erreur' };
  if (!secret) return null;
  if (sig) {
    if (!safeEq(hmac(secret, signPayload(p)), sig)) return { status: 403, msg: 'Lien invalide.', title: 'Erreur' };
    if (p.exp && !(Number(p.exp) >= Math.floor(Date.now() / 1000))) return { status: 410, msg: 'Ce lien a expiré.', title: 'Lien expiré' };
    return null;
  }
  return enforce ? { status: 403, msg: 'Lien invalide.', title: 'Erreur' } : null;
}

function readParams(src) {
  if (typeof src === 'string') src = Object.fromEntries(new URLSearchParams(src));
  src = src || {};
  return {
    p: {
      prospect_id: str(src.prospect_id),
      vote: str(src.vote),
      mandate_id: str(src.mandate_id),
      signal_type: str(src.signal_type).slice(0, 64),
      redirect: str(src.redirect),
      exp: str(src.exp),
    },
    sig: str(src.sig),
    ts: str(src.ts),
    ct: str(src.ct),
  };
}
function paramsInvalid(p) {
  return !p.prospect_id || !p.vote || !['like', 'unlike'].includes(p.vote) || !UUID_RE.test(p.prospect_id) || (p.mandate_id && !UUID_RE.test(p.mandate_id));
}

function crossSite(req) {
  const h = k => { const v = req.headers && req.headers[k]; return Array.isArray(v) ? v[0] : v; };
  const sfs = h('sec-fetch-site');
  if (sfs && sfs !== 'same-origin' && sfs !== 'none') return true;
  const origin = h('origin');
  if (origin) {
    let o;
    try { o = new URL(origin); } catch (e) { return true; }
    const host = String(h('x-forwarded-host') || h('host') || '').split(',')[0].trim().toLowerCase();
    if (!host || o.host.toLowerCase() !== host) return true;
  }
  return false;
}

const RL_MAX = parseInt(process.env.RL_MAX || '60', 10);
const RL_WINDOW_MS = 60_000;
const _rlStore = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = _rlStore.get(ip);
  if (!entry || now - entry.windowStart > RL_WINDOW_MS) {
    _rlStore.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RL_MAX) return false;
  entry.count++;
  return true;
}

export default async function handler(req, res) {
  const method = req.method;
  if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') {
    res.setHeader('Allow', 'GET, HEAD, POST');
    return page(res, 405, 'Méthode non autorisée.', 'Erreur');
  }

  const ip = ((req.headers['x-forwarded-for'] || '') + '').split(',')[0].trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return page(res, 429, 'Trop de requêtes.<br><small>Veuillez réessayer dans un instant.</small>', 'Erreur');
  }

  // ───────────────────────── GET / HEAD : page de confirmation, AUCUN effet de bord ─────────────────────────
  if (method === 'GET' || method === 'HEAD') {
    const { p, sig } = readParams(req.query);
    if (paramsInvalid(p)) {
      return send(res, 400, '<p>Paramètre manquant ou invalide.<br><small>prospect_id et vote (like / unlike) sont requis.</small></p>', 'Erreur', { headOnly: method === 'HEAD' });
    }
    const bad = checkSignature(p, sig);
    if (bad) return send(res, bad.status, '<p>' + bad.msg + '</p>', bad.title, { headOnly: method === 'HEAD' });
    if (!masterSecret()) return send(res, 503, '<p>Service momentanément indisponible.</p>', 'Erreur', { headOnly: method === 'HEAD' });

    const ts = String(Math.floor(Date.now() / 1000));
    const ct = hmac(confirmKey(), confirmPayload(p, sig, ts));
    const hidden = { prospect_id: p.prospect_id, vote: p.vote, mandate_id: p.mandate_id, signal_type: p.signal_type, redirect: p.redirect, exp: p.exp, sig, ts, ct };
    const inputs = Object.keys(hidden).filter(k => hidden[k] !== '').map(k => '<input type="hidden" name="' + k + '" value="' + esc(hidden[k]) + '">').join('');
    const label = p.vote === 'like' ? 'ce signal est pertinent' : "ce signal n'est pas pertinent";
    const body = '<p>Confirmer votre retour : ' + label + '.</p>'
      + '<form method="post" action="' + PATH + '">' + inputs + '<button type="submit">Confirmer</button></form>'
      + '<p><small>Aucun retour n\'est enregistré tant que vous n\'avez pas confirmé.</small></p>';
    return send(res, 200, body, 'Confirmer votre retour', { headOnly: method === 'HEAD' });
  }

  // ───────────────────────── POST : seul point d'ecriture ─────────────────────────
  if (crossSite(req)) return page(res, 403, 'Requête refusée.', 'Erreur');
  const { p, sig, ts, ct } = readParams(req.body);
  if (paramsInvalid(p)) return page(res, 400, 'Paramètre manquant ou invalide.', 'Erreur');

  if (!masterSecret()) return page(res, 503, 'Service momentanément indisponible.', 'Erreur');
  const age = Math.floor(Date.now() / 1000) - Number(ts);
  if (!/^[0-9]{9,12}$/.test(ts) || !ct || age < -60 || age > CONFIRM_TTL_S || !safeEq(hmac(confirmKey(), confirmPayload(p, sig, ts)), ct)) {
    return page(res, 403, 'Confirmation invalide ou expirée.<br><small>Rouvrez le lien depuis votre email.</small>', 'Erreur');
  }
  const bad = checkSignature(p, sig);
  if (bad) return page(res, bad.status, bad.msg, bad.title);

  // ── Client dérivé de la fiche prospect (jamais des paramètres) ──
  const { data: prospect } = await supabase
    .from('prospects')
    .select('id, client_id, mandate_id')
    .eq('id', p.prospect_id)
    .maybeSingle();
  if (!prospect || !prospect.client_id) return page(res, 404, 'Lien invalide.', 'Erreur');
  let mandateId = prospect.mandate_id || null;
  if (p.mandate_id) {
    const { data: m } = await supabase.from('mandates').select('id').eq('id', p.mandate_id).eq('client_id', prospect.client_id).maybeSingle();
    if (!m) return page(res, 400, 'Paramètre manquant ou invalide.', 'Erreur');
    mandateId = p.mandate_id;
  }

  // ── Pas de double vote : meme vote identique deja enregistre dans les 24 dernieres heures ──
  let dupQ = supabase.from('signal_feedback').select('id')
    .eq('prospect_id', p.prospect_id).eq('client_id', prospect.client_id).eq('vote', p.vote).eq('source', 'email')
    .gte('voted_at', new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString());
  dupQ = p.signal_type ? dupQ.eq('signal_type', p.signal_type) : dupQ.is('signal_type', null);
  dupQ = mandateId ? dupQ.eq('mandate_id', mandateId) : dupQ.is('mandate_id', null);
  const { data: dup } = await dupQ.limit(1);

  if (!(dup && dup.length)) {
    const { error } = await supabase.from('signal_feedback').insert({
      prospect_id: p.prospect_id,
      client_id: prospect.client_id,
      mandate_id: mandateId,
      signal_type: p.signal_type || null,
      vote: p.vote,
      source: 'email',
    });
    if (error) {
      return page(res, 500, "Une erreur est survenue lors de l'enregistrement de votre retour.<br><small>Veuillez réessayer ultérieurement.</small>", 'Erreur');
    }
  }

  const dest = safeRedirect(p.redirect);
  if (dest) {
    res.setHeader('Location', dest);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    return res.status(303).end();
  }
  return page(res, 200, 'Merci, votre retour a été enregistré.', 'Retour enregistré');
}
