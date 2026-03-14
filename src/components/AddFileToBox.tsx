// src/components/AddFileToBox.tsx
import React, { useState, useEffect } from 'react';
import { Package, Search, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useArchive } from '../context/ArchiveContext';
import { documentApi, registrationApi } from '../services/api';

export const AddFileToBox: React.FC = () => {
  const { documents, boxes, fetchDocuments, fetchBoxes } = useArchive();
  const [selectedFile, setSelectedFile] = useState('');
  const [selectedBox, setSelectedBox] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFiles = documents.filter(doc => 
    doc.status === 'Active' &&
    (doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     doc.archiveReferenceNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAssignToBox = async () => {
    if (!selectedFile || !selectedBox) {
      toast.error('Please select both file and box');
      return;
    }

    try {
      await documentApi.assignToBox({
        documentId: selectedFile,
        boxId: selectedBox
      });
      toast.success('File assigned to box successfully');
      setSelectedFile('');
      setSelectedBox('');
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to assign file to box');
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
                placeholder="Search files by title or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredFiles.map(file => (
                <motion.div
                  key={file.id}
                  whileHover={{ scale: 1.01 }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedFile === file.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-200'
                  }`}
                  onClick={() => setSelectedFile(file.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{file.title}</p>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        {file.archiveReferenceNumber}
                      </p>
                    </div>
                    {selectedFile === file.id && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Box Selection */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 block">
              Select Destination Box
            </label>
            <div className="space-y-2">
              {boxes.map(box => (
                <motion.div
                  key={box.id}
                  whileHover={{ scale: 1.01 }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedBox === box.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-200'
                  }`}
                  onClick={() => setSelectedBox(box.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="font-bold text-slate-900">{box.identifier}</p>
                        <p className="text-xs text-slate-500">
                          {box.fileType} • {box.branchCode}
                        </p>
                      </div>
                    </div>
                    {selectedBox === box.id && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleAssignToBox}
              disabled={!selectedFile || !selectedBox}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-black shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              Add File to Box
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};