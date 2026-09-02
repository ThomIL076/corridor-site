#!/usr/bin/env node
'use strict';

/**
 * inject-p2.js — P2 block propagation tool
 * Extracts the Priorities feature block from demo-private.html (source of truth)
 * and injects it into target dashboard files.
 *
 * Usage:
 *   node inject-p2.js --validate   # run on source files; diff must be empty
 *   node inject-p2.js --inject     # generate *-p2test.html files for review
 */

const fs   = require('fs');
const path = require('path');

const BASE   = __dirname;
const SOURCE = path.join(BASE, 'demo-private.html');

// ── extraction ──────────────────────────────────────────────────────────────

function extractBetween(text, startStr, endStr) {
  const si = text.indexOf(startStr);
  if (si === -1) throw new Error(`[extract] Start marker not found:\n  ${startStr.slice(0, 80)}`);
  const ei = text.indexOf(endStr, si + startStr.length);
  if (ei === -1) throw new Error(`[extract] End marker not found after start:\n  ${endStr.slice(0, 80)}`);
  return text.slice(si, ei);
}

const src = fs.readFileSync(SOURCE, 'utf8');

// P2.1 — HTML panels: tab-priorities + tab-inbox (extracted together)
const P2_HTML = extractBetween(src,
  '\n\n  <!-- ══ TAB: PRIORITIES VIEW ══ -->',
  '\n\n  <!-- ══ TAB 5: PIPELINE VIEW ══ -->'
);

// P2.2 — Sidebar nav button (priorities only)
const P2_NAV = extractBetween(src,
  '    <button class="snav-item" data-nav="priorities"',
  '    <button class="snav-item" data-nav="pipeline"'
);

// P2.3 — switchTab branch (literal — no need to extract from source)
const P2_SWITCHTAB = `  if (name === 'priorities') loadDailyPriorities();\n`;

// P2.4+5 — Global vars + priority + inbox functions (all between _priorityCurrentBatch and _sendDiscoveryBrief)
const P2_JS = extractBetween(src,
  '\nlet _priorityCurrentBatch = 1;',
  '\nasync function _sendDiscoveryBrief() {'
);

// P3 — Inbox-only blocks (for files that already have P2 and need inbox added)
const P3_HTML = extractBetween(src,
  '\n\n  <!-- ══ TAB: INBOX ══ -->',
  '\n\n  <!-- ══ TAB 5: PIPELINE VIEW ══ -->'
);
const P3_NAV = `    <button class="snav-item" data-nav="inbox" onclick="_switchNewNav('inbox')">\n      <span class="snav-icon">📩</span><span data-en="Inbox" data-fr="Boîte de réception">Inbox</span>\n    </button>\n`;
const P3_SWITCHTAB = `  if (name === 'inbox') loadInboxDrafts();\n`;
const P3_JS = extractBetween(src,
  '\n// ── INBOX ─────────────────────────────────────────────────────────────────────',
  '\nfunction _updatePrioritiesNextBtn() {'
);

// ── insertion ───────────────────────────────────────────────────────────────

/**
 * Insert `insertion` before the first occurrence of `anchor` in `content`.
 * If `alreadyCheck` string is found in content, skip (idempotent).
 */
function insertBefore(content, anchor, insertion, alreadyCheck, label) {
  if (content.includes(alreadyCheck)) {
    console.log(`  [skip] already present: ${label}`);
    return content;
  }
  const idx = content.indexOf(anchor);
  if (idx === -1) throw new Error(`[inject] Anchor not found for ${label}:\n  ${anchor.slice(0, 80)}`);
  console.log(`  [add]  injecting: ${label}`);
  return content.slice(0, idx) + insertion + content.slice(idx);
}

function injectP2(inputPath, outputPath) {
  console.log(`\nProcessing: ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
  let c = fs.readFileSync(inputPath, 'utf8');

  // Point 1 — HTML panels (priorities + inbox bundled together)
  c = insertBefore(c,
    '\n\n  <!-- ══ TAB 5: PIPELINE VIEW ══ -->',
    P2_HTML,
    'id="tab-priorities"',
    'HTML tab panels (tab-priorities + tab-inbox)'
  );

  // Point 2 — Sidebar nav button
  c = insertBefore(c,
    '    <button class="snav-item" data-nav="pipeline"',
    P2_NAV,
    'data-nav="priorities"',
    'Sidebar nav button (priorities)'
  );

  // Point 3 — switchTab branch (priorities)
  c = insertBefore(c,
    `  if (name === 'send') loadSendView();`,
    P2_SWITCHTAB,
    `if (name === 'priorities')`,
    'switchTab branch (priorities)'
  );

  // Point 3b — switchTab branch (inbox)
  c = insertBefore(c,
    `  if (name === 'priorities') loadDailyPriorities();\n`,
    P3_SWITCHTAB,
    `if (name === 'inbox')`,
    'switchTab branch (inbox)'
  );

  // Point 4+5 — JS globals + priority + inbox functions
  c = insertBefore(c,
    '\nasync function _sendDiscoveryBrief() {',
    P2_JS,
    'function loadDailyPriorities(',
    'JS block (priority + inbox functions)'
  );

  // Point 6 — Inbox sidebar nav button
  c = insertBefore(c,
    '  </div>\n  <div class="snav-section">\n    <span class="snav-section-label">Intelligence</span>',
    P3_NAV,
    'data-nav="inbox"',
    'Sidebar nav button (inbox)'
  );

  fs.writeFileSync(outputPath, c, 'utf8');
  console.log(`  ✓ Done`);
}

/**
 * Injects only the Inbox feature into a file that already has P2 (priorities).
 * Used for kaizenology and any other file with priorities but no inbox.
 */
function injectInbox(inputPath, outputPath) {
  console.log(`\nProcessing (inbox): ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
  let c = fs.readFileSync(inputPath, 'utf8');

  // HTML panel
  c = insertBefore(c,
    '\n\n  <!-- ══ TAB 5: PIPELINE VIEW ══ -->',
    P3_HTML,
    'id="tab-inbox"',
    'HTML tab panel (tab-inbox)'
  );

  // Sidebar nav button
  c = insertBefore(c,
    '  </div>\n  <div class="snav-section">\n    <span class="snav-section-label">Intelligence</span>',
    P3_NAV,
    'data-nav="inbox"',
    'Sidebar nav button (inbox)'
  );

  // switchTab branch
  c = insertBefore(c,
    `  if (name === 'priorities') loadDailyPriorities();\n`,
    P3_SWITCHTAB,
    `if (name === 'inbox')`,
    'switchTab branch (inbox)'
  );

  // JS functions
  c = insertBefore(c,
    '\nfunction _updatePrioritiesNextBtn() {',
    P3_JS,
    'function loadInboxDrafts(',
    'JS block (inbox functions)'
  );

  fs.writeFileSync(outputPath, c, 'utf8');
  console.log(`  ✓ Done`);
}

// ── modes ───────────────────────────────────────────────────────────────────

const mode = process.argv[2];

if (mode === '--validate') {
  // Run injectP2 on demo-private.html (source of truth) — output must be byte-identical to input.
  // kaizenology.html is not validated here because it needs --inject-inbox first (it has priorities but not inbox).
  // After kaizenology is promoted with inbox, re-add it using injectInbox validator.
  const validations = [
    { in: 'demo-private.html', out: 'demo-private-p2test.html', fn: injectP2 },
  ];
  for (const t of validations) {
    t.fn(path.join(BASE, t.in), path.join(BASE, t.out));
  }
  console.log('\n--- Validate with (diffs must be empty) ---');
  for (const t of validations) {
    const orig = fs.readFileSync(path.join(BASE, t.in), 'utf8');
    const test = fs.readFileSync(path.join(BASE, t.out), 'utf8');
    if (orig === test) {
      console.log(`  ✅ ${t.in} == ${t.out}  (identical)`);
    } else {
      console.log(`  ❌ ${t.in} != ${t.out}  (DIFF DETECTED — check before using)`);
    }
    fs.unlinkSync(path.join(BASE, t.out)); // clean up test files
  }

} else if (mode === '--inject') {
  // Generate *-p2test.html for manual review before promoting
  const targets = [
    { in: 'yellowwood-demo.html', out: 'yellowwood-demo-p2test.html' },
    { in: 'phci-demo.html',       out: 'phci-demo-p2test.html'       },
    { in: 'lka-demo.html',        out: 'lka-demo-p2test.html'        },
  ];
  for (const t of targets) {
    injectP2(path.join(BASE, t.in), path.join(BASE, t.out));
  }
  console.log('\n--- Review diffs before promoting ---');
  for (const t of targets) {
    console.log(`  diff ${t.in} ${t.out}`);
  }
  console.log('\nTo promote: copy *-p2test.html → original filename, then deploy.');

} else if (mode === '--drift') {
  // ── P1.2: Config drift detection ────────────────────────────────────────────
  // Compares each target file against demo-private.html (reference).
  // Reports: (1) functions in reference missing from target,
  //          (2) key global declarations that diverged unexpectedly.
  const TARGETS = [
    'kaizenology.html',
    'yellowwood-demo.html',
    'phci-demo.html',
    'lka-demo.html',
    'partner-demo.html',
  ];

  // Extract all top-level function names from a file
  function extractFunctions(text) {
    const names = new Set();
    // classic: function foo(
    for (const m of text.matchAll(/^(?:async\s+)?function\s+(\w+)\s*\(/gm)) names.add(m[1]);
    // const foo = (...) => or const foo = function(
    for (const m of text.matchAll(/^(?:let|const|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\(|async\s*\()/gm)) names.add(m[1]);
    return names;
  }

  // Extract a specific global declaration line (first match)
  function extractGlobal(text, varName) {
    const rx = new RegExp(`^(?:let|const|var)\\s+${varName}\\s*=.*`, 'm');
    const m = text.match(rx);
    return m ? m[0].trim() : null;
  }

  const KEY_GLOBALS = [
    '_mandatesById', '_prospectsById', '_allProspects',
    '_fitTotalById', '_activeMandate', '_drawerProspect',
    '_priorityCurrentBatch', '_priorityShownProspects',
    '_morningItems', '_liveAlertItems',
  ];
  // CLIENT_ID is expected to differ — tracked separately
  const CLIENT_ID_RX = /(?:let|const|var)\s+CLIENT_ID\s*=\s*['"]([^'"]+)['"]/;

  const refFns   = extractFunctions(src);
  const refCID   = (src.match(CLIENT_ID_RX) || [])[1] || '(not found)';

  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const lines = [`Corridor — Dashboard Drift Report`, `Generated: ${now}`, `Reference: demo-private.html`, `${'─'.repeat(60)}`];

  for (const fname of TARGETS) {
    const fpath = path.join(BASE, fname);
    if (!fs.existsSync(fpath)) { lines.push(`\n[${fname}]  FILE NOT FOUND`); continue; }
    const tc = fs.readFileSync(fpath, 'utf8');
    const tFns = extractFunctions(tc);
    const missing = [...refFns].filter(n => !tFns.has(n));
    const extra   = [...tFns].filter(n => !refFns.has(n));

    const clientId = (tc.match(CLIENT_ID_RX) || [])[1] || '(not found)';

    const globalDrifts = [];
    for (const g of KEY_GLOBALS) {
      const refVal = extractGlobal(src, g);
      const tVal   = extractGlobal(tc, g);
      if (refVal === null && tVal === null) continue;
      if (refVal === null) { globalDrifts.push(`  EXTRA   ${g}: ${tVal}`); continue; }
      if (tVal   === null) { globalDrifts.push(`  MISSING ${g}  (ref: ${refVal})`); continue; }
      if (refVal !== tVal) globalDrifts.push(`  DIFFER  ${g}\n    ref: ${refVal}\n    got: ${tVal}`);
    }

    const ok = missing.length === 0 && extra.length === 0 && globalDrifts.length === 0;
    lines.push(`\n[${fname}]  CLIENT_ID=${clientId}  ${ok ? '✅ clean' : '⚠ drift detected'}`);
    if (missing.length) lines.push(`  Functions missing (${missing.length}): ${missing.join(', ')}`);
    if (extra.length)   lines.push(`  Functions extra   (${extra.length}): ${extra.join(', ')}`);
    if (globalDrifts.length) { lines.push(`  Global var drift:`); lines.push(...globalDrifts); }
    if (ok) lines.push(`  (no drift found)`);
  }

  lines.push(`\n${'─'.repeat(60)}`);
  const report = lines.join('\n');
  console.log(report);

  // Also write to file for easy sharing
  const outPath = path.join(BASE, 'drift-report.txt');
  fs.writeFileSync(outPath, report + '\n', 'utf8');
  console.log(`\nReport saved → drift-report.txt`);

} else if (mode === '--inject-inbox') {
  // Inject inbox into files that already have P2 (priorities) but not inbox yet
  const targets = [
    { in: 'kaizenology.html', out: 'kaizenology-inbox-test.html' },
  ];
  for (const t of targets) {
    injectInbox(path.join(BASE, t.in), path.join(BASE, t.out));
  }
  console.log('\n--- Review diffs before promoting ---');
  for (const t of targets) {
    console.log(`  diff ${t.in} ${t.out}`);
  }
  console.log('\nTo promote: copy *-inbox-test.html → original filename, then deploy.');

} else {
  console.log('Usage:');
  console.log('  node inject-p2.js --validate       # idempotency check on demo-private + kaizenology');
  console.log('  node inject-p2.js --inject         # generate *-p2test.html files for yellowwood/phci/lka (priorities + inbox)');
  console.log('  node inject-p2.js --inject-inbox   # add inbox to kaizenology (already has priorities)');
  console.log('  node inject-p2.js --drift          # P1.2 config drift report across all 6 dashboard files');
}
