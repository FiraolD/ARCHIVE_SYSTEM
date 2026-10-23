import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, RefreshCcw, CheckCircle, Package, History, FileText,
  Calendar, User, ExternalLink, ChevronRight, ArrowLeft, FileQuestion,
} from 'lucide-react';
import { Document, FileStatus } from '../types';
import { useArchive } from '../context/ArchiveContext';
import { PageHeader, EmptyState, SearchInput } from './ui';

export const StatusUpdatePage: React.FC = () => {
  const { documents, updateDocumentStatus } = useArchive();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredDocs([]); return; }
    const query = searchQuery.toLowerCase();
    setFilteredDocs(documents.filter(doc =>
      doc.archive_reference_number?.toLowerCase().includes(query) ||
      doc.title?.toLowerCase().includes(query) ||
      doc.policy_number?.toLowerCase().includes(query) ||
      doc.claim_number?.toLowerCase().includes(query) ||
      doc.insured_name?.toLowerCase().includes(query)
    ));
  }, [searchQuery, documents]);

  const handleUpdateStatus = async (newStatus: FileStatus) => {
    if (!selectedDoc) return;
    try {
      setIsUpdating(true);
      await updateDocumentStatus(selectedDoc.id, newStatus);
      setSelectedDoc(null);
      setSearchQuery('');
    } catch { /* context handles */ } finally { setIsUpdating(false); }
  };

  const statusOptions = [
    { status: 'Active' as FileStatus, icon: History, color: 'text-green-600 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900', label: 'Set as Active (Available)' },
    { status: 'Checked-out' as FileStatus, icon: Package, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900', label: 'Mark as Checked-out' },
    { status: 'Settled Claims' as FileStatus, icon: CheckCircle, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900', label: 'Mark as Settled Claims' },
    { status: 'Returned' as FileStatus, icon: ArrowLeft, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900', label: 'Mark as Returned (Pending Active)' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Status Management"
        subtitle="Update document lifecycle states and transitions"
        icon={RefreshCcw}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by Reference #, Claim #, or Title…"
            />
          </div>

          <AnimatePresence>
            {!searchQuery ? (
              <EmptyState icon={Search} title="Ready for lookup"
                description="Start typing a reference number or file name to update its status." />
            ) : filteredDocs.length === 0 ? (
              <EmptyState icon={FileQuestion} title="No documents found"
                description={`No matches for "${searchQuery}"`} />
            ) : (
              filteredDocs.map((doc) => (
                <motion.button
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full p-6 flex items-center gap-6 rounded-2xl border transition-all text-left ${
                    selectedDoc?.id === doc.id
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-md ring-4 ring-blue-500/5'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                  }`}
                >
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/50 px-2 py-0.5 rounded uppercase tracking-wider">
                        {doc.archive_reference_number || doc.archiveReferenceNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-400">•</span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{doc.type}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white truncate">{doc.title}</h4>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <Calendar className="w-3 h-3" />{new Date(doc.createdAt || doc.created_at!).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <User className="w-3 h-3" />{doc.owner}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        doc.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                        : doc.status === 'Checked-out' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : doc.status === 'Returned' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                      }`}>{doc.status}</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-6 h-6 transition-transform ${selectedDoc?.id === doc.id ? 'rotate-90 text-blue-600' : 'text-slate-300 dark:text-slate-600'}`} />
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedDoc ? (
              <motion.div
                key="update-panel"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden sticky top-8"
              >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Action Center</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Selected File</p>
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {selectedDoc.archive_reference_number || selectedDoc.archiveReferenceNumber}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-widest">Current Status</p>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full animate-pulse ${
                          selectedDoc.status === 'Active' ? 'bg-green-500'
                          : selectedDoc.status === 'Checked-out' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <span className={`font-black ${
                          selectedDoc.status === 'Active' ? 'text-green-700 dark:text-green-400'
                          : selectedDoc.status === 'Checked-out' ? 'text-amber-700 dark:text-amber-400'
                          : 'text-blue-700 dark:text-blue-400'
                        }`}>{selectedDoc.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Select New State</p>
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.status}
                      disabled={isUpdating || selectedDoc.status === opt.status}
                      onClick={() => handleUpdateStatus(opt.status)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all group disabled:opacity-50 disabled:cursor-not-allowed ${opt.color} hover:shadow-lg hover:-translate-y-0.5`}
                    >
                      <div className="flex items-center gap-4">
                        <opt.icon className="w-5 h-5" />
                        <span className="font-bold">{opt.label}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>

                <div className="p-6 pt-0">
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="w-full py-4 text-slate-400 dark:text-slate-500 font-bold hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center justify-center gap-2"
                  >
                    Cancel Selection
                  </button>
                </div>
              </motion.div>
            ) : (
              <EmptyState icon={RefreshCcw} title="Select a document"
                description="Choose a file from the list to modify its status." />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};