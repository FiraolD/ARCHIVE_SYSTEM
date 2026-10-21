// scripts/fix-dark-mode-2.cjs
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Targeted file-specific fixes (safer than global — only touches known patterns)
const TARGETS = [
  // ---- Modals that the first pass missed ----
  {
    file: 'src/components/AdminRequests.tsx',
    replacements: [
      // RequestDetailsModal panel
      [
        /className="bg-white rounded-3xl max-w-2xl w-full p-8"/g,
        'className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-8"',
      ],
      // RejectModal panel
      [
        /className="bg-white rounded-3xl max-w-md w-full p-8"/g,
        'className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-8"',
      ],
      // Notes / rejection / policy blocks
      [
        /text-sm text-slate-700 bg-slate-50 p-3 rounded-xl/g,
        'text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl',
      ],
      [
        /text-sm text-red-700 bg-red-50 p-3 rounded-xl/g,
        'text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl',
      ],
      [
        /className="p-3 bg-slate-50 rounded-xl"/g,
        'className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"',
      ],
      // Request ref blocks in modals
      [
        /className="p-4 bg-blue-50 rounded-xl border border-blue-100"/g,
        'className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900"',
      ],
      [
        /className="p-4 bg-slate-50 rounded-xl"/g,
        'className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl"',
      ],
      // Reject textarea
      [
        /className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-red-500\/10 outline-none"/g,
        'className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-red-500/10 outline-none"',
      ],
      // Footer empty state
      [
        /className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center"/g,
        'className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 text-center"',
      ],
      // Search input
      [
        /className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500\/10 outline-none"/g,
        'className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-800 dark:text-slate-100 dark:placeholder-slate-500"',
      ],
      // Filter select
      [
        /className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500\/10 outline-none"/g,
        'className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-800 dark:text-slate-100"',
      ],
    ],
  },

  // ---- Reports modal ----
  {
    file: 'src/components/ReportsPage.tsx',
    replacements: [
      // Generate Report modal panel
      [
        /className="bg-white rounded-3xl max-w-md w-full p-8"/g,
        'className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-8"',
      ],
      // Type/format buttons
      [
        /selectedType === type[\s\S]{0,80}'border-blue-600 bg-blue-50'[\s\S]{0,80}'border-slate-200 hover:border-blue-200'/g,
        (m) => m
          .replace("'border-blue-600 bg-blue-50'", "'border-blue-600 bg-blue-50 dark:bg-blue-950/40'")
          .replace("'border-slate-200 hover:border-blue-200'", "'border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800'"),
      ],
      [
        /selectedFormat === format[\s\S]{0,80}'border-blue-600 bg-blue-50'[\s\S]{0,80}'border-slate-200 hover:border-blue-200'/g,
        (m) => m
          .replace("'border-blue-600 bg-blue-50'", "'border-blue-600 bg-blue-50 dark:bg-blue-950/40'")
          .replace("'border-slate-200 hover:border-blue-200'", "'border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800'"),
      ],
    ],
  },

  // ---- UserManagement modal + dropdown ----
  {
    file: 'src/components/UserManagement.tsx',
    replacements: [
      // User card — fix the p-6 + missing border bug
      [
        /className="bg-white rounded-2xl border  p-6 hover:shadow-lg transition-all"/g,
        'className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all"',
      ],
      // Dropdown menu
      [
        /className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-slate-200  group-hover:block z-10"/g,
        'className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg group-hover:block z-10"',
      ],
      // UserFormModal panel
      [
        /className="bg-white rounded-3xl max-w-md w-full p-8"/g,
        'className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-8"',
      ],
      // Form inputs inside modal
      [
        /className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500\/10 outline-none"/g,
        'className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-800 dark:text-slate-100 dark:placeholder-slate-500"',
      ],
      // Role badge
      [
        /Admin: 'bg-purple-100 text-purple-700 border-purple-200'/g,
        "Admin: 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900'",
      ],
      [
        /Manager: 'bg-blue-100 text-blue-700 border-blue-200'/g,
        "Manager: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900'",
      ],
      [
        /Agent: 'bg-green-100 text-green-700 border-green-200'/g,
        "Agent: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900'",
      ],
      [
        /Viewer: 'bg-slate-100 text-slate-700 border-slate-200'/g,
        "Viewer: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'",
      ],
    ],
  },

  // ---- AddIngestFileForm reference displays ----
  {
    file: 'src/components/AddIngestFileForm.tsx',
    replacements: [
      // Success reference card
      [
        /className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl border-2 border-blue-300 p-6 shadow-lg"/g,
        'className="bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 rounded-xl border-2 border-blue-300 dark:border-green-800 p-6 shadow-lg"',
      ],
      [
        /className="text-3xl font-mono font-black text-blue-900 break-all bg-white p-4 rounded-lg border border-blue-200"/g,
        'className="text-3xl font-mono font-black text-blue-900 dark:text-green-200 break-all bg-white dark:bg-slate-900 p-4 rounded-lg border border-blue-200 dark:border-green-800"',
      ],
      [
        /className="p-4 bg-white rounded-xl border-2 border-blue-300 hover:bg-green-100 transition-colors group"/g,
        'className="p-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-blue-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-950/40 transition-colors group"',
      ],
      // Preview preview box inside gradient
      [
        /className="bg-white p-4 rounded-lg border border-blue-100 mb-3"/g,
        'className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-blue-100 dark:border-blue-900 mb-3"',
      ],
      [
        /className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-md"/g,
        'className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-xl border-2 border-blue-200 dark:border-blue-900 shadow-md"',
      ],
      // Policy period preview
      [
        /className="mt-3 flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"/g,
        'className="mt-3 flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-lg border border-blue-200 dark:border-blue-900"',
      ],
      // Access restricted
      [
        /<h2 className="text-2xl font-black text-slate-900 mb-2">Access Restricted<\/h2>/g,
        '<h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Access Restricted</h2>',
      ],
    ],
  },

  // ---- AuditTrail header row ----
  {
    file: 'src/components/AuditTrail.tsx',
    replacements: [
      [
        /className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"/g,
        'className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"',
      ],
      [
        /className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50\/50"/g,
        'className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40"',
      ],
      [
        /className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500\/20"/g,
        'className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"',
      ],
      [
        /<tr className="bg-slate-50\/50">/g,
        '<tr className="bg-slate-50/50 dark:bg-slate-800/40">',
      ],
      [
        /className="hover:bg-slate-50\/80 transition-colors"/g,
        'className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"',
      ],
      [
        /<span className="text-sm font-medium text-slate-700">{log.user}<\/span>/g,
        '<span className="text-sm font-medium text-slate-700 dark:text-slate-300">{log.user}</span>',
      ],
      [
        /<span className="text-sm text-slate-600">{log.details}<\/span>/g,
        '<span className="text-sm text-slate-600 dark:text-slate-400">{log.details}</span>',
      ],
    ],
  },

  // ---- DrawerAssignment ----
  {
    file: 'src/components/DrawerAssignment.tsx',
    replacements: [
      [
        /className="bg-white rounded-3xl border border-slate-200 p-8"/g,
        'className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-8"',
      ],
      [
        /className="bg-slate-50 rounded-2xl p-6"/g,
        'className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-6"',
      ],
      [
        /className="bg-white rounded-3xl max-w-2xl w-full p-8"/g,
        'className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-8"',
      ],
      [
        /className="bg-slate-50 p-4 rounded-xl"/g,
        'className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl"',
      ],
      [
        /className="p-4 bg-white rounded-xl border border-slate-200"/g,
        'className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"',
      ],
      [
        /className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500\/20 outline-none"/g,
        'className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none"',
      ],
      [
        /className="p-4 bg-green-50 rounded-xl border border-green-200"/g,
        'className="p-4 bg-green-50 dark:bg-green-950/40 rounded-xl border border-green-200 dark:border-green-900"',
      ],
      [
        /className="p-2 rounded-lg border text-center relative group "/g,
        'className="p-2 rounded-lg border text-center relative group dark:border-slate-700"',
      ],
    ],
  },

  // ---- AddFileToBox ----
  {
    file: 'src/components/AddFileToBox.tsx',
    replacements: [
      [
        /className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"/g,
        'className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden"',
      ],
      [
        /className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500\/20 outline-none"/g,
        'className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500/20 outline-none"',
      ],
      [
        /'border-blue-600 bg-blue-50'/g,
        "'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/40'",
      ],
      [
        /'border-slate-200 hover:border-blue-200'/g,
        "'border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800'",
      ],
    ],
  },

  // ---- OperationsDashboard ----
  {
    file: 'src/components/OperationsDashboard.tsx',
    replacements: [
      [
        /className="bg-white rounded-2xl border border-slate-200 p-6"/g,
        'className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6"',
      ],
      [
        /className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"/g,
        'className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"',
      ],
      [
        /className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"/g,
        'className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm"',
      ],
    ],
  },

  // ---- RegistrationForms ----
  {
    file: 'src/components/RegistrationForms.tsx',
    replacements: [
      [
        /'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'/g,
        "'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'",
      ],
      [
        /className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8"/g,
        'className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8"',
      ],
      [
        /className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500\/20 outline-none bg-white"/g,
        'className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"',
      ],
      [
        /className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500\/20 outline-none"/g,
        'className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 dark:placeholder-slate-500"',
      ],
      [
        /className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3"/g,
        'className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900 flex items-center gap-3"',
      ],
      [
        /className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-mono text-slate-600"/g,
        'className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400"',
      ],
    ],
  },
];

let totalChanged = 0;

for (const { file, replacements } of TARGETS) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  skip (not found): ${file}`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;
  let changes = 0;

  for (const [pattern, replacement] of replacements) {
    const before = content;
    content = content.replace(pattern, replacement);
    if (content !== before) changes++;
  }

  if (content !== original) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ ${file}  (${changes} patch${changes === 1 ? '' : 'es'})`);
    totalChanged++;
  } else {
    console.log(`   ${file}  (no change)`);
  }
}

console.log(`\n✅ Second pass complete: ${totalChanged} files patched.`);