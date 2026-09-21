// api/_auth.js -- verification commune du jeton de session Supabase (Authorization: Bearer <access_token>).
// Fichier prefixe "_" : helper, pas une route Vercel. Meme methode que memory.js / pipeline-prospects.js /
// meeting-notes.js (getUser + clients.auth_user_id), factorisee une seule fois au lieu d'etre recopiee.
// Fonctionne pour les routes Node (req.headers = objet) et Edge (req.headers = Headers, .get()).
import { createClient } from '@supabase/supabase-js';

// Cle service_role : la variable historique de TOUTES les routes est SUPABASE_SECRET_KEY, mais le projet Vercel
// expose aussi SUPABASE_SERVICE_ROLE_KEY (la route client-profile a leve "supabaseKey is required" en production
// quand seule cette derniere existait). Les deux noms sont acceptes ici, une seule fois, pour toutes les routes
// qui passent par ce helper. L'URL du projet est publique (deja en dur dans les pages) : repli identique.
export const supabase = createClient(
  process.env.SUPABASE_URL || 'https://oanokmugroiahtgcecbn.supabase.co',
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

function bearerToken(req) {
  const h = req.headers;
  const auth = (h && typeof h.get === 'function' ? h.get('authorization') : h && h['authorization']) || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

// Retourne la ligne clients du porteur du jeton ({ client_id, ...extraColumns }) ou null (=> 401).
// Un compte Supabase valide SANS ligne clients est refuse (inscription publique eventuelle).
export async function resolveClient(req, extraColumns = '') {
  const token = bearerToken(req);
  if (!token) return null;
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return null;
  const { data, error: clErr } = await supabase
    .from('clients')
    .select(extraColumns ? 'client_id, ' + extraColumns : 'client_id')
    .eq('auth_user_id', user.id)
    .single();
  if (clErr || !data?.client_id) return null;
  return data;
}

export async function resolveClientId(req) {
  const client = await resolveClient(req);
  return client ? client.client_id : null;
}
