import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User,
  FileText,
  Calendar,
  MessageSquare,
  Search,
  Filter,
  AlertCircle,
  CheckCheck,
  Eye,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { requestApi } from '../services/api';
import { format } from 'date-fns';
import { useArchive } from '../context/ArchiveContext'; // Add this import

interface Request {
  id: string;
  request_reference: string;
  document_title: string;
  policy_number: string;
  claim_number: string;
  archive_reference_number: string;
  requester_name: string;
  requester_email: string;
  request_date: string;
  expected_return_date: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Returned';
  notes?: string;
  rejection_reason?: string;
}

export const AdminRequests: React.FC = () => {
  // Get user from archive context
  const { user } = useArchive(); // Add this line
  
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (requests) {
      filterRequests();
    }
  }, [requests, searchQuery, statusFilter]);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      console.log('Loading requests...');
      console.log('Current user:', user); // Now user is defined
      console.log('API URL:', import.meta.env.VITE_API_URL);
      
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      console.log('Request params:', params);
      
      const response = await requestApi.getAllRequests(params);
      console.log('Response:', response);
      setRequests(response.data);
    } catch (error: any) {
      console.error('Full error object:', error);
      console.error('Error config:', error.config);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      
      // Check for network errors
      if (error.code === 'ERR_NETWORK') {
        toast.error('Cannot connect to server. Please check if backend is running.');
      } else if (error.code === 'ECONNABORTED') {
        toast.error('Request timeout. Server is not responding.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to view requests');
      } else if (error.response?.status === 401) {
        toast.error('Your session has expired. Please login again.');
      } else {
        const errorMessage = error.response?.data?.error || 
                            error.response?.data?.message || 
                            error.message || 
                            'Failed to load requests';
        toast.error(errorMessage);
      }
      
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterRequests = () => {
    if (!requests) {
      setFilteredRequests([]);
      return;
    }

    let filtered = [...requests];
    
    // Filter by status
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(r => r && r.status === statusFilter);
    }
    
    // Filter by search query
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r => 
        (r.request_reference && r.request_reference.toLowerCase().includes(query)) ||
        (r.document_title && r.document_title.toLowerCase().includes(query)) ||
        (r.policy_number && r.policy_number.toLowerCase().includes(query)) ||
        (r.claim_number && r.claim_number.toLowerCase().includes(query)) ||
        (r.requester_name && r.requester_name.toLowerCase().includes(query)) ||
        (r.archive_reference_number && r.archive_reference_number.toLowerCase().includes(query))
      );
    }
    
    setFilteredRequests(filtered);
  };

  const handleApprove = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      const response = await requestApi.approveRequest(requestId);
      toast.success(
        <div>
          <p className="font-bold">Request Approved</p>
          <p className="text-xs">Reference: {response.data.requestReference}</p>
          <p className="text-xs mt-1">User can collect file with this reference</p>
        </div>
      );
      await loadRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Approve error:', error);
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
      toast.success('Request rejected successfully');
      setShowRejectModal(false);
      setRejectReason('');
      await loadRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    if (!status) return null;
    
    const styles: Record<string, string> = {
      Pending: 'bg-amber-100 text-amber-700 border-amber-200',
      Approved: 'bg-green-100 text-green-700 border-green-200',
      Rejected: 'bg-red-100 text-red-700 border-red-200',
      Returned: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Request Management</h2>
          <p className="text-slate-500 font-medium mt-1">
            Approve or reject file requests from users
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="w-4 h-4" />
          <span>{filteredRequests.length} requests found</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reference, document, or requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
            >
              <option value="all">All Requests</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Returned">Returned</option>
            </select>
            <button
              onClick={loadRequests}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-slate-900">{request.archive_reference_number || 'Untitled'}</h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm font-mono text-blue-600">
                        Req Ref: {request.request_reference || 'N/A'}
                      </p>
                    
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-xs text-slate-500">Policy</p>
                      <p className="text-sm font-medium text-slate-700">{request.policy_number || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-500">Claim</p>
                      <p className="text-sm font-medium text-slate-700">{request.claim_number || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Expected Return</p>
                      <p className="text-sm font-medium text-slate-700">
                        {request.expected_return_date ? format(new Date(request.expected_return_date), 'MMM dd, yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Requester</p>
                      <p className="text-sm font-medium text-slate-700">{request.requester_name || 'Unknown'}</p>
                    </div>
                  </div>
                </div>

                {request.status === 'Pending' && (
                  <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRejectModal(true);
                      }}
                      disabled={processingId === request.id}
                      className="px-4 py-2 border-2 border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </>
                      )}
                    </button>
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCheck className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No requests found</h3>
              <p className="text-slate-500 text-sm mt-1">
                {statusFilter === 'Pending' 
                  ? 'No pending requests at the moment' 
                  : `No ${statusFilter.toLowerCase()} requests found`}
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Request Details Modal */}
      <AnimatePresence>
        {selectedRequest && !showRejectModal && (
          <RequestDetailsModal
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onApprove={handleApprove}
            onReject={() => setShowRejectModal(true)}
            isProcessing={processingId === selectedRequest.id}
          />
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedRequest && (
          <RejectModal
            request={selectedRequest}
            reason={rejectReason}
            onReasonChange={setRejectReason}
            onConfirm={handleReject}
            onClose={() => {
              setShowRejectModal(false);
              setRejectReason('');
            }}
            isProcessing={processingId === selectedRequest.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Request Details Modal Component
const RequestDetailsModal: React.FC<{
  request: Request;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: () => void;
  isProcessing: boolean;
}> = ({ request, onClose, onApprove, onReject, isProcessing }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      className="bg-white rounded-3xl max-w-2xl w-full p-8"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-2xl font-black text-slate-900 mb-6">Request Details</h3>
      
      <div className="space-y-6">
        {/* Reference */}
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            Request Reference
          </p>
          <p className="text-lg font-mono font-black text-blue-900">
            {request.request_reference || 'N/A'}
          </p>
        </div>

        {/* Document Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Document</p>
            <p className="font-medium text-slate-900">{request.document_title || 'Untitled'}</p>
            <p className="text-xs font-mono text-blue-600 mt-1">{request.archive_reference_number || 'N/A'}</p>
          </div>
        </div>

        {/* Policy and Claim Numbers */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Policy Number
            </p>
            <p className="text-sm font-mono font-bold text-slate-900">
              {request.policy_number || 'N/A'}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Claim Number
            </p>
            <p className="text-sm font-mono font-bold text-slate-900">
              {request.claim_number || 'N/A'}
            </p>
          </div>
        </div>

        {/* Requester Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Requester</p>
            <p className="font-medium text-slate-900">{request.requester_name || 'Unknown'}</p>
            <p className="text-xs text-slate-500">{request.requester_email || 'No email'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Expected Return</p>
            <p className="font-medium text-slate-900">
              {request.expected_return_date ? format(new Date(request.expected_return_date), 'MMMM dd, yyyy') : 'N/A'}
            </p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Request Date</p>
            <p className="text-sm text-slate-700">
              {request.request_date ? format(new Date(request.request_date), 'MMM dd, yyyy') : 'N/A'}
            </p>
          </div>
        </div>

        {/* Notes */}
        {request.notes && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Notes</p>
            <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl">{request.notes}</p>
          </div>
        )}

        {/* Rejection Reason */}
        {request.rejection_reason && (
          <div>
            <p className="text-xs font-bold text-red-500 uppercase mb-2">Rejection Reason</p>
            <p className="text-sm text-red-700 bg-red-50 p-3 rounded-xl">{request.rejection_reason}</p>
          </div>
        )}

        {/* Actions */}
        {request.status === 'Pending' && (
          <div className="flex gap-3 pt-4">
            <button
              onClick={onReject}
              disabled={isProcessing}
              className="flex-1 py-4 border-2 border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Reject Request
            </button>
            <button
              onClick={() => onApprove(request.id)}
              disabled={isProcessing}
              className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Approve Request'
              )}
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
        >
          Close
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// Reject Modal Component
const RejectModal: React.FC<{
  request: Request;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isProcessing: boolean;
}> = ({ request, reason, onReasonChange, onConfirm, onClose, isProcessing }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      className="bg-white rounded-3xl max-w-md w-full p-8"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      
      <h3 className="text-2xl font-black text-slate-900 text-center mb-2">Reject Request</h3>
      <p className="text-sm text-slate-500 text-center mb-6">
        Are you sure you want to reject this request? Please provide a reason.
      </p>

      <div className="space-y-4">
        <div className="p-4 bg-slate-50 rounded-xl">
          <p className="text-xs text-slate-500">Request Reference</p>
          <p className="font-mono font-bold text-slate-900">{request.request_reference || 'N/A'}</p>
        </div>

        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Enter rejection reason..."
          rows={4}
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-red-500/10 outline-none"
          autoFocus
        />

        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-4 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!reason.trim() || isProcessing}
            className="flex-1 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Confirm Reject'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  </motion.div>
);