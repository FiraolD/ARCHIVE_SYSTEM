import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentCard } from './DocumentCard';
import {
  Search, Calendar, User, FileText, Send, Clock, Filter,
  Loader2, X, History, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useArchive } from '../context/ArchiveContext';
import { documentApi, requestApi } from '../services/api';
import { Document } from '../types';
import { format } from 'date-fns';
import { getApiErrorDetails } from '../utils/apiError';
import { PageHeader, EmptyState } from './ui';

export const FileRequestPage: React.FC = () => {
  const { user, addFileRequest } = useArchive();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [returnDate, setReturnDate] = useState('');
  const [requester, setRequester] = useState(user?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Document[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);

  useEffect(() => { fetchMyRequests(); }, []);

  const fetchMyRequests = async () => {
    try {
      setLoadingRequests(true);
      const response = await requestApi.getMyRequests();
      setMyRequests(response.data || []);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) { setSearchResults([]); setDebugInfo(''); return; }
      setIsSearching(true);
      setDebugInfo(`Searching for: "${searchQuery}"`);
      try {
        const response = await documentApi.getDocuments({ search: searchQuery });
        setSearchResults(response.data.documents);
        setDebugInfo(`Found ${response.data.documents.length} documents`);
      } catch (error: unknown) {
        setDebugInfo(`Error: ${getApiErrorDetails(error).message}`);
        toast.error('Search failed');
      } finally {
        setIsSearching(false);
      }
    };
    const timeoutId = setTimeout(performSearch, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !returnDate) { toast.error('Please select a document and provide a return date'); return; }
    try {
      setIsSubmitting(true);
      await addFileRequest({
        documentId: selectedDoc.id,
        requesterName: requester,
        expectedReturnDate: returnDate,
        notes: `Request for ${selectedDoc.title}`,
      });
      setSelectedDoc(null);
      setReturnDate('');
      setRequester(user?.name || '');
      setSearchQuery('');
      toast.success('File request submitted successfully');
      fetchMyRequests();
    } catch { /* context handles */ } finally { setIsSubmitting(false); }
  };

  const handleReturn = async (requestId: string) => {
    if (!confirm('Are you sure you want to return this document?')) return;
    try {
      setReturningId(requestId);
      await requestApi.returnByRequester(requestId);
      toast.success('Document returned. Awaiting admin verification.');
      fetchMyRequests();
    } catch (error: unknown) {
      toast.error(getApiErrorDetails(error).error || 'Failed to return document');
    } finally {
      setReturningId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="File Recovery Request"
        subtitle="Search and request physical files from the archive. Track and return your checked-out files."
        icon={FileText}
      />

      {debugInfo && (
        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-xs font-mono">🔍 Debug: {debugInfo}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by Claim #, Policy #, Insured Name, Sum Insured, Accident Date, or Reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-800 dark:text-slate-100"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Search Results</h3>
            <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest">
              <Filter className="w-4 h-4" /><span>{searchResults.length} Found</span>
            </div>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {isSearching ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="w-10 h-8 text-blue-600 animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((doc) => {
                    const isActive = doc.status === 'Active';
                    return (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        onSelect={(d) => isActive && setSelectedDoc(d)}
                        selected={selectedDoc?.id === doc.id}
                        disabled={!isActive}
                        disabledMessage={!isActive ? `Not available — file is ${doc.status}` : undefined}
                      />
                    );
                  })}
                </div>
              ) : searchQuery ? (
                <EmptyState icon={Search} title="No matching files found"
                  description="Try a different claim number, policy number, insured name, or sum insured." />
              ) : (
                <EmptyState icon={Search} title="Start searching"
                  description="Enter claim number, policy number, insured name, sum insured, or accident date above" />
              )}
            </AnimatePresence>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" /> My Requests
              </h3>
              <button onClick={fetchMyRequests} disabled={loadingRequests}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-blue-600 disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${loadingRequests ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingRequests ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>
            ) : myRequests.length > 0 ? (
              <div className="space-y-4">
                {myRequests.map((req) => (
                  <div key={req.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900 dark:text-white">{req.document_title || 'Untitled'}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            req.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            : req.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                            : req.status === 'Returned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            : req.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>{req.status}</span>
                        </div>
                        <p className="text-xs text-blue-600 font-mono mt-1">Request Ref: {req.request_reference}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>Expected: {format(new Date(req.expected_return_date), 'MMM dd, yyyy')}</span>
                          {req.actual_return_date && <span>Returned: {format(new Date(req.actual_return_date), 'MMM dd, yyyy')}</span>}
                        </div>
                      </div>
                      {req.status === 'Approved' && !req.actual_return_date && (
                        <button
                          onClick={() => handleReturn(req.id)}
                          disabled={returningId === req.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm whitespace-nowrap"
                        >
                          {returningId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Return Document'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={FileText} title="No requests yet"
                description="Your submitted requests will appear here." />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-24">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Request Details</h3>
            <AnimatePresence mode="wait">
              {selectedDoc ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onSubmit={handleRequest}
                  className="space-y-6"
                >
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-black text-blue-900 dark:text-blue-200 truncate">{selectedDoc.title}</span>
                    </div>
                    <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest">Selected for Request</p>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      <User className="w-3 h-3" /> Requester Name
                    </label>
                    <input type="text" required value={requester} onChange={(e) => setRequester(e.target.value)}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-800 dark:text-slate-100" />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      <Calendar className="w-3 h-3" /> Expected Return Date
                    </label>
                    <input type="date" required min={new Date().toISOString().split('T')[0]}
                      value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-800 dark:text-slate-100" />
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900 flex gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                      Requests are typically processed within 24 hours. You will be notified once the file is ready.
                    </p>
                  </div>
                  <div className="pt-4">
                    <button type="submit" disabled={isSubmitting}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : <><Send className="w-5 h-5" /> Submit Request</>}
                    </button>
                    <button type="button" onClick={() => setSelectedDoc(null)}
                      className="w-full mt-3 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors text-sm">
                      Cancel Selection
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-center py-10">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-slate-200 dark:text-slate-600" />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Select a file from search results to start a request.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};