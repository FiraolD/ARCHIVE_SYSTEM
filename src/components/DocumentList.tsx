import React from 'react';
import { FileText, Eye, History, FileQuestion, MapPin, CheckCircle, Package, ArrowLeft } from 'lucide-react';
import { Document } from '../types';
import { motion } from 'framer-motion';
import { UI_LABELS } from '../lib/constants';

interface DocumentListProps {
  documents: Document[];
  onPreview: (doc: Document) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({ documents, onPreview }) => {
  if (documents.length === 0) {
    return (
      <div className="dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center">
          <FileQuestion className="w-8 h-8 text-slate-300" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">{UI_LABELS.EMPTY_STATE_DOCS}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
            Start by uploading documents to the archive using the Add/Ingest Files tab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Document & Ref</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Placement</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <motion.tr
                key={doc.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-slate-50 dark:bg-slate-800/50 transition-colors group"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{doc.title}</p>
                      <p className="text-[10px] font-bold text-blue-600 font-mono">{doc.archiveReferenceNumber}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-600">{doc.type}</span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={doc.status} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs text-slate-600 max-w-[120px] truncate" title={doc.physicalPlacement}>
                      {doc.physicalPlacement}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onPreview(doc)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-blue-600 flex items-center gap-2 text-xs font-bold"
                      aria-label="Preview document"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: Document['status'] }> = ({ status }) => {
 const styles: Record<string, string> = {
  'Active': 'bg-green-50 text-green-700 border-green-100',
  'Checked-out': 'bg-amber-50 text-amber-700 border-amber-100',
  'Settled Claims': 'bg-blue-50 text-blue-700 border-blue-100',
  'Returned': 'bg-purple-50 text-purple-700 border-purple-100', // Add this
};

  const icons: Record<string, React.ReactNode> = {
    'Active': <History className="w-3 h-3" />,
    'Checked-out': <Package className="w-3 h-3" />,
    'Settled Claims': <CheckCircle className="w-3 h-3" />,
    'Returned': <ArrowLeft className="w-3 h-3" />,
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 border-slate-200 dark:border-slate-700'}`}>
      {icons[status] || <FileText className="w-3 h-3" />}
      {status}
    </span>
  );
};