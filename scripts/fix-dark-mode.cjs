// scripts/fix-dark-mode.cjs
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Files to process (SKIPS LoginPage, DocumentPreview, slider)
const TARGETS = [
  'src/components/AddIngestFileForm.tsx',
  'src/components/AdminRequests.tsx',
  'src/components/AuditTrail.tsx',
  'src/components/CabinetAssignment.tsx',
  'src/components/DrawerAssignment.tsx',
  'src/components/ReportsPage.tsx',
  'src/components/UserManagement.tsx',
  'src/components/RegistrationForms.tsx',
  'src/components/AddFileToBox.tsx',
  'src/components/OperationsDashboard.tsx',
  'src/components/DocumentUploader.tsx',
];

// Sequential replacements — order matters to avoid double-replacing
const REPLACEMENTS = [
  // Full white card patterns (most specific first)
  [/bg-white rounded-3xl border border-slate-200/g,          'bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700'],
  [/bg-white rounded-2xl border border-slate-200/g,          'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700'],
  [/bg-white rounded-xl border border-slate-200/g,           'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700'],
  [/bg-white rounded-3xl/g,                                  'bg-white dark:bg-slate-900 rounded-3xl'],
  [/bg-white rounded-2xl/g,                                  'bg-white dark:bg-slate-900 rounded-2xl'],
  [/bg-white p-12 rounded-3xl/g,                             'bg-white dark:bg-slate-900 p-12 rounded-3xl'],
  [/bg-white p-8 rounded-3xl/g,                              'bg-white dark:bg-slate-900 p-8 rounded-3xl'],
  [/bg-white p-6 rounded/g,                                  'bg-white dark:bg-slate-900 p-6 rounded'],

  // Slate-50 surfaces
  [/bg-slate-50 rounded-xl/g,                                'bg-slate-50 dark:bg-slate-800/60 rounded-xl'],
  [/bg-slate-50 rounded-2xl/g,                               'bg-slate-50 dark:bg-slate-800/60 rounded-2xl'],
  [/bg-slate-50 rounded-3xl/g,                               'bg-slate-50 dark:bg-slate-800/60 rounded-3xl'],
  [/bg-slate-50 p-4 rounded-xl/g,                            'bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl'],
  [/bg-slate-50 p-3 rounded-xl/g,                            'bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl'],
  [/bg-slate-50 rounded-full/g,                              'bg-slate-50 dark:bg-slate-800/60 rounded-full'],

  // Headings and text
  [/([^-])text-slate-900(?![\w-])/g,                         '$1text-slate-900 dark:text-white'],
  [/([^-])text-slate-800(?![\w-])/g,                         '$1text-slate-800 dark:text-slate-100'],
  [/([^-])text-slate-700(?![\w-])/g,                         '$1text-slate-700 dark:text-slate-300'],
  [/([^-])text-slate-600(?![\w-])/g,                         '$1text-slate-600 dark:text-slate-400'],
  [/([^-])text-slate-500(?![\w-])/g,                         '$1text-slate-500 dark:text-slate-400'],

  // Borders
  [/border border-slate-200(?! dark:border)/g,               'border border-slate-200 dark:border-slate-700'],
  [/border-slate-100(?! dark:border)/g,                      'border-slate-100 dark:border-slate-800'],
  [/divide-slate-100/g,                                      'divide-slate-100 dark:divide-slate-800'],

  // Inputs / form fields
  [/bg-slate-50 border border-slate-200 rounded-xl(?! dark:bg)/g,
   'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl'],

  // Modals backdrop
  [/bg-slate-900\/40 backdrop-blur-sm/g,                     'bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-sm'],

  // Stat/status badges — soften in dark
  [/bg-green-100 text-green-700/g,                           'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300'],
  [/bg-amber-100 text-amber-700/g,                           'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'],
  [/bg-blue-100 text-blue-700/g,                             'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'],
  [/bg-red-100 text-red-700/g,                               'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'],
  [/bg-purple-100 text-purple-700/g,                         'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'],
];

let totalChanged = 0;

for (const rel of TARGETS) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.log(`⚠️  skip (not found): ${rel}`);
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  let replacements = 0;

  for (const [pattern, replacement] of REPLACEMENTS) {
    const before = content;
    content = content.replace(pattern, replacement);
    if (content !== before) replacements++;
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`✅ ${rel}  (${replacements} pattern${replacements === 1 ? '' : 's'})`);
    totalChanged++;
  } else {
    console.log(`   ${rel}  (no change)`);
  }
}

console.log(`\n✅ Done. Modified ${totalChanged} of ${TARGETS.length} files.`);
console.log('\n⚠️  Files intentionally skipped:');
console.log('   - LoginPage.tsx          (dark gradient with glass effect — by design)');
console.log('   - DocumentPreview.tsx    ("paper" preview stays white — by design)');
console.log('   - ui/slider.tsx          (shadcn primitive — fix manually if needed)');