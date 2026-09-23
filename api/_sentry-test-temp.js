import { Sentry } from './_sentry.js';

export default async function handler(req, res) {
  try {
    throw new Error('sentry test deliberate - safe to ignore, temp endpoint');
  } catch (e) {
    Sentry.captureException(e);
    await Sentry.flush(1000).catch(() => {});
    return res.status(500).json({ ok: true, note: 'deliberate test error, captured' });
  }
}
