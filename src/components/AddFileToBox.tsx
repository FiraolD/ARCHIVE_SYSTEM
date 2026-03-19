import React, { useState, useEffect } from 'react';
import { Package, Search, CheckCircle2, ArrowRight, X, Loader2, FileText, Hash, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useArchive } from '../context/ArchiveContext';
import { documentApi, registrationApi } from '../services/api';

interface Document {
  id: string;
  title: string;
  archive_reference_number: string;
  claim_number?: string;
  policy_number?: string;
  insured_name?: string;
  status: string;
  type: string;
}

interface Box {
  id: string;
  identifier: string;
  fileType: string;
  branchCode: string;
}

export const AddFileToBox: React.FC = () => {
  const { documents, boxes, fetchDocuments, fetchBoxes, isLoading } = useArchive();
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [selectedBox, setSelectedBox] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFiles, setFilteredFiles] = useState<Document[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter files based on search query with proper null checks
  useEffect(() => {
    if (!documents) {
      setFilteredFiles([]);
      return;
    }

    // First, filter only active documents
    const activeDocs = documents.filter(doc => doc?.status === 'Active');
    
    if (!searchQuery.trim()) {
      setFilteredFiles(activeDocs);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    
    const filtered = activeDocs.filter(doc => {
      // Search by archive reference number
      const archiveRefMatch = doc?.archive_reference_number?.toLowerCase().includes(query);
      
      // Search by claim number (if exists)
      const claimMatch = doc?.claim_number?.toLowerCase().includes(query);
      
      // Search by policy number (if exists)
      const policyMatch = doc?.policy_number?.toLowerCase().includes(query);
      
      // Search by insured name (if exists)
      const insuredMatch = doc?.insured_name?.toLowerCase().includes(query);
      
      return archiveRefMatch || claimMatch || policyMatch || insuredMatch;
    });
    
    setFilteredFiles(filtered);
  }, [searchQuery, documents]);

  // Get display text for a document
  const getDocumentDisplay = (doc: Document) => {
    const parts = [];
    
    // Always show archive reference number
    parts.push(doc.archive_reference_number || 'No Reference');
    
    // For Claim Files, show claim number and insured name
    if (doc.type === 'Claim File') {
      if (doc.claim_number) parts.push(`Claim: ${doc.claim_number}`);
      if (doc.insured_name) parts.push(`Insured: ${doc.insured_name}`);
    }
    
    // For Policy documents, show policy number and insured name
    if (doc.type === 'Policy') {
      if (doc.policy_number) parts.push(`Policy: ${doc.policy_number}`);
      if (doc.insured_name) parts.push(`Insured: ${doc.insured_name}`);
    }
    
    return parts.join(' • ');
  };

  // Get icon based on document type
  const getDocumentIcon = (type: string) => {
    switch(type) {
      case 'Claim File':
        return <Hash className="w-5 h-5 text-blue-600" />;
      case 'Policy':
        return <FileText className="w-5 h-5 text-green-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-400" />;
    }
  };

  const handleAssignToBox = async () => {
  if (!selectedFile || !selectedBox) {
    toast.error('Please select both file and box');
    return;
  }

  try {
    setIsSubmitting(true);
    console.log('Assigning to box:', { documentId: selectedFile, boxId: selectedBox });
    
    const response = await documentApi.assignToBox({
      documentId: selectedFile,
      boxId: selectedBox
    });
    
    console.log('Assign response:', response);
    toast.success('File assigned to box successfully');
    
    setSelectedFile('');
    setSelectedBox('');
    setSearchQuery('');
    fetchDocuments(); // Refresh documents list
    fetchBoxes(); // Refresh boxes list
  } catch (error: any) {
    console.error('Assign to box error:', error);
    console.error('Error config:', error.config);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    if (error.response?.status === 404) {
      toast.error('API endpoint not found. Please check backend routes.');
    } else if (error.response?.status === 403) {
      toast.error('You do not have permission to assign files to boxes');
    } else {
      toast.error(error.response?.data?.error || 'Failed to assign file to box');
    }
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-white">
          <h2 className="text-3xl font-black mb-2">Add File to Box</h2>
          <p className="text-slate-400">Organize files into physical boxes for better tracking</p>
        </div>

        <div className="p-8 space-y-8">
          {/* File Selection */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 block">
              Select File to Add
            </label>
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Archive Ref, Claim #, Policy #, or Insured Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 mb-2 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" /> Claim Files
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" /> Policy Documents
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> Insured Name
              </span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              <AnimatePresence>
                {isLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                ) : filteredFiles.length > 0 ? (
                  filteredFiles.map((file) => (
                    <motion.div
                      key={file?.id || Math.random()}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      whileHover={{ scale: 1.01 }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedFile === file?.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-200'
                      }`}
                      onClick={() => file?.id && setSelectedFile(file.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {getDocumentIcon(file?.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-bold text-slate-900">
                                {file?.archive_reference_number || 'No Reference'}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                file?.type === 'Claim File' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : file?.type === 'Policy'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {file?.type || 'Unknown'}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-3 text-xs">
                              {file?.claim_number && (
                                <span className="flex items-center gap-1 text-blue-600">
                                  <Hash className="w-3 h-3" />
                                  Claim: {file.claim_number}
                                </span>
                              )}
                              {file?.policy_number && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <FileText className="w-3 h-3" />
                                  Policy: {file.policy_number}
                                </span>
                              )}
                              {file?.insured_name && (
                                <span className="flex items-center gap-1 text-purple-600">
                                  <User className="w-3 h-3" />
                                  {file.insured_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {selectedFile === file?.id && (
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    {searchQuery ? (
                      <div>
                        <p className="font-medium">No matching files found</p>
                        <p className="text-xs mt-1">Try searching by archive reference, claim number, policy number, or insured name</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">No active files available</p>
                        <p className="text-xs mt-1">Files with 'Active' status will appear here</p>
                      </div>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Box Selection */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 block">
              Select Destination Box
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <AnimatePresence>
                {boxes && boxes.length > 0 ? (
                  boxes.map((box) => (
                    <motion.div
                      key={box?.id || Math.random()}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      whileHover={{ scale: 1.01 }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedBox === box?.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-200'
                      }`}
                      onClick={() => box?.id && setSelectedBox(box.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="font-bold text-slate-900">{box?.identifier || 'Unknown Box'}</p>
                            <p className="text-xs text-slate-500">
                              {box?.fileType || 'Unknown Type'} • {box?.branchCode || 'No Branch'}
                            </p>
                          </div>
                        </div>
                        {selectedBox === box?.id && (
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No boxes available</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleAssignToBox}
              disabled={!selectedFile || !selectedBox || isSubmitting}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-black shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  Add File to Box
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};