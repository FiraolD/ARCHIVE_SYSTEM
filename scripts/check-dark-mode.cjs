const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

const PATTERNS = [
  { re: /(?:^|["'\s])bg-white(?![\w-])/g,       needs: 'dark:bg-slate-900' },
  { re: /(?:^|["'\s])bg-slate-50(?![\w-])/g,    needs: 'dark:bg-slate-800' },
  { re: /(?:^|["'\s])text-slate-900(?![\w-])/g, needs: 'dark:text-white' },
  { re: /(?:^|["'\s])text-slate-800(?![\w-])/g, needs: 'dark:text-slate-100' },
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
      check(full);
    }
  }
}

function check(file) {
  const rel = path.relative(path.join(__dirname, '..'), file);
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  lines.forEach((line, i) => {
    // Only check className/class strings
    if (!/(?:className|class)=["'][^"']*["']/.test(line)) return;
    if (line.includes('dark:')) return;  // has any dark variant → likely fine

    for (const { re, needs } of PATTERNS) {
      re.lastIndex = 0;
      if (re.test(line) && !line.includes(needs)) {
        if (!byFile[rel]) byFile[rel] = [];
        byFile[rel].push({ line: i + 1, text: line.trim().slice(0, 120) });
        issues++;
        break;
      }
    }
  });
}

walk(SRC);

if (issues === 0) {
  console.log('✅ All class strings have dark: variants (or none needed).');
} else {
  console.log(`\n⚠️  ${issues} lines possibly missing dark variants:\n`);
  for (const [file, items] of Object.entries(byFile)) {
    console.log(`\n📄 ${file}`);
    items.slice(0, 8).forEach(({ line, text }) => console.log(`   L${line}: ${text}`));
    if (items.length > 8) console.log(`   ...${items.length - 8} more`);
  }
}