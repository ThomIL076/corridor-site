export const config = { runtime: 'nodejs' };

import { createClient } from '@supabase/supabase-js';
import { Sentry } from './_sentry.js';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { count, error } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .eq('archived', false);
      // PAS de .eq('client_id', ...) — total agrégé tous clients, volontaire
    if (error) { console.error(error); return res.status(500).json({ error: 'Database error' }); }
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate');
    return res.status(200).json({ count });
  } catch (err) {
    console.error(err);
    Sentry.captureException(err);
    await Sentry.flush(1000).catch(() => {});
    return res.status(500).json({ error: 'Internal server error' });
  }
}
