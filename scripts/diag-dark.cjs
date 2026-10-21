// scripts/diag-dark.cjs
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

// Files with intentionally light surfaces (skip)
const SKIP = [
  'LoginPage.tsx',
  'DocumentPreview.tsx',
  'ui/slider.tsx',
];

let issues = 0;
const byFile = {};

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      walk(full);
    } else if (/\.tsx?$/.test(entry)) {
      const rel = path.relative(SRC, full);
      if (SKIP.some((s) => rel.replace(/\\/g, '/').includes(s))) continue;
      check(full, rel);
    }
  }
}

function check(file, rel) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // Must be a class string
    if (!/(?:className|class)=["'][^"']*["']/.test(line)) return;

    // Check for bg-white without dark: on the same line
    const hasBgWhite = /\bbg-white(?![\w-])/.test(line);
    const hasBgDark = /dark:bg-/.test(line);
    if (hasBgWhite && !hasBgDark) {
      if (!byFile[rel]) byFile[rel] = [];
      byFile[rel].push({ line: i + 1, kind: 'bg-white', text: line.trim().slice(0, 140) });
      issues++;
      return;
    }

    // Check for text-slate-900 without dark:text
    const hasText900 = /\btext-slate-900(?![\w-])/.test(line);
    const hasTextDark = /dark:text-/.test(line);
    if (hasText900 && !hasTextDark) {
      if (!byFile[rel]) byFile[rel] = [];
      byFile[rel].push({ line: i + 1, kind: 'text-slate-900', text: line.trim().slice(0, 140) });
      issues++;
      return;
    }

    // text-slate-800 without dark:text
    const hasText800 = /\btext-slate-800(?![\w-])/.test(line);
    if (hasText800 && !hasTextDark) {
      if (!byFile[rel]) byFile[rel] = [];
      byFile[rel].push({ line: i + 1, kind: 'text-slate-800', text: line.trim().slice(0, 140) });
      issues++;
    }
  });
}

walk(SRC);

if (issues === 0) {
  console.log('✅ NO REMAINING GAPS. Dark mode is complete.');
  console.log('\n   Intentionally light surfaces (skipped):');
  SKIP.forEach((s) => console.log(`   - ${s}`));
} else {
  console.log(`\n⚠️  ${issues} line(s) still need dark variants:\n`);
  for (const [file, items] of Object.entries(byFile)) {
    console.log(`\n📄 src/${file.replace(/\\/g, '/')}`);
    items.slice(0, 10).forEach(({ line, kind, text }) => {
      console.log(`   L${line} [${kind}]: ${text}`);
    });
    if (items.length > 10) console.log(`   ...${items.length - 10} more`);
  }
}