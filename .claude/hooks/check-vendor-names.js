#!/usr/bin/env node
const fs = require('fs');
const { loadConfig, scanContent } = require('../../scripts/check-vendor-names-core.js');

const DEPLOY_TRIGGERS = [/git\s+commit/, /git\s+push/, /vercel\s+(--prod|deploy)/];

const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(Buffer.concat(chunks).toString()); }
  catch { process.exit(0); }
  if (input.tool_name !== 'Bash') process.exit(0);
  const cmd = input.tool_input?.command || '';
  if (!DEPLOY_TRIGGERS.some(re => re.test(cmd))) process.exit(0);

  const { names, targetFiles } = loadConfig();
  let allHits = [];
  for (const f of targetFiles) {
    if (!fs.existsSync(f)) continue;
    allHits = allHits.concat(scanContent(fs.readFileSync(f, 'utf8'), names, f));
  }
  if (allHits.length > 0) {
    process.stdout.write(`BLOCKED [check-vendor-names]: ${allHits.length} occurrence(s) fournisseur trouvee(s) avant deploy.\n`);
    for (const h of allHits) process.stdout.write(`  ${h.file}:${h.line} [${h.name}] ${h.text}\n`);
    process.exit(2);
  }
  process.stdout.write(`[check-vendor-names] OK.\n`);
  process.exit(0);
});
