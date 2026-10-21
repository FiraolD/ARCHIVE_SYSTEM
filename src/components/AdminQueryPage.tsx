import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Trash2, AlertTriangle, CheckCircle2, XCircle, Clock,
  Database, Copy, CheckCheck, ChevronDown, History, Shield,
  Loader2, Table, Code,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../services/api';

interface QueryResult {
  statementType: string;
  command?: string;
  rowCount: number;
  duration: number;
  truncated: boolean;
  rows: Record<string, any>[];
  fields: { name: string; dataTypeID: number }[];
  isWrite?: boolean;
  isDDL?: boolean;
}

interface QueryError {
  error: string;
  code?: string;
  detail?: string;
  hint?: string;
  position?: number;
  statementType?: string;
}

const SAMPLE_QUERIES = [
  {
    label: 'All active users',
    sql: `SELECT id, name, email, role, department_name, is_active
FROM users
WHERE is_active = TRUE
ORDER BY created_at DESC;`,
  },
  {
    label: 'Recent documents (last 20)',
    sql: `SELECT archive_reference_number, title, type, status, created_at
FROM documents
ORDER BY created_at DESC
LIMIT 20;`,
  },
  {
    label: 'Document counts by type',
    sql: `SELECT type, COUNT(*) AS total
FROM documents
GROUP BY type
ORDER BY total DESC;`,
  },
  {
    label: 'Pending file requests',
    sql: `SELECT request_reference, status, request_date, expected_return_date
FROM file_requests
WHERE status = 'Pending'
ORDER BY request_date ASC;`,
  },
  {
    label: 'Overdue requests',
    sql: `SELECT fr.request_reference, fr.expected_return_date,
       d.archive_reference_number, d.title
FROM file_requests fr
JOIN documents d ON fr.document_id = d.id
WHERE fr.status IN ('Approved', 'Pending')
  AND fr.expected_return_date < CURRENT_DATE
ORDER BY fr.expected_return_date ASC;`,
  },
  {
    label: 'Recent audit activity',
    sql: `SELECT timestamp, user_name, action, resource, details
FROM audit_logs
ORDER BY timestamp DESC
LIMIT 50;`,
  },
  {
    label: 'Storage by branch',
    sql: `SELECT b.name AS branch,
       COUNT(d.id) AS document_count,
       SUM(d.file_size) / 1024.0 / 1024.0 AS total_mb
FROM documents d
JOIN branches b ON d.branch_id = b.id
GROUP BY b.name
ORDER BY total_mb DESC;`,
  },
];

export const AdminQueryPage: React.FC = () => {
  const [sql, setSql] = useState('');
  const [allowWrite, setAllowWrite] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<QueryError | null>(null);
  const [showSamples, setShowSamples] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<{ sql: string; at: number }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDDLDetected = /\b(CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|RENAME)\b/i.test(sql);
  const isWriteDetected = /\b(INSERT|UPDATE|DELETE|MERGE)\b/i.test(sql);

  const handleRun = async () => {
    if (!sql.trim()) {
      toast.error('Enter a SQL query first');
      return;
    }

    // Confirm dangerous operations
    if (isDDLDetected && allowWrite) {
      const confirmed = window.confirm(
        '⚠️ This query contains DDL (CREATE/ALTER/DROP/etc).\n\n' +
        'This can permanently change your database schema.\n\n' +
        'Are you sure you want to run it?'
      );
      if (!confirmed) return;
    }

    setIsRunning(true);
    setResult(null);
    setError(null);

    try {
      const response = await adminApi.executeQuery(sql, allowWrite);
      setResult(response.data);

      // Add to history
      setHistory(prev => [
        { sql, at: Date.now() },
        ...prev.filter(h => h.sql !== sql),
      ].slice(0, 10));

      if (response.data.isWrite || response.data.isDDL) {
        toast.success(
          `${response.data.statementType} executed — ${response.data.rowCount} row(s) affected`
        );
      } else {
        toast.success(
          `Query OK — ${response.data.rowCount} row(s) in ${response.data.duration}ms`
        );
      }
    } catch (err: any) {
      const errData = err.response?.data || { error: err.message };
      setError(errData);
      toast.error(errData.error || 'Query failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  };

  const copyResult = () => {
    if (!result) return;
    const json = JSON.stringify(result.rows, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    toast.success('Result copied as JSON');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">SQL Query Console</h1>
              <p className="text-slate-400 text-sm">Direct database access for administrators</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Database size={180} />
        </div>
      </div>

      {/* Warning banner */}
      <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-900 rounded-2xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="text-sm text-red-800 dark:text-red-300">
          <p className="font-bold mb-1">Read-only by default.</p>
          <p>
            Write operations (INSERT/UPDATE/DELETE) and DDL require enabling "Allow write operations".
            Every query is logged to the audit trail. Queries time out after 30 seconds and results are capped at 1000 rows.
          </p>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
              <Code className="w-4 h-4" />
              SQL Editor
            </div>

            <button
              onClick={() => setShowSamples(!showSamples)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center gap-1 transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSamples ? 'rotate-180' : ''}`} />
              Sample queries
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Write toggle */}
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer border transition-colors ${
              allowWrite
                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}>
              <input
                type="checkbox"
                checked={allowWrite}
                onChange={(e) => setAllowWrite(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              <span className={`text-xs font-bold ${allowWrite ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                Allow write operations
              </span>
            </label>

            <button
              onClick={() => { setSql(''); setResult(null); setError(null); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>

            <button
              onClick={handleRun}
              disabled={isRunning || !sql.trim()}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run
              <span className="text-[10px] opacity-70 font-mono">Ctrl+Enter</span>
            </button>
          </div>
        </div>

        {/* Sample queries dropdown */}
        <AnimatePresence>
          {showSamples && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 overflow-hidden"
            >
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {SAMPLE_QUERIES.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => {
                      setSql(s.sql);
                      setShowSamples(false);
                      textareaRef.current?.focus();
                    }}
                    className="text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-white dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="-- Type your SQL here. Ctrl+Enter to run.
SELECT * FROM documents LIMIT 10;"
            spellCheck={false}
            className="w-full h-64 p-5 font-mono text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 dark:text-slate-200 outline-none resize-y border-none"
          />
          {/* Warnings overlay */}
          {sql && (isWriteDetected || isDDLDetected) && (
            <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
              {isDDLDetected && (
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-[10px] font-bold uppercase tracking-wider">
                  ⚠️ DDL detected
                </span>
              )}
              {isWriteDetected && !isDDLDetected && (
                <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                  Write operation detected
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
              <History className="w-4 h-4" />
              Recent queries ({history.length})
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-slate-200 dark:border-slate-700"
              >
                <div className="p-3 space-y-1">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => { setSql(h.sql); textareaRef.current?.focus(); }}
                      className="w-full text-left p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <p className="text-xs font-mono text-slate-700 dark:text-slate-300 line-clamp-2">
                        {h.sql.slice(0, 200)}{h.sql.length > 200 ? '...' : ''}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(h.at).toLocaleTimeString()}
                      </p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Result header */}
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-green-50 dark:bg-green-950/30 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-bold text-green-900 dark:text-green-300">
                  {result.statementType} — {result.rowCount} row{result.rowCount === 1 ? '' : 's'}
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-2 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {result.duration}ms
                  {result.truncated && (
                    <span className="font-bold">
                      • Truncated to 1000 rows (showing first 1000)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={copyResult}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Copy JSON
            </button>
          </div>

          {/* Result table */}
          {result.rows.length > 0 ? (
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                  <tr>
                    {result.fields.map((f) => (
                      <th
                        key={f.name}
                        className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-slate-200 dark:border-slate-700"
                      >
                        {f.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      {result.fields.map((f) => (
                        <td
                          key={f.name}
                          className="px-4 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-xs truncate font-mono text-xs"
                          title={String(row[f.name] ?? '')}
                        >
                          {row[f.name] === null ? (
                            <span className="text-slate-300 dark:text-slate-600 italic">NULL</span>
                          ) : typeof row[f.name] === 'object' ? (
                            <span className="text-blue-600">{JSON.stringify(row[f.name])}</span>
                          ) : (
                            String(row[f.name])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <Table className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">
                {result.isWrite || result.isDDL
                  ? `Command completed. ${result.rowCount} row(s) affected.`
                  : 'No rows returned.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 rounded-3xl border-2 border-red-200 dark:border-red-900 p-5">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-900 dark:text-red-300 mb-1">
                Query failed {error.statementType && `(${error.statementType})`}
              </p>
              <p className="text-sm text-red-800 dark:text-red-400 font-mono">
                {error.error}
              </p>
              {error.code && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  <span className="font-bold">Code:</span> {error.code}
                </p>
              )}
              {error.detail && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  <span className="font-bold">Detail:</span> {error.detail}
                </p>
              )}
              {error.hint && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  <span className="font-bold">Hint:</span> {error.hint}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};