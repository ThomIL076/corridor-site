/**
 * dedupe_prospects.js — Détection et archivage des doublons email dans Supabase
 *
 * Usage :
 *   node --env-file=.env.local dedupe_prospects.js --client=thomas            → dry-run (affiche, n'écrit rien)
 *   node --env-file=.env.local dedupe_prospects.js --client=thomas --execute  → écrit en base
 *
 * AVERTISSEMENT : ce script ne gère PAS automatiquement les cas d'encodage cassé
 * ou de stage non-canonique détectés manuellement le 31/07 (René Isensee, Toni Fücker,
 * Shannon Moyes). Le ranking suit sa logique standard ; toute anomalie de ce type
 * nécessite une revue humaine du dry-run avant de passer --execute.
 */

import { createClient } from '@supabase/supabase-js';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const clientArg = args.find(a => a.startsWith('--client='));
const EXECUTE = args.includes('--execute');

if (!clientArg) {
  console.error('Erreur : --client=<client_id> est obligatoire.');
  console.error('Usage : node dedupe_prospects.js --client=thomas [--execute]');
  process.exit(1);
}
const CLIENT_ID = clientArg.split('=')[1].trim();
if (!CLIENT_ID) {
  console.error('Erreur : valeur de --client vide.');
  process.exit(1);
}

// ── Supabase ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Erreur : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies (voir .env.local, lancer avec --env-file=.env.local)');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Ranking ───────────────────────────────────────────────────────────────────

const STAGE_RANK = {
  'Closed':      8,
  'Proposal':    7,
  'Replied':     6,
  'Engaged':     5,
  '1st Contact': 4,
  'Researched':  3,
  'Identified':  2,
  'Archived':    1,
};

/**
 * Réplique exactement le ROW_NUMBER() OVER (PARTITION BY email ORDER BY ...) validé le 31/07.
 * Le premier élément du tableau retourné est le gagnant (rn=1), le reste sont les perdants.
 */
function rankGroup(prospects) {
  return [...prospects].sort((a, b) => {
    // 1. connection-accepted en premier
    const aConn = (a.linkedin_tag || '') === 'connection-accepted' ? 1 : 0;
    const bConn = (b.linkedin_tag || '') === 'connection-accepted' ? 1 : 0;
    if (bConn !== aConn) return bConn - aConn;

    // 2. stage rank DESC
    const aRank = STAGE_RANK[a.stage] ?? 0;
    const bRank = STAGE_RANK[b.stage] ?? 0;
    if (bRank !== aRank) return bRank - aRank;

    // 3. a un score réel (non null, différent de 5) en premier
    const aHasIcp = (a.icp_score !== null && a.icp_score !== undefined && parseFloat(a.icp_score) !== 5) ? 1 : 0;
    const bHasIcp = (b.icp_score !== null && b.icp_score !== undefined && parseFloat(b.icp_score) !== 5) ? 1 : 0;
    if (bHasIcp !== aHasIcp) return bHasIcp - aHasIcp;

    // 4. last_contact DESC NULLS LAST
    const aLc = a.last_contact ? new Date(a.last_contact).getTime() : -Infinity;
    const bLc = b.last_contact ? new Date(b.last_contact).getTime() : -Infinity;
    if (bLc !== aLc) return bLc - aLc;

    // 5. updated_at DESC
    const aUp = a.updated_at ? new Date(a.updated_at).getTime() : -Infinity;
    const bUp = b.updated_at ? new Date(b.updated_at).getTime() : -Infinity;
    return bUp - aUp;
  });
}

// ── Fetch (avec pagination pour ne pas tronquer à 1 000 lignes) ───────────────

async function fetchAllProspects() {
  const PAGE = 1000;
  let from = 0;
  let all = [];

  while (true) {
    const { data, error } = await sb
      .from('prospects')
      .select('id, email, name, stage, linkedin_tag, icp_score, last_contact, updated_at')
      .eq('client_id', CLIENT_ID)
      .neq('stage', 'Archived')
      .not('email', 'is', null)
      .neq('email', '')
      .neq('email', 'network')
      .range(from, from + PAGE - 1);

    if (error) {
      console.error('Erreur Supabase (fetch):', error);
      process.exit(1);
    }

    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return all;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log(`dedupe_prospects — client: ${CLIENT_ID} | mode: ${EXECUTE ? '⚡ EXECUTE (écriture en base)' : '🔍 DRY-RUN (lecture seule)'}`);
  console.log('─'.repeat(60));

  const prospects = await fetchAllProspects();
  console.log(`Prospects récupérés (non-archivés, email valide) : ${prospects.length}`);

  // Grouper par email normalisé
  const groups = {};
  for (const p of prospects) {
    const key = p.email.toLowerCase().trim();
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }

  const dupeGroups = Object.entries(groups).filter(([, g]) => g.length > 1);

  if (dupeGroups.length === 0) {
    console.log('\nAucun email dupliqué détecté. Rien à faire.');
    return;
  }

  console.log(`Groupes dupliqués détectés       : ${dupeGroups.length}`);
  console.log(`Fiches à archiver (perdants)      : ${dupeGroups.reduce((acc, [, g]) => acc + g.length - 1, 0)}`);
  console.log('');

  let totalArchived = 0;
  let totalBackfilled = 0;
  let totalErrors = 0;

  for (const [email, rawProspects] of dupeGroups) {
    const ranked = rankGroup(rawProspects);
    const winner = ranked[0];
    const losers = ranked.slice(1);

    const label = p => (p.name || '').trim() || `[id:${p.id}]`;
    const meta  = p => `stage=${p.stage}, tag=${p.linkedin_tag || 'none'}, icp=${p.icp_score ?? 'null'}`;

    // Meilleur score réel parmi les perdants (≠5, non null)
    const bestLoserScore = losers
      .map(p => parseFloat(p.icp_score))
      .filter(s => !isNaN(s) && s !== 5)
      .sort((a, b) => b - a)[0] ?? null;

    const winnerIcp = winner.icp_score !== null && winner.icp_score !== undefined
      ? parseFloat(winner.icp_score) : null;
    const needsBackfill = bestLoserScore !== null && (winnerIcp === null || winnerIcp === 5);

    console.log(`📧 ${email}`);
    console.log(`   WINNER  : ${label(winner)} (${meta(winner)})`);
    for (const loser of losers) {
      console.log(`   ARCHIVE : ${label(loser)} (${meta(loser)})`);
    }
    if (needsBackfill) {
      console.log(`   BACKFILL: icp_score ${winnerIcp ?? 'null'} → ${bestLoserScore} (meilleur score réel des perdants)`);
    }

    if (EXECUTE) {
      // 1. Backfill icp_score sur le gagnant si nécessaire
      if (needsBackfill) {
        const { error } = await sb
          .from('prospects')
          .update({ icp_score: bestLoserScore })
          .eq('id', winner.id)
          .eq('client_id', CLIENT_ID);
        if (error) {
          console.error(`   [ERR] backfill icp_score (id=${winner.id}):`, error.message);
          totalErrors++;
        } else {
          totalBackfilled++;
          console.log(`   ✓ icp_score backfillé → ${bestLoserScore}`);
        }
      }

      // 2. Archiver les perdants
      for (const loser of losers) {
        const { error } = await sb
          .from('prospects')
          .update({ stage: 'Archived', archived: true })
          .eq('id', loser.id)
          .eq('client_id', CLIENT_ID);
        if (error) {
          console.error(`   [ERR] archive (id=${loser.id}):`, error.message);
          totalErrors++;
        } else {
          totalArchived++;
          console.log(`   ✓ archivé : ${label(loser)}`);
        }
      }
    }

    console.log('');
  }

  // Résumé
  console.log('─'.repeat(60));
  if (EXECUTE) {
    console.log('RÉSUMÉ EXECUTE');
    console.log(`  Groupes traités      : ${dupeGroups.length}`);
    console.log(`  Fiches archivées     : ${totalArchived}`);
    console.log(`  Scores backfillés    : ${totalBackfilled}`);
    if (totalErrors > 0) console.log(`  ⚠ Erreurs Supabase  : ${totalErrors}`);
  } else {
    console.log('RÉSUMÉ DRY-RUN (aucune écriture effectuée)');
    console.log(`  Groupes qui seraient traités   : ${dupeGroups.length}`);
    console.log(`  Fiches qui seraient archivées  : ${dupeGroups.reduce((acc, [, g]) => acc + g.length - 1, 0)}`);
    const backfillable = dupeGroups.filter(([, g]) => {
      const ranked = rankGroup(g);
      const winner = ranked[0];
      const losers = ranked.slice(1);
      const best = losers.map(p => parseFloat(p.icp_score)).filter(s => !isNaN(s) && s !== 5).sort((a, b) => b - a)[0] ?? null;
      const wIcp = winner.icp_score !== null && winner.icp_score !== undefined ? parseFloat(winner.icp_score) : null;
      return best !== null && (wIcp === null || wIcp === 5);
    }).length;
    console.log(`  Scores qui seraient backfillés : ${backfillable}`);
    console.log('');
    console.log('  → Relance avec --execute pour appliquer.');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
