// shared.js — fonctions communes aux dashboards Corridor (demo-private.html, kaizenology.html,
// wominds.html). AJOUT 29/09 (audit Thomas, roadmap Phase 1) : premiere extraction, remplace des
// definitions inline identiques (ou desormais alignees pour l'etre) dans les 3 fichiers. But :
// qu'un correctif ici s'applique partout au lieu de devoir etre porte fichier par fichier --
// exactement le defaut qui a permis au bug de completude LinkedIn du 29/09
// (isCompleteLinkedinProfileUrl) de rester en place independamment dans 2 fichiers avant d'etre
// corrige.
//
// Regle : toute fonction ici doit avoir un comportement strictement identique dans les 3 fichiers
// avant extraction (verifie par diff programmatique, pas a l'oeil). currentLang n'existe pas dans
// wominds.html (mono-FR) -- les fonctions bilingues ci-dessous testent
// `typeof currentLang === 'undefined' || currentLang === 'fr'` pour se comporter correctement
// partout sans variable globale supplementaire. _activeMandate est une variable globale propre a
// chaque fichier (etat de mandat actif) -- referencee ici mais pas extraite, doit deja exister
// dans la portee globale du fichier appelant au moment de l'appel.
//
// Ne PAS ajouter ici une fonction qui diverge encore entre fichiers sans l'avoir d'abord alignee
// et verifiee identique -- une extraction qui fige une divergence existante est pire que la
// divergence elle-meme (silencieuse, un seul endroit a lire au lieu de trois, mais invisible que
// le comportement a change pour les fichiers qui n'avaient pas cette version).

// AJOUT 29/09 (audit Thomas, cas reels Ricardo Mendes / Valentina Jordan / Jagnoor Singh, meme
// angle mort cote ecriture -- rien ne verifiait qu'un lien LinkedIn saisi/importe/resolu etait une
// URL de profil complete avant de l'enregistrer en base ou de l'afficher). Meme regex que
// hasMalformedLinkedinSlug (workflow d'enrichissement) pour coherence de style -- verifie un slug
// reel d'au moins 2 caracteres, rejette /in/ nu, /in/?..., /in/#....
function isCompleteLinkedinProfileUrl(url) {
  if (!url) return false;
  const slugMatch = url.match(/\/in\/([^/?#]+)/);
  if (!slugMatch) return false;
  return slugMatch[1].trim().length >= 2;
}

// Cle d'identite canonique (alignee sur App.jsx) pour external_id a l'insertion. Absente de
// wominds.html (pas d'ajout manuel de prospect dans ce fichier) -- sans effet d'y etre chargee.
function identityKey(p){
  const m = (p.linkedin || '').match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (m && m[1] && !/^acoaa/i.test(m[1])) return 'li:' + m[1].toLowerCase();
  if (p.email && p.email.trim()) return 'em:' + p.email.trim().toLowerCase();
  return 'nc:' + (p.name || '').trim().toLowerCase() + '|' + (p.company || '').trim().toLowerCase();
}

const ICP_WEIGHTS = { role_fit: 0.35, company_size_fit: 0.20, signal_strength: 0.20, mandate_fit: 0.10, recency: 0.10, completeness: 0.05 };
const ICP_WEIGHTS_DEAL = { role_fit: 0.30, company_size_fit: 0.20, signal_strength: 0.15, mandate_fit: 0.10, recency: 0.10, completeness: 0.05, deal_value: 0.10 };

function _calcRecency(p) {
  const lastTouch = p.updated_at || p.created_at;
  if (!lastTouch) return 0;
  const days = (Date.now() - new Date(lastTouch).getTime()) / 86400000;
  if (days <= 7)  return 10;
  if (days <= 30) return 7;
  if (days <= 90) return 4;
  return 0;
}

function _calcComposite(role, size, signal, mandateFit, recency, completeness, dealValue) {
  const s = (size === -1) ? 5 : size;
  const hasDeal = (dealValue !== undefined && dealValue !== -1);
  const w = hasDeal ? ICP_WEIGHTS_DEAL : ICP_WEIGHTS;
  const sum = role * w.role_fit + s * w.company_size_fit + signal * w.signal_strength
    + mandateFit * w.mandate_fit + recency * w.recency + completeness * w.completeness
    + (hasDeal ? dealValue * w.deal_value : 0);
  return Math.min(10, Math.max(0, sum));
}

function _calcICP(p) {
  if (p.icp_score && Number(p.icp_score) > 0) return Number(p.icp_score).toFixed(1);
  const t = (p.title || '').toLowerCase();
  let roleScore;
  if (_activeMandate?.target_role_keywords?.length) {
    roleScore = _activeMandate.target_role_keywords.some(k => t.includes(k.toLowerCase())) ? 10 : 0;
  } else if (['ceo','founder','co-founder','chief executive'].some(k => t.includes(k))) roleScore = 10;
  else if (
    ['cto','cro','cmo','coo','cpo','vp','vice president'].some(k => t.includes(k)) ||
    ['head of sales','head of growth','head of revenue'].some(k => t.includes(k))
  ) roleScore = 6;
  else if (['director','senior manager'].some(k => t.includes(k))) roleScore = 3;
  else roleScore = 0;
  let sizeScore = 5;
  if (p.company_size) {
    const n = parseInt(String(p.company_size)) || 0;
    if (_activeMandate?.min_employees || _activeMandate?.max_employees) {
      const lo = _activeMandate.min_employees || null;
      const hi = _activeMandate.max_employees || null;
      const adjAbove = hi && n > hi && n <= Math.round(hi * 2.5);
      const farAbove = hi && n > Math.round(hi * 2.5);
      const adjBelow = lo && n < lo && n >= Math.round(lo / 2.5);
      const inRange  = (!lo || n >= lo) && (!hi || n <= hi);
      if      (n > 0 && inRange)                sizeScore = 10;
      else if (n > 0 && (adjAbove || adjBelow)) sizeScore = 7;
      else if (n > 0 && farAbove)               sizeScore = 2;
      else if (n > 0)                           sizeScore = 3;
    } else {
      if      (n >= 30 && n <= 100)  sizeScore = 10;
      else if (n >= 11 && n < 30)    sizeScore = 7;
      else if (n > 100 && n <= 200)  sizeScore = 7;
      else if (n > 200 && n <= 500)  sizeScore = 4;
      else if (n > 0   && n < 11)    sizeScore = 3;
      else if (n > 500)              sizeScore = 2;
    }
  }
  const knownCount = [p.title, p.company, p.company_size].filter(Boolean).length;
  const completenessScore = knownCount === 3 ? 10 : knownCount > 0 ? 5 : 0;
  let dealValueScore = -1;
  if (p.deal_value && (_activeMandate?.min_deal_value || _activeMandate?.max_deal_value)) {
    const dv = parseInt(String(p.deal_value)) || 0;
    const dvLo = _activeMandate.min_deal_value || null;
    const dvHi = _activeMandate.max_deal_value || null;
    const dvInRange  = (!dvLo || dv >= dvLo) && (!dvHi || dv <= dvHi);
    const dvAdjAbove = dvHi && dv > dvHi && dv <= Math.round(dvHi * 2.5);
    const dvAdjBelow = dvLo && dv < dvLo && dv >= Math.round(dvLo / 2.5);
    const dvFarAbove = dvHi && dv > Math.round(dvHi * 2.5);
    if      (dv > 0 && dvInRange)                  dealValueScore = 10;
    else if (dv > 0 && (dvAdjAbove || dvAdjBelow)) dealValueScore = 7;
    else if (dv > 0 && dvFarAbove)                 dealValueScore = 2;
    else if (dv > 0)                               dealValueScore = 3;
  }
  return _calcComposite(roleScore, sizeScore, 0, 5, _calcRecency(p), completenessScore, dealValueScore).toFixed(1);
}

// Paliers pour un rappel en retard (arbitrage Thomas) : <30j inchange (jours), 30-364j en mois
// arrondis, >=365j en annees arrondies -- un compte de jours a 4 chiffres sur un prospect oublie
// depuis des annees n'apporte rien de lisible. Meme convention mots-entiers (singulier/pluriel)
// que _relDate(), pas d'abreviation inventee.
function _fmtReminder(iso) {
  if (!iso) return null;
  const d = new Date(iso); if (isNaN(d)) return null;
  const days = Math.ceil((d - Date.now()) / 86400000);
  const fr = typeof currentLang === 'undefined' || currentLang === 'fr';
  if (days < 0) {
    const od = Math.abs(days);
    let magnitude;
    if (fr) {
      if (od < 30) magnitude = od + 'j';
      else if (od < 365) { const m = Math.round(od / 30); magnitude = m + ' mois'; }
      else { const y = Math.round(od / 365); magnitude = y + (y === 1 ? ' an' : ' ans'); }
    } else {
      if (od < 30) magnitude = od + 'd';
      else if (od < 365) { const m = Math.round(od / 30); magnitude = m + (m === 1 ? ' month' : ' months'); }
      else { const y = Math.round(od / 365); magnitude = y + (y === 1 ? ' year' : ' years'); }
    }
    return { label: (fr ? 'En retard de ' : 'Overdue by ') + magnitude, overdue:true };
  }
  if (days === 0) return { label: fr ? 'Aujourd\'hui' : 'Today', overdue:false };
  if (days === 1) return { label: fr ? 'Demain' : 'Tomorrow', overdue:false };
  return fr
    ? { label: 'Dans ' + days + ' jours, le ' + d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'}), overdue:false }
    : { label: 'In ' + days + ' days — ' + d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}), overdue:false };
}

// AJOUT 29/09 (badge de fraicheur, go Thomas) : meme forme que _fmtReminder (parse/garde/label)
// mais sens inverse -- date d'ecriture passee, pas une echeance future. Generique malgre son nom :
// utilisee pour prospects.next_action_generated_at (boite Next Action) ET, depuis la Phase 3,
// prospects.signal_interpretation_updated_at (boite AI Insight) -- meme contrat pour les deux,
// aucune raison de dupliquer. Retourne null si aucune date -- pas de badge affiche dans ce cas.
function _fmtNextActionFreshness(iso) {
  if (!iso) return null;
  const d = new Date(iso); if (isNaN(d)) return null;
  const days = Math.floor((Date.now() - d) / 86400000);
  const fr = typeof currentLang === 'undefined' || currentLang === 'fr';
  if (days <= 0) return fr ? 'Mis à jour aujourd\'hui' : 'Updated today';
  const dateStr = d.toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: '2-digit', month: '2-digit' });
  return fr ? ('Mis à jour le ' + dateStr) : ('Updated on ' + dateStr);
}

// AJOUT 29/09 (badge de divergence Next Action, go Thomas, roadmap Phase 2) : prospects.next_action
// (etape manuelle, texte libre court) et prospects.next_action_cache (recommandation IA, JSON
// structure v1/v2/v3 ou markdown) sont deux sources independantes affichees cote a cote dans le
// tiroir sans jamais etre comparees -- un utilisateur peut editer l'une en contradiction silencieuse
// avec l'autre. Ce n'est PAS une comparaison semantique : les deux champs servent des usages
// differents par design, donc une non-egalite textuelle est attendue des que les deux existent.
// Le signal utile est "les deux sources existent, verifie qu'elles s'accordent", pas une detection
// fine de contradiction.
function _plainTextFromNextActionCache(raw) {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === 'object') {
        return Object.values(obj).filter(v => typeof v === 'string').join(' ');
      }
    } catch (_) {}
  }
  return trimmed;
}
function _cleanCompareText(s) {
  return String(s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[*_#>`[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
function _fmtNextActionDivergence(manualText, cacheRaw) {
  const manual = _cleanCompareText(manualText);
  const cache = _cleanCompareText(_plainTextFromNextActionCache(cacheRaw));
  if (!manual || !cache || manual === cache) return null;
  const fr = typeof currentLang === 'undefined' || currentLang === 'fr';
  return fr ? '⚠ Texte manuel et recommandation IA divergent' : '⚠ Manual text and AI recommendation differ';
}

// AJOUT 29/09 (remplacement confirm()/alert() natifs, go Thomas, audit visuel) : confirm()/alert()
// natifs cassent le style de l'app (pas de theme, rendu OS/navigateur incoherent) et presentent un
// risque reel sur les actions destructrices -- apres plusieurs confirm() rapproches sur une page,
// Chrome/Firefox proposent a l'utilisateur de bloquer les futurs dialogues ; si coche, TOUS les
// confirm() suivants sont auto-rejetes silencieusement, y compris "Supprimer definitivement" ou
// "Demarrer la sequence email (envoi immediat)". _confirmModal/_alertModal les remplacent par une
// modale DOM construite a la volee (memes tokens que #addp-modal/#addm-modal deja presents dans les
// 3 fichiers), retournent une Promise pour garder la meme forme d'appel au site d'appel :
// `if (!(await _confirmModal(msg))) return;` a la place de `if (!confirm(msg)) return;`.
// ponytail: un seul jeu d'elements DOM partage, pas de file d'attente -- suffisant pour une UI
// pilotee par un seul clic utilisateur a la fois ; a revoir seulement si deux confirmations peuvent
// un jour se declencher en concurrence (ex. deux actions bulk lancees en parallele).
function _corridorModalEls() {
  let overlay = document.getElementById('_cModalOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = '_cModalOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(26,43,94,0.35);z-index:20000;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;';
  overlay.innerHTML =
    '<div id="_cModalBox" role="alertdialog" aria-modal="true" aria-labelledby="_cModalMsg" style="background:#fff;border-radius:var(--radius-xl,16px);box-shadow:0 20px 60px rgba(26,43,94,0.25);padding:24px;max-width:420px;width:92vw;transform:translateY(-8px);transition:transform .2s;font-family:inherit;">' +
      '<div id="_cModalMsg" style="font-size:var(--fs-base,15px);color:var(--ink,#0e1a2e);line-height:1.5;white-space:pre-line;margin-bottom:18px;"></div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
        '<button id="_cModalCancel" type="button" style="padding:8px 16px;border-radius:var(--radius-sm,8px);border:1px solid var(--border,#dbe2ee);background:#fff;color:var(--ink,#0e1a2e);font-weight:600;font-size:var(--fs-sm,14px);cursor:pointer;font-family:inherit;"></button>' +
        '<button id="_cModalOk" type="button" style="padding:8px 16px;border-radius:var(--radius-sm,8px);border:none;background:var(--navy,#1a2b5e);color:#fff;font-weight:600;font-size:var(--fs-sm,14px);cursor:pointer;font-family:inherit;"></button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  return overlay;
}
function _corridorModalShow(message, kind) {
  return new Promise(resolve => {
    const fr = typeof currentLang === 'undefined' || currentLang === 'fr';
    const overlay = _corridorModalEls();
    const box = document.getElementById('_cModalBox');
    const msgEl = document.getElementById('_cModalMsg');
    const cancelBtn = document.getElementById('_cModalCancel');
    const okBtn = document.getElementById('_cModalOk');
    msgEl.textContent = message;
    cancelBtn.style.display = kind === 'alert' ? 'none' : '';
    cancelBtn.textContent = fr ? 'Annuler' : 'Cancel';
    okBtn.textContent = kind === 'alert' ? 'OK' : (fr ? 'Confirmer' : 'Confirm');
    const prevFocus = document.activeElement;
    let done = false;
    function finish(result) {
      if (done) return; done = true;
      overlay.style.opacity = '0'; overlay.style.pointerEvents = 'none';
      box.style.transform = 'translateY(-8px)';
      document.removeEventListener('keydown', onKey, true);
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
      overlay.removeEventListener('click', onOverlayClick);
      if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch(_) {} }
      resolve(result);
    }
    function onCancel() { finish(false); }
    function onOk() { finish(true); }
    function onOverlayClick(e) { if (e.target === overlay && kind !== 'alert') finish(false); }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); finish(kind === 'alert'); }
      else if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Tab') {
        const focusables = kind === 'alert' ? [okBtn] : [cancelBtn, okBtn];
        const idx = focusables.indexOf(document.activeElement);
        e.preventDefault();
        const next = e.shiftKey ? (idx <= 0 ? focusables.length - 1 : idx - 1) : (idx === focusables.length - 1 ? 0 : idx + 1);
        focusables[next].focus();
      }
    }
    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKey, true);
    overlay.style.opacity = '1'; overlay.style.pointerEvents = 'auto';
    box.style.transform = 'translateY(0)';
    okBtn.focus();
  });
}
function _confirmModal(message) { return _corridorModalShow(message, 'confirm'); }
function _alertModal(message) { return _corridorModalShow(message, 'alert').then(() => {}); }
