// GET /api/workflow-status?workflow_name=...
// F13 (audit 2026-09-17) : workflow_health n'a qu'une policy RLS (service_role uniquement,
// voir smoke-tests-corridor.sh) -- ni anon ni authenticated ne peuvent la lire directement
// depuis le navigateur. Relaie last_success_at/expected_interval_minutes pour un workflow_name
// exact, meme mecanisme que /api/client-profile (auth Bearer + service_role cote serveur).

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const workflowName = (req.query.workflow_name || '').toString().trim();
  if (!workflowName) return res.status(400).json({ error: 'workflow_name is required' });

  const { data, error } = await supabase
    .from('workflow_health')
    .select('last_success_at, expected_interval_minutes')
    .eq('workflow_name', workflowName)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(data || null);
}
