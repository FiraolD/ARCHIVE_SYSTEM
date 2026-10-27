import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, User, FileText, Calendar, Eye,
  Loader2, RefreshCw, Inbox, CheckCheck, LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getApiErrorDetails } from '../utils/apiError';
import { format } from 'date-fns';
import { requestApi } from '../services/api';
import { PageHeader, PageHeaderButton, SearchInput, FilterBar, EmptyState, Modal } from './ui';

interface Request {
  id: string;
  request_reference: string;
  document_title: string;
  policy_number: string;
  claim_number: string;
  archive_reference_number: string;
  requester_name: string;
  requester_email: string;
  requester_department_name?: string;
  request_date: string;
  expected_return_date: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Returned';
  notes?: string;
  rejection_reason?: string;
}

export const AdminRequests: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => { loadRequests(); }, [statusFilter]);

  useEffect(() => {
    let filtered = [...requests];
    if (statusFilter && statusFilter !== 'all') filtered = filtered.filter(r => r.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r =>
        r.request_reference?.toLowerCase().includes(q) ||
        r.document_title?.toLowerCase().includes(q) ||
        r.policy_number?.toLowerCase().includes(q) ||
        r.claim_number?.toLowerCase().includes(q) ||
        r.requester_name?.toLowerCase().includes(q) ||
        r.archive_reference_number?.toLowerCase().includes(q)
      );
    }
    setFilteredRequests(filtered);
  }, [requests, searchQuery, statusFilter]);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await requestApi.getAllRequests(params);
      setRequests(response.data);
    } catch (error: unknown) {
      const msg = getApiErrorDetails(error).status === 403
        ? 'You do not have permission to view requests'
        : getApiErrorDetails(error).error || 'Failed to load requests';
      toast.error(msg);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      const response = await requestApi.approveRequest(requestId);
      toast.success(`Approved — reference ${response.data.requestReference}`);
      await loadRequests();
      setSelectedRequest(null);
    } catch {
      toast.error('Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      setProcessingId(selectedRequest.id);
      await requestApi.rejectRequest(selectedRequest.id, { reason: rejectReason });
      toast.success('Request rejected');
      setShowRejectModal(false);
      setRejectReason('');
      await loadRequests();
      setSelectedRequest(null);
    } catch (error: unknown) {
      toast.error(getApiErrorDetails(error).error || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Request Management"
        subtitle="Approve or reject file requests from users"
        icon={Inbox}
        actions={<PageHeaderButton icon={RefreshCw} onClick={loadRequests}>Refresh</PageHeaderButton>}
      />

      <FilterBar>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by reference, document, or requester…"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium"
        >
          <option value="all">All Requests</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Returned">Returned</option>
        </select>
      </FilterBar>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          icon={CheckCheck}
          title="No requests found"
          description={statusFilter === 'Pending'
            ? 'No pending requests at the moment'
            : `No ${statusFilter.toLowerCase()} requests found`}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredRequests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/50 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          {request.archive_reference_number || 'Untitled'}
                        </h3>
                        <StatusBadge status={request.status} />
                      </div>
                      <p className="text-sm font-mono text-blue-600">
                        Req Ref: {request.request_reference || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Eye className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Meta label="Policy" value={request.policy_number} icon={FileText} />
                  <Meta label="Claim" value={request.claim_number} icon={FileText} />
                  <Meta label="Expected Return" value={request.expected_return_date
                    ? format(new Date(request.expected_return_date), 'MMM dd, yyyy') : 'N/A'} icon={Calendar} />
                  <Meta label="Requester" value={request.requester_name} icon={User} />
                </div>

                {request.status === 'Pending' && (
                  <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => { setSelectedRequest(request); setShowRejectModal(true); }}
                      disabled={processingId === request.id}
                      className="px-4 py-2 border-2 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {processingId === request.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <><CheckCircle2 className="w-4 h-4" /> Approve</>}
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <RequestDetailsModal
        request={selectedRequest && !showRejectModal ? selectedRequest : null}
        onClose={() => setSelectedRequest(null)}
        onApprove={handleApprove}
        onReject={() => setShowRejectModal(true)}
        isProcessing={processingId === selectedRequest?.id}
      />

      <Modal
        open={showRejectModal && !!selectedRequest}
        onClose={() => { setShowRejectModal(false); setRejectReason(''); }}
        title="Reject Request"
        size="sm"
        footer={
          <>
            <button
              onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
              className="px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectReason.trim() || processingId === selectedRequest?.id}
              className="px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {processingId === selectedRequest?.id
                ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Reject'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Are you sure you want to reject{' '}
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {selectedRequest?.request_reference}
          </span>? Please provide a reason.
        </p>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Enter rejection reason…"
          rows={4}
          autoFocus
          className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 outline-none"
        />
      </Modal>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    Pending: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
    Approved: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900',
    Rejected: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900',
    Returned: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );
};

const Meta: React.FC<{ label: string; value?: string | null; icon: LucideIcon }> = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-2 min-w-0">
    <Icon className="w-4 h-4 text-slate-400 shrink-0" />
    <div className="min-w-0">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{value || 'N/A'}</p>
    </div>
  </div>
);

const RequestDetailsModal: React.FC<{
  request: Request | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: () => void;
  isProcessing: boolean;
}> = ({ request, onClose, onApprove, onReject, isProcessing }) => (
  <Modal
    open={!!request}
    onClose={onClose}
    title="Request Details"
    size="md"
    footer={request?.status === 'Pending' ? (
      <>
        <button onClick={onReject} disabled={isProcessing}
          className="px-4 py-3 border-2 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50">
          Reject
        </button>
        <button onClick={() => request && onApprove(request.id)} disabled={isProcessing}
          className="px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50">
          Approve
        </button>
      </>
    ) : undefined}
  >
    {request && (
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Request Reference</p>
          <p className="text-lg font-mono font-black text-blue-900 dark:text-blue-200">{request.request_reference}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Document', request.document_title],
            ['Archive Ref', request.archive_reference_number],
            ['Policy', request.policy_number],
            ['Claim', request.claim_number],
            ['Requester', request.requester_name],
            ['Email', request.requester_email],
            ['Department', request.requester_department_name],
            ['Expected Return', request.expected_return_date && format(new Date(request.expected_return_date), 'MMM dd, yyyy')],
          ].map(([label, value]) => (
            <div key={label as string} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{label}</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{(value as string) || 'N/A'}</p>
            </div>
          ))}
        </div>
        {request.notes && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Notes</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">{request.notes}</p>
          </div>
        )}
        {request.rejection_reason && (
          <div>
            <p className="text-xs font-bold text-red-500 uppercase mb-1">Rejection Reason</p>
            <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl">{request.rejection_reason}</p>
          </div>
        )}
      </div>
    )}
  </Modal>
);