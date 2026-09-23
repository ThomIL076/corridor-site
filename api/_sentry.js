// api/_sentry.js -- Sentry error monitoring pour les routes Node (api/*.js sans runtime: 'edge').
// Additif pur, jamais bloquant : si SENTRY_DSN est absent ou si l'init echoue pour toute autre
// raison, sentryReady reste false et Sentry.captureException(...) est un no-op silencieux (le SDK
// n'appelle jamais le reseau avant un init reussi) -- aucune route n'est modifiee dans son
// comportement HTTP par ce fichier. tracesSampleRate: 0 -- erreurs uniquement, pas de tracing de
// performance (cf. cadrage 2026-09-23).
import * as Sentry from '@sentry/node';

let sentryReady = false;
try {
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0 });
    sentryReady = true;
  }
} catch (e) { /* jamais bloquant */ }

export { Sentry, sentryReady };
