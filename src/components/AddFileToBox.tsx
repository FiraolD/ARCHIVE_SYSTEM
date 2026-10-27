import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, Loader2, FileText, Hash, User, Trash2,
  CheckCircle2, FolderOpen, Files, Building2, RefreshCw,
  AlertCircle, Plus, Boxes, Truck, Archive,
  RotateCcw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getApiErrorDetails } from '../utils/apiError';
import { documentApi, boxApi } from '../services/api';
import {
  PageHeader, PageHeaderButton, SectionCard, SearchInput,
  EmptyState, Modal,
} from './ui';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type BoxStatus = 'Draft' | 'Packed' | 'In Transit' | 'Archived' | 'Dissolved';

interface Box {
  id: string;
  identifier: string;
  file_type: string;
  status: BoxStatus;
  branch_id?: string;
  branch_code?: string;
  branch_name?: string;
  document_count?: number;
}

interface BoxDocument {
  id: string;
  title: string;
  type: string;
  status: string;
  archive_reference_number?: string;
  claim_number?: string;
  policy_number?: string;
  insured_name?: string;
}

interface Document {
  id: string;
  title: string;
  type: string;
  status: string;
  archive_reference_number?: string;
  claim_number?: string;
  policy_number?: string;
  insured_name?: string;
}

/* ------------------------------------------------------------------ */
/* Status metadata                                                     */
/* ------------------------------------------------------------------ */
const STATUS_ORDER: Record<BoxStatus, number> = {
  Draft: 0, Packed: 1, 'In Transit': 2, Archived: 3, Dissolved: 4,
};

const STATUS_META: Record<BoxStatus, {
  label: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  Draft:       { label: 'Draft',      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700', icon: FolderOpen },
  Packed:      { label: 'Packed',     badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900', icon: Package },
  'In Transit':{ label: 'In Transit', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900', icon: Truck },
  Archived:    { label: 'Archived',   badge: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-200 dark:border-green-900', icon: Archive },
  Dissolved:   { label: 'Dissolved',  badge: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border-slate-200 dark:border-slate-700', icon: CheckCircle2 },
};

/* Transition labels + tone for the confirm modal */
const TRANSITION_META: Record<string, {
  title: string;
  tone: 'forward' | 'backward' | 'final';
  message: string;
  requiresNote: boolean;
}> = {
  'Packed': {
    title: 'Pack Box',
    tone: 'forward',
    message: 'Once packed, no documents can be added or removed until an Admin reopens the box.',
    requiresNote: false,
  },
  'In Transit': {
    title: 'Dispatch Box',
    tone: 'forward',
    message: 'Mark this box as in transit to the archive. Confirm the box has left the branch.',
    requiresNote: false,
  },
  'Archived': {
    title: 'Mark Box as Archived',
    tone: 'forward',
    message: 'Confirm the box has arrived at the archive building and is ready for shelving.',
    requiresNote: false,
  },
  'Dissolved': {
    title: 'Dissolve Box',
    tone: 'final',
    message: 'All documents have been shelved. This permanently retires the box. This action cannot be undone.',
    requiresNote: true,
  },
  'Draft': {
    title: 'Reopen Box',
    tone: 'backward',
    message: 'Reopening returns the box to Draft so documents can be added or removed again.',
    requiresNote: true,
  },
};

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */
export const AddFileToBox: React.FC = () => {
  // Archive context is used below for shared document actions.

  /* Boxes */
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [boxesLoading, setBoxesLoading] = useState(false);
  const [boxSearch, setBoxSearch] = useState('');
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);

  /* Documents in selected box */
  const [boxDocs, setBoxDocs] = useState<BoxDocument[]>([]);
  const [boxDocsLoading, setBoxDocsLoading] = useState(false);
  const [allowedTransitions, setAllowedTransitions] = useState<string[]>([]);

  /* Document search */
  const [docSearch, setDocSearch] = useState('');
  const [docResults, setDocResults] = useState<Document[]>([]);
  const [docSearchLoading, setDocSearchLoading] = useState(false);

  /* Action state */
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  /* Status transition modal */
  const [pendingTransition, setPendingTransition] = useState<string | null>(null);
  const [transitionNote, setTransitionNote] = useState('');
  const [transitionSubmitting, setTransitionSubmitting] = useState(false);

  /* ------------------------------------------------------------------ */
  /* Loaders                                                             */
  /* ------------------------------------------------------------------ */
  const loadBoxes = useCallback(async () => {
    try {
      setBoxesLoading(true);
      const res = await boxApi.list();
      setBoxes(res.data);
    } catch (error: unknown) {
      toast.error(getApiErrorDetails(error).error || 'Failed to load boxes');
    } finally {
      setBoxesLoading(false);
    }
  }, []);

  const loadBoxDetail = useCallback(async (boxId: string) => {
    try {
      setBoxDocsLoading(true);
      const res = await boxApi.get(boxId);
      setBoxDocs(res.data.documents || []);
      setAllowedTransitions(res.data.allowed_transitions || []);
      setSelectedBox(prev => prev ? { ...prev, ...res.data } : res.data);
    } catch (error: unknown) {
      toast.error(getApiErrorDetails(error).error || 'Failed to load box');
      setBoxDocs([]);
      setAllowedTransitions([]);
    } finally {
      setBoxDocsLoading(false);
    }
  }, []);

  /* ------------------------------------------------------------------ */
  /* Effects                                                             */
  /* ------------------------------------------------------------------ */
  useEffect(() => { loadBoxes(); }, [loadBoxes]);

  useEffect(() => {
    if (!selectedBox) {
      setBoxDocs([]);
      setAllowedTransitions([]);
      return;
    }
    loadBoxDetail(selectedBox.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBox?.id]);

  /* Debounced document search */
  useEffect(() => {
    if (!docSearch.trim()) { setDocResults([]); return; }
    const timeout = setTimeout(async () => {
      try {
        setDocSearchLoading(true);
        const res = await documentApi.getDocuments({ search: docSearch, limit: 25 });
        setDocResults(res.data.documents || []);
      } catch (error: unknown) {
        toast.error(getApiErrorDetails(error).error || 'Document search failed');
        setDocResults([]);
      } finally {
        setDocSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [docSearch]);

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */
  const filteredBoxes = boxes.filter(b => {
    if (!boxSearch.trim()) return true;
    const q = boxSearch.toLowerCase();
    return (
      b.identifier?.toLowerCase().includes(q) ||
      b.file_type?.toLowerCase().includes(q) ||
      b.branch_code?.toLowerCase().includes(q) ||
      b.branch_name?.toLowerCase().includes(q)
    );
  });

  const isDocInBox = (docId: string) => boxDocs.some(d => d.id === docId);
  const isDraft = selectedBox?.status === 'Draft';

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */
  const handleAddDocument = async (doc: Document) => {
    if (!selectedBox) return;
    if (!isDraft) { toast.error('This box is not in Draft — reopen it first'); return; }
    try {
      setAddingId(doc.id);
      await documentApi.assignToBox({ documentId: doc.id, boxId: selectedBox.id });
      toast.success(`Added "${doc.title || doc.archive_reference_number}" to ${selectedBox.identifier}`);
      await loadBoxDetail(selectedBox.id);
      loadBoxes();
    } catch (error: unknown) {
      if (getApiErrorDetails(error).status === 409) toast.error(getApiErrorDetails(error).error || 'Box cannot accept documents in its current state');
      else toast.error(getApiErrorDetails(error).error || 'Failed to add document');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveDocument = async (doc: BoxDocument) => {
    if (!selectedBox) return;
    if (!isDraft) { toast.error('Reopen the box before removing documents'); return; }
    if (!confirm(`Remove "${doc.title || doc.archive_reference_number}" from ${selectedBox.identifier}?`)) return;
    try {
      setRemovingId(doc.id);
      await boxApi.removeDocument(selectedBox.id, doc.id);
      toast.success('Document removed from box');
      setBoxDocs(prev => prev.filter(d => d.id !== doc.id));
      loadBoxes();
    } catch (error: unknown) {
      toast.error(getApiErrorDetails(error).error || 'Failed to remove document');
    } finally {
      setRemovingId(null);
    }
  };

  const handleConfirmTransition = async () => {
    if (!selectedBox || !pendingTransition) return;
    const meta = TRANSITION_META[pendingTransition];
    if (meta?.requiresNote && !transitionNote.trim()) {
      toast.error('A note is required for this transition');
      return;
    }
    try {
      setTransitionSubmitting(true);
      const res = await boxApi.updateStatus(selectedBox.id, pendingTransition, transitionNote || undefined);
      setSelectedBox(res.data);
      setBoxDocs(res.data.documents || []);
      setAllowedTransitions(res.data.allowed_transitions || []);
      toast.success(`Box moved to ${pendingTransition}`);
      setPendingTransition(null);
      setTransitionNote('');
      loadBoxes();
    } catch (error: unknown) {
      toast.error(getApiErrorDetails(error).error || 'Failed to update box status');
    } finally {
      setTransitionSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Add File to Box"
        subtitle="Pack documents into a box for transfer from the branch to the archive"
        icon={Boxes}
        actions={<PageHeaderButton icon={RefreshCw} onClick={loadBoxes}>Refresh</PageHeaderButton>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ---------------- LEFT: Available boxes ---------------- */}
        <div className="lg:col-span-5">
          <SectionCard
            title="Available Boxes"
            icon={Package}
            bodyClassName="p-4"
            actions={<span className="text-xs text-slate-400">{filteredBoxes.length} shown</span>}
          >
            <SearchInput
              value={boxSearch}
              onChange={setBoxSearch}
              placeholder="Search by box ID, file type, or branch…"
            />
            <div className="mt-4 space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {boxesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : filteredBoxes.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">
                    {boxSearch ? 'No matching boxes' : 'No boxes registered yet'}
                  </p>
                  {!boxSearch && <p className="text-xs mt-1">Create a box via Registration → Box.</p>}
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {filteredBoxes.map(box => (
                    <BoxCard
                      key={box.id}
                      box={box}
                      selected={selectedBox?.id === box.id}
                      onClick={() => setSelectedBox(box)}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ---------------- RIGHT: Selected box ---------------- */}
        <div className="lg:col-span-7 space-y-6">
          {!selectedBox ? (
            <EmptyState
              icon={Package}
              title="Select a Box"
              description="Choose a box on the left to see its documents and manage its archive lifecycle."
            />
          ) : (
            <>
              {/* Summary + status actions */}
              <SectionCard bodyClassName="p-0">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold">
                          {selectedBox.identifier}
                        </p>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">
                          {selectedBox.file_type} Box
                        </h2>
                        {selectedBox.branch_name && (
                          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {selectedBox.branch_name}
                            {selectedBox.branch_code ? ` (${selectedBox.branch_code})` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusBadge status={selectedBox.status} />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {boxDocs.length} doc{boxDocs.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Allowed transitions */}
                {allowedTransitions.length > 0 && (
                  <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Available Actions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allowedTransitions.map(target => (
                        <TransitionButton
                          key={target}
                          from={selectedBox.status}
                          to={target as BoxStatus}
                          onClick={() => {
                            setPendingTransition(target);
                            setTransitionNote('');
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Lock notice when not Draft */}
                {!isDraft && (
                  <div className="px-6 py-3 border-t border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 flex items-start gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      This box is <strong>{selectedBox.status}</strong>. Documents cannot be added or removed until an Admin reopens it.
                    </p>
                  </div>
                )}
              </SectionCard>

              {/* Documents in this box */}
              <SectionCard
                title="Documents in this Box"
                icon={Files}
                bodyClassName="p-4"
                actions={<span className="text-xs text-slate-400">{boxDocs.length} linked</span>}
              >
                {boxDocsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  </div>
                ) : boxDocs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No documents yet</p>
                    {isDraft && <p className="text-xs mt-1">Use the search below to add documents.</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {boxDocs.map(doc => (
                        <BoxDocRow
                          key={doc.id}
                          doc={doc}
                          onRemove={() => handleRemoveDocument(doc)}
                          removing={removingId === doc.id}
                          disabled={!isDraft}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </SectionCard>

              {/* Add documents (only meaningful in Draft) */}
              <SectionCard title="Add Documents" icon={Search} bodyClassName="p-4">
                {!isDraft ? (
                  <div className="text-center py-6 text-slate-400">
                    <Lock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">Box is {selectedBox.status}</p>
                    <p className="text-xs mt-1">Reopen the box to add or remove documents.</p>
                  </div>
                ) : (
                  <>
                    <SearchInput
                      value={docSearch}
                      onChange={setDocSearch}
                      placeholder="Search by archive ref, claim #, policy #, or insured name…"
                    />
                    <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {!docSearch.trim() ? (
                        <div className="text-center py-8 text-slate-400">
                          <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">Start typing to search documents</p>
                        </div>
                      ) : docSearchLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        </div>
                      ) : docResults.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">No matching documents</p>
                        </div>
                      ) : (
                        <AnimatePresence initial={false}>
                          {docResults.map(doc => (
                            <DocumentAddRow
                              key={doc.id}
                              doc={doc}
                              alreadyInBox={isDocInBox(doc.id)}
                              onAdd={() => handleAddDocument(doc)}
                              adding={addingId === doc.id}
                            />
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </>
                )}
              </SectionCard>
            </>
          )}
        </div>
      </div>

      {/* Status transition confirmation modal */}
      <Modal
        open={!!pendingTransition}
        onClose={() => { setPendingTransition(null); setTransitionNote(''); }}
        title={pendingTransition ? TRANSITION_META[pendingTransition].title : ''}
        size="sm"
        footer={
          <>
            <button
              onClick={() => { setPendingTransition(null); setTransitionNote(''); }}
              disabled={transitionSubmitting}
              className="px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmTransition}
              disabled={
                transitionSubmitting ||
                (pendingTransition ? TRANSITION_META[pendingTransition].requiresNote && !transitionNote.trim() : false)
              }
              className={`px-4 py-3 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 ${
                pendingTransition && TRANSITION_META[pendingTransition].tone === 'final'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {transitionSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
            </button>
          </>
        }
      >
        {pendingTransition && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 py-2">
              <StatusBadge status={selectedBox?.status as BoxStatus} />
              <span className="text-slate-400">→</span>
              <StatusBadge status={pendingTransition as BoxStatus} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {TRANSITION_META[pendingTransition].message}
            </p>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                Note {TRANSITION_META[pendingTransition].requiresNote
                  ? <span className="text-red-500">*</span>
                  : <span className="text-slate-400 normal-case font-normal">(optional)</span>}
              </label>
              <textarea
                value={transitionNote}
                onChange={e => setTransitionNote(e.target.value)}
                rows={3}
                placeholder={
                  TRANSITION_META[pendingTransition].requiresNote
                    ? 'Explain why this action is necessary…'
                    : 'Any observations about this box…'
                }
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none text-sm"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

const StatusBadge: React.FC<{ status: BoxStatus }> = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.Draft;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${meta.badge}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
};

const TransitionButton: React.FC<{
  from: BoxStatus;
  to: BoxStatus;
  onClick: () => void;
}> = ({ from, to, onClick }) => {
  const isForward = STATUS_ORDER[to] > STATUS_ORDER[from];
  const isFinal = to === 'Dissolved';
  const Icon = isForward ? (STATUS_META[to].icon || CheckCircle2) : RotateCcw;

  const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all';
  const style = isFinal
    ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20'
    : isForward
    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';

  const label = TRANSITION_META[to]?.title || `Move to ${to}`;

  return (
    <button onClick={onClick} className={`${base} ${style}`}>
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
};

const BoxCard: React.FC<{
  box: Box;
  selected: boolean;
  onClick: () => void;
}> = ({ box, selected, onClick }) => {
  const isDissolved = box.status === 'Dissolved';
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDissolved ? 0.55 : 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
          : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
            {box.identifier}
          </p>
          <p className="font-bold text-slate-900 dark:text-white text-sm truncate mt-0.5">
            {box.file_type} Box
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge status={box.status} />
            <span className="text-[10px] text-slate-400">
              {box.document_count ?? 0} docs
            </span>
            {box.branch_code && (
              <span className="text-[10px] text-slate-400">• {box.branch_code}</span>
            )}
          </div>
        </div>
        {selected && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
      </div>
    </motion.button>
  );
};

const BoxDocRow: React.FC<{
  doc: BoxDocument;
  onRemove: () => void;
  removing: boolean;
  disabled: boolean;
}> = ({ doc, onRemove, removing, disabled }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -10 }}
    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
  >
    <div className="flex items-start gap-3 min-w-0 flex-1">
      <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
          {doc.title || doc.archive_reference_number || 'Untitled'}
        </p>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
          {doc.archive_reference_number && (
            <span className="font-mono text-blue-600 dark:text-blue-400">
              {doc.archive_reference_number}
            </span>
          )}
          {doc.type && <span>• {doc.type}</span>}
          {doc.insured_name && <span>• {doc.insured_name}</span>}
        </div>
      </div>
    </div>
    <button
      onClick={onRemove}
      disabled={removing || disabled}
      title={disabled ? 'Box is not in Draft — reopen to remove documents' : 'Remove from box'}
      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
    >
      {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  </motion.div>
);

const DocumentAddRow: React.FC<{
  doc: Document;
  alreadyInBox: boolean;
  onAdd: () => void;
  adding: boolean;
}> = ({ doc, alreadyInBox, onAdd, adding }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -10 }}
    className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
      alreadyInBox
        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
        : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
    }`}
  >
    <div className="flex items-start gap-3 min-w-0 flex-1">
      <FileText
        className={`w-4 h-4 mt-0.5 shrink-0 ${
          alreadyInBox ? 'text-green-500' : 'text-slate-400'
        }`}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
          {doc.title || doc.archive_reference_number || 'Untitled'}
        </p>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
          {doc.archive_reference_number && <span className="font-mono">{doc.archive_reference_number}</span>}
          {doc.claim_number && (
            <span className="flex items-center gap-0.5"><Hash className="w-2.5 h-2.5" />{doc.claim_number}</span>
          )}
          {doc.policy_number && (
            <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" />{doc.policy_number}</span>
          )}
          {doc.insured_name && (
            <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{doc.insured_name}</span>
          )}
        </div>
      </div>
    </div>

    {alreadyInBox ? (
      <span className="text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5" /> Added
      </span>
    ) : (
      <button
        onClick={onAdd}
        disabled={adding}
        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0 whitespace-nowrap"
      >
        {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5" /> Add</>}
      </button>
    )}
  </motion.div>
);