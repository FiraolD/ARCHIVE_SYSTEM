import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle2, Loader2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { APP_CONFIG } from '../config';

interface FileUploadState {
  file: File;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  archiveRef?: string;
}

export const DocumentUploader: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [physicalPlacement, setPhysicalPlacement] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const generateArchiveRef = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ARC-${year}-${random}`;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file: File) => {
    const allowedTypes = APP_CONFIG.ALLOWED_FILE_TYPES;
    const maxSizeInBytes = APP_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      toast.error(`File type ${file.type} is not supported.`);
      return false;
    }
    if (file.size > maxSizeInBytes) {
      toast.error(`File is too large. Maximum size is ${APP_CONFIG.MAX_FILE_SIZE_MB}MB.`);
      return false;
    }
    return true;
  };

  const simulateUpload = (fileIndex: number) => {
    let progress = 0;
    const archiveRef = generateArchiveRef();
    
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        setFiles(prev => prev.map((f, i) => i === fileIndex ? { 
          ...f, 
          progress: 100, 
          status: 'complete',
          archiveRef 
        } : f));
        clearInterval(interval);
        toast.success(`Upload complete: ${files[fileIndex]?.file.name || 'File'}`);
      } else {
        setFiles(prev => prev.map((f, i) => i === fileIndex ? { ...f, progress } : f));
      }
    }, 400);
  };

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const validFiles = Array.from(newFiles).filter(validateFile);
    
    validFiles.forEach(file => {
      const newIndex = files.length;
      setFiles(prev => [...prev, { file, progress: 0, status: 'uploading' }]);
      simulateUpload(newIndex);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
            <MapPin className="w-3 h-3" /> Physical Placement
          </label>
          <input 
            type="text" 
            placeholder="e.g. Room A, Shelf 4, Box 12"
            value={physicalPlacement}
            onChange={(e) => setPhysicalPlacement(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative p-8 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center min-h-[200px] ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleChange}
          className="hidden"
          accept={APP_CONFIG.ALLOWED_FILE_TYPES.join(',') ?? '*'}
          aria-label="Upload documents"
        />
        <div className="p-4 bg-blue-100 rounded-full mb-4">
          <Upload className="w-8 h-8 text-blue-600" />
        </div>
        <p className="text-lg font-medium text-slate-700">Drag and drop files here</p>
        <p className="text-sm text-slate-500 mt-1">
          Supported formats: {APP_CONFIG.MAX_FILE_SIZE_MB}MB max size
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          Select Files
        </button>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {files.map((item, idx) => (
            <motion.div
              key={`${item.file.name}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 bg-white border border-slate-200 rounded-lg flex items-center gap-4 shadow-sm"
            >
              <div className="p-2 bg-slate-100 rounded">
                <FileText className="w-6 h-6 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.file.name}</p>
                  <span className="text-xs text-slate-500">{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                {item.archiveRef && (
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-2">
                    REF: {item.archiveRef}
                  </p>
                )}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.progress}%` }}
                    className={`h-full ${item.status === 'complete' ? 'bg-green-500' : 'bg-blue-600'}`}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.status === 'uploading' && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
                {item.status === 'complete' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                <button
                  onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                  className="p-1 hover:bg-slate-100 rounded-full"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};