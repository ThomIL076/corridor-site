import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oanokmugroiahtgcecbn.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function htmlPage(body, title) {
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>' + title + '</title>'
    + '<style>body{font-family:-apple-system,sans-serif;text-align:center;padding:80px 24px;color:#1e293b;background:#f8fafc;}'
    + 'p{font-size:18px;line-height:1.6;}small{font-size:14px;color:#64748b;}</style></head><body>' + body + '</body></html>';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send(htmlPage('<p>Méthode non autorisée.</p>', 'Erreur'));
  }

  const { prospect_id, vote, client_id, mandate_id, signal_type, redirect: redirectParam } = req.query || {};

  if (!prospect_id || !vote || !['like', 'unlike'].includes(vote)) {
    return res.status(400).send(
      htmlPage(
        '<p>Paramètre manquant ou invalide.<br><small>prospect_id et vote (like / unlike) sont requis.</small></p>',
        'Erreur'
      )
    );
  }

  const { error } = await supabase.from('signal_feedback').insert({
    prospect_id,
    client_id: client_id || null,
    mandate_id: mandate_id || null,
    signal_type: signal_type || null,
    vote,
    source: 'email',
  });

  if (error) {
    return res.status(500).send(
      htmlPage(
        "<p>Une erreur est survenue lors de l'enregistrement de votre retour.<br><small>Veuillez réessayer ultérieurement.</small></p>",
        'Erreur'
      )
    );
  }

  if (redirectParam) {
    try {
      const dest = decodeURIComponent(redirectParam);
      new URL(dest); // rejet si URL malformée
      res.setHeader('Location', dest);
      return res.status(302).end();
    } catch {
      // URL invalide — afficher la page de confirmation
    }
  }

  return res.status(200).send(
    htmlPage('<p>Merci, votre retour a été enregistré.</p>', 'Retour enregistré')
  );
}
