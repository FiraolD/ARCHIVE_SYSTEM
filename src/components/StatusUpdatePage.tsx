import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, RefreshCcw, CheckCircle, Package, History,
  FileText, Calendar, User, ExternalLink, ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { Document, FileStatus } from '../types';
import { useArchive } from '../context/ArchiveContext';

export const StatusUpdatePage: React.FC = () => {
  const { documents, updateDocumentStatus } = useArchive();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDocs([]);
      return;
    }
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
    } catch { /* context */ } finally { setIsUpdating(false); }
  };

  const statusOptions: Array<{ status: FileStatus; icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = [
    { status: 'Active', icon: History, color: 'text-green-600 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900', label: 'Set as Active (Available)' },
    { status: 'Checked-out', icon: Package, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900', label: 'Mark as Checked-out' },
    { status: 'Settled Claims', icon: CheckCircle, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900', label: 'Mark as Settled Claims' },
    { status: 'Returned', icon: ArrowLeft, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900', label: 'Mark as Returned (Pending Active)' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Status Management</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Update document lifecycle states and transitions.</p>
        </div>
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by Reference #, Claim #, or Title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 outline-none font-medium transition-all text-slate-800 dark:text-slate-100 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {searchQuery && filteredDocs.map((doc) => (
              <motion.button
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full p-6 flex items-center gap-6 rounded-2xl border transition-all text-left ${
                  selectedDoc?.id === doc.id
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-md ring-4 ring-blue-500/5'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                }`}
              >
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
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
                      <Calendar className="w-3 h-3" /> {new Date(doc.createdAt || doc.created_at!).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <User className="w-3 h-3" /> {doc.owner}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      doc.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' :
                      doc.status === 'Checked-out' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
                      doc.status === 'Returned' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                </div>
                <ChevronRight className={`w-6 h-6 transition-transform ${selectedDoc?.id === doc.id ? 'rotate-90 text-blue-600' : 'text-slate-300 dark:text-slate-600'}`} />
              </motion.button>
            ))}

            {!searchQuery && (
              <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-16 text-center">
                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 dark:text-slate-200">Ready for lookup</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">Start typing a reference number or file name to update its status.</p>
              </div>
            )}

            {searchQuery && filteredDocs.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-slate-500 dark:text-slate-400 font-medium">No documents found matching "{searchQuery}"</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedDoc ? (
              <motion.div
                key="update-panel"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden sticky top-8"
              >
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Action Center</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Selected File</p>
                        <p className="font-bold text-slate-900 dark:text-white truncate">{selectedDoc.archive_reference_number || selectedDoc.archiveReferenceNumber}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-widest">Current Status</p>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full animate-pulse ${
                          selectedDoc.status === 'Active' ? 'bg-green-500' :
                          selectedDoc.status === 'Checked-out' ? 'bg-amber-500' :
                          'bg-blue-500'
                        }`} />
                        <span className={`font-black ${
                          selectedDoc.status === 'Active' ? 'text-green-700 dark:text-green-400' :
                          selectedDoc.status === 'Checked-out' ? 'text-amber-700 dark:text-amber-400' :
                          'text-blue-700 dark:text-blue-400'
                        }`}>{selectedDoc.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 space-y-3">
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

                <div className="p-8 pt-0">
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="w-full py-4 text-slate-400 dark:text-slate-500 font-bold hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center justify-center gap-2"
                  >
                    Cancel Selection
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full bg-slate-50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-12 flex flex-col items-center justify-center text-center opacity-60"
              >
                <RefreshCcw className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-bold">Select a document to modify its status</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};