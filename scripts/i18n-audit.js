const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const clientSrc = path.join(root, 'client', 'src');
const i18nFile = path.join(clientSrc, 'lib', 'i18n.tsx');

function readTranslations() {
  const txt = fs.readFileSync(i18nFile, 'utf8');
  const start = txt.indexOf('const TRANSLATIONS =');
  if (start === -1) return new Set();
  const slice = txt.slice(start);
  const endIdx = slice.indexOf('};');
  if (endIdx === -1) return new Set();
  const objText = slice.slice(0, endIdx + 2);

  // crude extraction of string values within the translations block
  const strings = new Set();
  const re = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g;
  let m;
  while ((m = re.exec(objText))) {
    const val = m[1] || m[2];
    if (val && val.trim().length > 0) strings.add(val.trim());
  }
  return strings;
}

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, fileList);
    else if (full.endsWith('.tsx') || full.endsWith('.jsx') || full.endsWith('.ts') || full.endsWith('.js')) fileList.push(full);
  }
  return fileList;
}

function extractStringsFromFile(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const results = new Set();

  // find JSX text nodes: >Text< (simple heuristic)
  const jsxTextRe = />\s*([^<>"']{2,200}?)\s*</g;
  let m;
  while ((m = jsxTextRe.exec(txt))) {
    const s = m[1].trim();
    if (s) results.add(s);
  }

  // find attribute strings e.g., placeholder="Sign In"
  const attrRe = /(?:placeholder|label|title|alt|aria-label)\s*=\s*"([^"\\]+)"/g;
  while ((m = attrRe.exec(txt))) {
    const s = m[1].trim();
    if (s) results.add(s);
  }

  // also collect other double-quoted strings longer than 2 characters
  const strRe = /"([^"\\]{2,200}?)"/g;
  while ((m = strRe.exec(txt))) {
    const maybe = m[1].trim();
    if (maybe && !maybe.includes('http') && !/^[A-Za-z_0-9.]+$/.test(maybe)) results.add(maybe);
  }

  return Array.from(results);
}

function run() {
  console.log('Reading translations...');
  const translations = readTranslations();
  console.log('Found', translations.size, 'translation strings');

  console.log('Scanning client source...');
  const files = walk(clientSrc);
  const missing = {};
  for (const f of files) {
    const strs = extractStringsFromFile(f);
    for (const s of strs) {
      if (!translations.has(s)) {
        if (!missing[f]) missing[f] = [];
        missing[f].push(s);
      }
    }
  }

  const outPath = path.join(root, 'i18n-coverage.json');
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), missing }, null, 2));
  console.log('Audit complete. Report:', outPath);
}

run();
