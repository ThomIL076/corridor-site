#!/usr/bin/env node
// ============================================================
// INVENTAIRE DES FONCTIONS DUPLIQUEES — demo-private.html vs kaizenology.html
//
// Objectif (P2, "cartographier avant de factoriser") : lister les fonctions
// de meme nom presentes dans les deux fichiers dont le CORPS est identique
// ou quasi-identique, avec une estimation de taille (lignes) -- pas une
// implementation, juste un inventaire pour decider ensuite d'une approche
// (fichier JS commun charge par les deux ? autre mecanisme ?).
//
// Methode : extrait chaque declaration de fonction de haut niveau (colonne 0,
// meme convention que scripts/diff-functions-corridor-kaizenology.sh), decoupe
// le corps de la ligne de declaration a la ligne juste avant la declaration
// suivante (fonctionne car 100% des fonctions de ce fichier sont a plat, pas
// imbriquees les unes dans les autres -- verifie manuellement sur plusieurs
// dizaines de cas au cours de la session du 10/09). Compare ensuite les corps
// normalises (espaces/lignes vides ecrases) : IDENTIQUE si egalite stricte,
// QUASI-IDENTIQUE si >= 80% des lignes de la plus longue version se
// retrouvent dans l'autre (mesure grossiere, pas un vrai diff LCS -- suffisant
// pour un premier tri, pas pour decider automatiquement quoi factoriser).
// ============================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILE_A = path.join(ROOT, 'demo-private.html');
const FILE_B = path.join(ROOT, 'kaizenology.html');

const DECL_RE = /^(?:(async )function\s+(_?[A-Za-z0-9]+)\s*\(|function\s+(_?[A-Za-z0-9]+)\s*\(|const\s+(_?[A-Za-z0-9]+)\s*=\s*(?:async\s*)?\()/;

function extractFunctions(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const decls = [];
  lines.forEach((line, i) => {
    const m = DECL_RE.exec(line);
    if (m) {
      const name = m[2] || m[3] || m[4];
      decls.push({ name, start: i });
    }
  });
  const byName = new Map();
  for (let i = 0; i < decls.length; i++) {
    const { name, start } = decls[i];
    const end = i + 1 < decls.length ? decls[i + 1].start : lines.length;
    const body = lines.slice(start, end);
    // Une fonction peut apparaitre plusieurs fois (rare, mais possible avec ce
    // decoupage naif) -- on garde la premiere occurrence, la comparaison reste
    // une estimation, pas une verite absolue.
    if (!byName.has(name)) byName.set(name, { lineCount: body.length, body });
  }
  return byName;
}

function normalize(bodyLines) {
  return bodyLines
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

function similarity(bodyA, bodyB) {
  const a = normalize(bodyA);
  const b = normalize(bodyB);
  if (a.length === 0 && b.length === 0) return 1;
  const bCount = new Map();
  for (const l of b) bCount.set(l, (bCount.get(l) || 0) + 1);
  let matched = 0;
  for (const l of a) {
    const c = bCount.get(l) || 0;
    if (c > 0) { matched++; bCount.set(l, c - 1); }
  }
  return matched / Math.max(a.length, b.length);
}

const fnsA = extractFunctions(FILE_A);
const fnsB = extractFunctions(FILE_B);

const shared = [...fnsA.keys()].filter(name => fnsB.has(name));

const results = shared.map(name => {
  const a = fnsA.get(name);
  const b = fnsB.get(name);
  const aNorm = normalize(a.body).join('\n');
  const bNorm = normalize(b.body).join('\n');
  const identical = aNorm === bNorm;
  const sim = identical ? 1 : similarity(a.body, b.body);
  return { name, linesA: a.lineCount, linesB: b.lineCount, identical, sim };
});

const identical = results.filter(r => r.identical).sort((x, y) => Math.max(y.linesA, y.linesB) - Math.max(x.linesA, x.linesB));
const nearIdentical = results.filter(r => !r.identical && r.sim >= 0.8 && Math.max(r.linesA, r.linesB) >= 4)
  .sort((x, y) => Math.max(y.linesA, y.linesB) - Math.max(x.linesA, x.linesB));

const totalIdenticalLines = identical.reduce((s, r) => s + Math.max(r.linesA, r.linesB), 0);
const totalNearLines = nearIdentical.reduce((s, r) => s + Math.max(r.linesA, r.linesB), 0);

console.log('============================================================');
console.log(`INVENTAIRE DUPLICATION — ${shared.length} fonctions de meme nom presentes dans les deux fichiers`);
console.log('============================================================');
console.log('');
console.log(`--- IDENTIQUES mot pour mot (${identical.length} fonctions, ~${totalIdenticalLines} lignes cumulees) ---`);
identical.forEach(r => console.log(`  ${String(Math.max(r.linesA, r.linesB)).padStart(4)} lignes  ${r.name}`));
console.log('');
console.log(`--- QUASI-IDENTIQUES >= 80% de recouvrement, >= 4 lignes (${nearIdentical.length} fonctions, ~${totalNearLines} lignes cumulees) ---`);
nearIdentical.forEach(r => console.log(`  ${String(Math.max(r.linesA, r.linesB)).padStart(4)} lignes  ${(r.sim * 100).toFixed(0)}%  ${r.name}`));
console.log('');
console.log('============================================================');
console.log(`Total estime de code partage candidat a factorisation : ~${totalIdenticalLines + totalNearLines} lignes sur ${identical.length + nearIdentical.length} fonctions.`);
console.log('Rappel : inventaire seulement -- aucune implementation dans cette passe.');
console.log('============================================================');
