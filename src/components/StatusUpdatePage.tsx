import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, RefreshCcw, CheckCircle, Package, History, FileText, Calendar, User,
  ChevronRight, ArrowLeft, FileQuestion, AlertCircle, Loader2, X,
} from 'lucide-react';
import { Document, FileStatus } from '../types';
import { useArchive } from '../context/ArchiveContext';
import { documentApi } from '../services/api';
import { toast } from 'sonner';
import { PageHeader, EmptyState, SearchInput, SectionCard } from './ui';

/* ---------------------------------- helpers -------------------------------- */

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

const refOf = (d: any): string => d.archive_reference_number || d.archiveReferenceNumber || '';
const dateOf = (d: any): string => {
  const raw = d.createdAt || d.created_at;
  return raw ? new Date(raw).toLocaleDateString() : '';
};

const STATUS_STYLE: Record<string, { dot: string; badge: string }> = {
  Active: { dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  'Checked-out': { dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  Returned: { dot: 'bg-purple-500', badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
};
const styleOf = (s: string) =>
  STATUS_STYLE[s] ?? { dot: 'bg-sky-500', badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-400' };

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styleOf(status).badge}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${styleOf(status).dot}`} />
    {status}
  </span>
);

const STATUS_OPTIONS: { status: FileStatus; icon: React.ElementType; label: string; tone: string }[] = [
  { status: 'Active' as FileStatus, icon: History, label: 'Set as Active (available)', tone: 'text-emerald-700 dark:text-emerald-400' },
  { status: 'Checked-out' as FileStatus, icon: Package, label: 'Mark as Checked-out', tone: 'text-amber-700 dark:text-amber-400' },
  { status: 'Settled Claims' as FileStatus, icon: CheckCircle, label: 'Mark as Settled Claims', tone: 'text-sky-700 dark:text-sky-400' },
  { status: 'Returned' as FileStatus, icon: ArrowLeft, label: 'Mark as Returned (pending verification)', tone: 'text-purple-700 dark:text-purple-400' },
];

/* ----------------------------------- page ---------------------------------- */

export const StatusUpdatePage: React.FC = () => {
  const { updateDocumentStatus } = useArchive();

  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim(), 300);

  const [results, setResults] = useState<Document[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [returnedDocs, setReturnedDocs] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  /* Files users have returned and a clerk still has to verify (asked from the server,
     so it no longer depends on which page of the archive happens to be loaded). */
  const loadReturned = useCallback(async () => {
    try {
      const res = await documentApi.getDocuments({ status: 'Returned', limit: 50 });
      setReturnedDocs(res.data.documents || []);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => { loadReturned(); }, [loadReturned]);

  /* Search the WHOLE archive on the server (previously only the loaded page was searched). */
  useEffect(() => {
    if (!debounced) { setResults([]); setIsSearching(false); return; }
    let cancelled = false;
    setIsSearching(true);
    documentApi
      .getDocuments({ search: debounced, limit: 20 })
      .then((res) => { if (!cancelled) setResults(res.data.documents || []); })
      .catch(() => { if (!cancelled) toast.error('Search failed'); })
      .finally(() => { if (!cancelled) setIsSearching(false); });
    return () => { cancelled = true; };
  }, [debounced]);

  /* Esc closes the action panel */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedDoc(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const applyStatus = async (doc: Document, status: FileStatus) => {
    try {
      setUpdatingId(doc.id);
      await updateDocumentStatus(doc.id, status);
      setResults((prev) => prev.map((d) => (d.id === doc.id ? ({ ...d, status } as Document) : d)));
      if (selectedDoc?.id === doc.id) setSelectedDoc(null);
      await loadReturned();
    } catch {
      /* context shows the error */
    } finally {
      setUpdatingId(null);
    }
  };

  const busy = updatingId !== null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Status Management"
        subtitle="Update document lifecycle states and transitions"
        icon={RefreshCcw}
      />

      {/* 1. Returned files waiting for a clerk to verify them */}
      {returnedDocs.length > 0 && (
        <SectionCard title={`Awaiting verification (${returnedDocs.length})`} icon={AlertCircle}>
          <p className="mb-4 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Users have returned these files. Check that each one is physically back, then mark it Active.
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {returnedDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  selectedDoc?.id === doc.id
                    ? 'border-[#1E3C90] bg-[#1E3C90]/5 ring-2 ring-[#1E3C90]/20 dark:border-[#16B0DF] dark:bg-[#16B0DF]/10'
                    : 'border-slate-200 bg-white hover:border-[#1E3C90]/40 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[#16B0DF]/40'
                }`}
              >
                <p className="truncate font-semibold text-slate-900 dark:text-white">{doc.title}</p>
                <p className="mt-1 font-mono text-xs text-[#1E3C90] dark:text-[#16B0DF]">{refOf(doc)}</p>
                <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                  {doc.insured_name || 'No insured name'}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={(e) => { e.stopPropagation(); applyStatus(doc, 'Active' as FileStatus); }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {updatingId === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  Verified, set Active
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 2. Search + action panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <SearchInput value={query} onChange={setQuery} placeholder="Search by reference #, claim #, policy #, insured or title…" />
          </div>

          {isSearching && results.length === 0 ? (
            <div className="space-y-3" aria-busy>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[88px] animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
              ))}
            </div>
          ) : !debounced && !query ? (
            <EmptyState icon={Search} title="Ready for lookup"
              description="Search for a document above, or pick one from the awaiting verification list." />
          ) : results.length === 0 && !isSearching ? (
            <EmptyState icon={FileQuestion} title="No documents found" description={`No matches for "${debounced}"`} />
          ) : (
            <div className={`space-y-3 transition-opacity ${isSearching ? 'opacity-60' : ''}`}>
              <AnimatePresence initial={false}>
                {results.map((doc) => (
                  <motion.button
                    key={doc.id}
                    type="button"
                    layout="position"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setSelectedDoc(doc)}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                      selectedDoc?.id === doc.id
                        ? 'border-[#1E3C90] bg-[#1E3C90]/5 ring-2 ring-[#1E3C90]/20 dark:border-[#16B0DF] dark:bg-[#16B0DF]/10'
                        : 'border-slate-200 bg-white hover:border-[#1E3C90]/40 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[#16B0DF]/40'
                    }`}
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-100 dark:bg-white/5">
                      <FileText className="h-6 w-6 text-slate-400" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-[#1E3C90]/10 px-2 py-0.5 font-mono text-xs font-medium text-[#1E3C90] dark:bg-[#16B0DF]/15 dark:text-[#16B0DF]">
                          {refOf(doc)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{doc.type}</span>
                      </span>
                      <span className="mt-1 block truncate font-semibold text-slate-900 dark:text-white">{doc.title}</span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {dateOf(doc) && (
                          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{dateOf(doc)}</span>
                        )}
                        {doc.owner && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{doc.owner}</span>}
                        <StatusBadge status={doc.status} />
                      </span>
                    </span>
                    <ChevronRight className={`h-5 w-5 shrink-0 transition-transform ${selectedDoc?.id === doc.id ? 'rotate-90 text-[#1E3C90] dark:text-[#16B0DF]' : 'text-slate-300 dark:text-slate-600'}`} />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Action panel */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait" initial={false}>
            {selectedDoc ? (
              <motion.div
                key="update-panel"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="sticky top-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-white/10">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Selected file</p>
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{refOf(selectedDoc)}</p>
                    <div className="mt-2"><StatusBadge status={selectedDoc.status} /></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(null)}
                    aria-label="Close panel (Esc)"
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2 p-5">
                  <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">Move this file to</p>
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.status}
                      type="button"
                      disabled={busy || selectedDoc.status === opt.status}
                      onClick={() => applyStatus(selectedDoc, opt.status)}
                      className={`flex w-full items-center gap-3 rounded-lg border border-slate-200 p-3 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none dark:border-white/10 ${opt.tone}`}
                    >
                      {updatingId === selectedDoc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <opt.icon className="h-4 w-4" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <EmptyState icon={RefreshCcw} title="Select a document"
                description="Choose a file from the list or search to change its status." />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
