// scripts/fix-dark-mode-3.cjs
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const SKIP = ['LoginPage.tsx', 'DocumentPreview.tsx'];

// Global replacements (safe across all files)
const GLOBAL = [
  // 1. bg-white followed by border + border-slate-200 dark:border-slate-700
  //    → insert dark:bg-slate-800 right after bg-white
  [
    /\bbg-white (border border-slate-200 dark:border-slate-700)/g,
    'bg-white dark:bg-slate-800 $1',
  ],

  // 2. bg-white at the end of a className (before closing quote)
  //    e.g. "... outline-none bg-white"
  [
    /\bbg-white(["'])/g,
    (m, q, offset, str) => {
      // Don't touch if this is part of hover:bg-white or dark:bg-...
      const before = str.slice(Math.max(0, offset - 6), offset);
      if (before.endsWith('hover:') || before.endsWith(':bg-')) return m;
      return `bg-white dark:bg-slate-800${q}`;
    },
  ],

  // 3. hover:bg-white → add dark:hover variant
  [
    /\bhover:bg-white(?! dark:hover)/g,
    'hover:bg-white dark:hover:bg-slate-700',
  ],

  // 4. Clean up accidental duplicate dark:border-slate-700
  [
    /dark:border-slate-700 dark:border-slate-700/g,
    'dark:border-slate-700',
  ],

  // 5. Clean up duplicate dark:text-slate-400 (from earlier passes)
  [
    /dark:text-slate-400 dark:text-slate-400/g,
    'dark:text-slate-400',
  ],

  // 6. Clean up duplicate dark:bg-slate-800
  [
    /dark:bg-slate-800 dark:bg-slate-800/g,
    'dark:bg-slate-800',
  ],

  // 7. bg-white followed by rounded-X (no border) — stat cards without borders
  //    e.g. "bg-white rounded-xl flex items-center"
  [
    /\bbg-white (rounded-(?:sm|md|lg|xl|2xl|3xl|full) (?!.*dark:bg-))/g,
    'bg-white dark:bg-slate-800 $1',
  ],
];

let modified = 0;
const details = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      walk(full);
    } else if (/\.tsx?$/.test(entry)) {
      const rel = path.relative(SRC, full);
      if (SKIP.some((s) => rel.includes(s))) continue;
      process(full, rel);
    }
  }
}

function process(file, rel) {
  const original = fs.readFileSync(file, 'utf8');
  let content = original;
  let patches = 0;

  for (const [pattern, replacement] of GLOBAL) {
    const before = content;
    content = content.replace(pattern, replacement);
    if (content !== before) patches++;
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    modified++;
    details.push(`   ✅ ${rel.replace(/\\/g, '/')}  (${patches} pattern${patches === 1 ? '' : 's'})`);
  }
}

walk(SRC);

console.log('\n' + '='.repeat(60));
console.log('THIRD PASS — Dark Mode Fix');
console.log('='.repeat(60));
if (modified === 0) {
  console.log('\n   No changes needed.');
} else {
  console.log(`\n✅ Modified ${modified} file(s):\n`);
  details.forEach((d) => console.log(d));
}
console.log('\n' + '='.repeat(60));