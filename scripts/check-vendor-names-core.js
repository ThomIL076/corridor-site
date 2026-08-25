#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function loadConfig() {
  const configPath = path.join(__dirname, 'forbidden-vendor-names.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function scanContent(content, names, fileLabel) {
  const lines = content.split('\n');
  const hits = [];
  for (const name of names) {
    const re = new RegExp(`\\b${name.replace(/\./g, '\\.')}\\b`, 'i');
    lines.forEach((line, idx) => {
      if (re.test(line)) hits.push({ file: fileLabel, line: idx + 1, name, text: line.trim().slice(0, 140) });
    });
  }
  return hits;
}

module.exports = { loadConfig, scanContent };
