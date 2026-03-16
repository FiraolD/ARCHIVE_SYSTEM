import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  RefreshCcw, 
  CheckCircle, 
  Package, 
  History,
  FileText,
  Calendar,
  User,
  ExternalLink,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Document, FileStatus } from '../types';
import { toast } from 'sonner';
import { useArchive } from '../context/ArchiveContext';

export const StatusUpdatePage: React.FC = () => {
  const { documents, updateDocumentStatus, isLoading } = useArchive();
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
    const filtered = documents.filter(doc => 
      doc.archive_reference_number?.toLowerCase().includes(query) ||
      doc.title?.toLowerCase().includes(query) ||
      doc.policy_number?.toLowerCase().includes(query) ||
      doc.claim_number?.toLowerCase().includes(query) ||
      doc.insured_name?.toLowerCase().includes(query)
    );
    setFilteredDocs(filtered);
  }, [searchQuery, documents]);

  const handleUpdateStatus = async (newStatus: FileStatus) => {
    if (!selectedDoc) return;
    
    try {
      setIsUpdating(true);
      await updateDocumentStatus(selectedDoc.id, newStatus);
      setSelectedDoc(null);
      setSearchQuery('');
    } catch (error) {
      // Error is handled in context
    } finally {
      setIsUpdating(false);
    }
  };

  const statusOptions: { status: FileStatus; icon: any; color: string; label: string }[] = [
    { status: 'Active', icon: History, color: 'text-green-600 bg-green-50 border-green-200', label: 'Set as Active (Available)' },
    { status: 'Checked-out', icon: Package, color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Mark as Checked-out' },
    { status: 'Settled Claims', icon: CheckCircle, color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Mark as Settled Claims' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Status Management</h2>
          <p className="text-slate-500 font-medium">Update document lifecycle states and transitions.</p>
        </div>
        
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text"
            placeholder="Search by Reference # or Title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 outline-none font-medium transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Document List */}
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
                    ? 'bg-blue-50 border-blue-500 shadow-md ring-4 ring-blue-500/5' 
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded uppercase tracking-wider">
                      {doc.archiveReferenceNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-500">{doc.type}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 truncate">{doc.archive_reference_number}</h4>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <Calendar className="w-3 h-3" /> {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <User className="w-3 h-3" /> {doc.owner}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      doc.status === 'Active' ? 'bg-green-100 text-green-700' :
                      doc.status === 'Checked-out' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                </div>
                <ChevronRight className={`w-6 h-6 transition-transform ${selectedDoc?.id === doc.id ? 'rotate-90 text-blue-600' : 'text-slate-300'}`} />
              </motion.button>
            ))}
            
            {!searchQuery && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
                <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Ready for lookup</h3>
                <p className="text-slate-500 mt-2 max-w-sm mx-auto">Start typing a reference number or file name to update its status.</p>
              </div>
            )}

            {searchQuery && filteredDocs.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-slate-500 font-medium">No documents found matching "{searchQuery}"</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Update Panel */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedDoc ? (
              <motion.div
                key="update-panel"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden sticky top-8"
              >
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-xl font-black text-slate-900 mb-6">Action Center</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selected File</p>
                        <p className="font-bold text-slate-900 truncate">{selectedDoc.archiveReferenceNumber}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white border border-slate-200 rounded-xl">
                      <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">Current Status</p>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full animate-pulse ${
                          selectedDoc.status === 'Active' ? 'bg-green-500' :
                          selectedDoc.status === 'Checked-out' ? 'bg-amber-500' :
                          'bg-blue-500'
                        }`} />
                        <span className={`font-black ${
                          selectedDoc.status === 'Active' ? 'text-green-700' :
                          selectedDoc.status === 'Checked-out' ? 'text-amber-700' :
                          'text-blue-700'
                        }`}>{selectedDoc.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Select New State</p>
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
                    className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
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
                className="h-full bg-slate-50/30 border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center opacity-60"
              >
                <RefreshCcw className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 font-bold">Select a document to modify its status</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};