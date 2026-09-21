// Fix securite 2026-09-21 : route sans aucun appelant (dashboards, demos, n8n, scripts : aucun), qui relayait des
// requetes vers le compte Exa sans authentification. Remplacee par un 410 (cette route n'existe plus) ; le
// fichier pourra etre supprime une fois la fermeture confirmee.
export default function handler(req, res) {
  return res.status(410).json({ error: 'Gone' });
}
