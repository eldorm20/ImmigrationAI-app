const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function listFiles(targetDir = 'client') {
  try {
    const out = execSync(`git grep -l "^<<<<<<< HEAD" -- ${targetDir}`, { encoding: 'utf8' });
    return out.split(/\r?\n/).filter(Boolean);
  } catch (e) {
    return [];
  }
}

function fixFile(file) {
  const abs = path.resolve(file);
  const bak = abs + '.bak';
  fs.copyFileSync(abs, bak);
  let src = fs.readFileSync(abs, 'utf8');
  const re = /<<<<<<<.*?=======\n([\s\S]*?)\n>>>>>>>.*?\n/gs;
  let replaced = 0;
  src = src.replace(re, (_, g1) => { replaced++; return g1 + '\n'; });
  if (replaced > 0) {
    fs.writeFileSync(abs, src, 'utf8');
    console.log(`Fixed ${file} (${replaced} blocks)`);
  } else {
    console.log(`No blocks in ${file}`);
  }
}

const target = process.argv[2] || 'client';
const files = listFiles(target);
if (files.length === 0) {
  console.log('No files with conflict markers found.');
  process.exit(0);
}
for (const f of files) {
  try { fixFile(f); } catch (e) { console.error('Error fixing', f, e); }
}
console.log('Done.');
