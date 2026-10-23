import React, { useState, useEffect } from 'react';
import {
  X, ZoomIn, ZoomOut, RotateCw, Download, Share2, History, User,
  Calendar, MapPin, Save, Edit3, Hash, DollarSign, Building2, Layers,
} from 'lucide-react';
import { Document } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_CONFIG } from '../config';
import { useArchive } from '../context/ArchiveContext';

const pick = <T,>(...vals: (T | undefined | null | '')[]): T | undefined =>
  vals.find((v) => v !== undefined && v !== null && v !== '') as T | undefined;

interface DocumentPreviewProps {
  document: Document | null;
  onClose: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ document, onClose }) => {
  const { updatePhysicalPlacement } = useArchive();
  const [zoom, setZoom] = useState(100);
  const [showHistory, setShowHistory] = useState(false);
  const [isEditingPlacement, setIsEditingPlacement] = useState(false);
  const [placement, setPlacement] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (document) {
      setPlacement((pick(document.physical_placement, document.physicalPlacement) as string) || '');
      setIsEditingPlacement(false);
      setShowHistory(false);
      setZoom(100);
    }
  }, [document]);

  if (!document) return null;

  const archiveRef = pick(document.archive_reference_number, document.archiveReferenceNumber);
  const claimNo = pick(document.claim_number, document.claimNumber);
  const policyNo = pick(document.policy_number, document.policyNumber);
  const insuredName = pick(document.insured_name, document.insuredName);
  const plateNumber = pick(document.plate_number, document.plateNumber);
  const branchName = pick(document.branch_name, document.branch);
  const dateAdded = pick(document.date_added, document.dateAdded, document.created_at, document.createdAt);
  const accidentDate = pick(document.date_of_accident);
  const sumInsured = pick(document.sum_insured);
  const estimatedLoss = pick(document.estimated_loss, document.estimatedLoss);
  const legacyFields = document.product_custom_fields;

  const handleSavePlacement = async () => {
    try {
      setSaving(true);
      await updatePhysicalPlacement(document.id, placement);
      setIsEditingPlacement(false);
    } catch { /* context toasts */ } finally { setSaving(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-4xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" aria-label="Close preview">
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight truncate" title={document.title}>{document.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">Ref: {archiveRef || '—'} • {document.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
                showHistory ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <History className="w-4 h-4" /> History
            </button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300" title="Download"><Download className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300" title="Share"><Share2 className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 bg-slate-100 dark:bg-slate-950 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-full flex items-center gap-4 shadow-lg z-20">
              <button onClick={() => setZoom((z) => Math.max(50, z - 25))} className="hover:text-blue-400"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-xs font-medium w-12 text-center">{zoom}%</span>
              <button onClick={() => setZoom((z) => Math.min(200, z + 25))} className="hover:text-blue-400"><ZoomIn className="w-4 h-4" /></button>
              <div className="w-px h-4 bg-slate-600" />
              <button className="hover:text-blue-400"><RotateCw className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-auto p-8 flex justify-center">
              <motion.div animate={{ scale: zoom / 100 }} className="w-full max-w-[800px] bg-white shadow-xl rounded-lg min-h-[1100px] p-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h1 className="text-2xl font-black text-blue-900 mb-1">{APP_CONFIG.PREMIUM_PROTECTION_NAME}</h1>
                    <p className="text-[10px] text-slate-400 tracking-[0.2em] uppercase">Premium Protection Systems</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">Ref: {archiveRef || '—'}</p>
                    <p className="text-[10px] text-slate-500">Archived: {dateAdded ? format(new Date(dateAdded), 'MMMM dd, yyyy') : '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <MetaField label="Claim number" icon={<Hash className="w-3 h-3" />} mono>{claimNo}</MetaField>
                  <MetaField label="Policy number" icon={<Hash className="w-3 h-3" />} mono>{policyNo}</MetaField>
                  <MetaField label="Insured name" icon={<User className="w-3 h-3" />}>{insuredName}</MetaField>
                  <MetaField label="Plate number" icon={<Hash className="w-3 h-3" />} mono>{plateNumber}</MetaField>
                  <MetaField label="Sum insured" icon={<DollarSign className="w-3 h-3" />}>{sumInsured != null ? `ETB ${Number(sumInsured).toLocaleString()}` : null}</MetaField>
                  <MetaField label="Date of accident" icon={<Calendar className="w-3 h-3" />}>{accidentDate ? format(new Date(accidentDate), 'MMM dd, yyyy') : null}</MetaField>
                  <MetaField label="Estimated loss" icon={<DollarSign className="w-3 h-3" />}>{estimatedLoss != null ? `ETB ${Number(estimatedLoss).toLocaleString()}` : null}</MetaField>
                  <MetaField label="Branch" icon={<Building2 className="w-3 h-3" />}>{branchName}</MetaField>
                  <MetaField label="Type">{document.type}</MetaField>
                  <MetaField label="Status">{document.status}</MetaField>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><MapPin className="w-3 h-3" /> Physical Placement</h3>
                    {!isEditingPlacement ? (
                      <button onClick={() => setIsEditingPlacement(true)} className="text-blue-600 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-colors"><Edit3 className="w-3 h-3" /></button>
                    ) : (
                      <button onClick={handleSavePlacement} disabled={saving} className="text-green-600 hover:text-green-700 p-1 rounded-md hover:bg-green-50 transition-colors disabled:opacity-50"><Save className="w-3 h-3" /></button>
                    )}
                  </div>
                  {isEditingPlacement ? (
                    <input
                      autoFocus type="text"
                      className="w-full bg-white border border-blue-200 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={placement}
                      onChange={(e) => setPlacement(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSavePlacement()}
                    />
                  ) : (
                    <p className="text-sm text-slate-800 font-medium">{placement || 'No placement recorded'}</p>
                  )}
                </div>
                {legacyFields?.legacy_source && (
                  <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 mb-6">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
                      <Layers className="w-3.5 h-3.5" /> Legacy Record
                    </div>
                    <div className="mt-1.5 text-xs text-indigo-800 space-y-0.5">
                      <div>Source: <span className="font-mono">{legacyFields.legacy_source}</span></div>
                      {legacyFields.legacy_id && <div>Legacy ID: <span className="font-mono">{legacyFields.legacy_id}</span></div>}
                    </div>
                  </div>
                )}
                <div className="space-y-4 mt-8">
                  <div className="h-4 w-1/3 bg-slate-100 rounded" />
                  <div className="h-10 w-full bg-slate-50 rounded" />
                  <div className="space-y-3">
                    <div className="h-3 w-full bg-slate-100 rounded" />
                    <div className="h-3 w-full bg-slate-100 rounded" />
                    <div className="h-3 w-5/6 bg-slate-100 rounded" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                className="border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-y-auto"
              >
                <div className="p-6">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Versioning Timeline
                  </h3>
                  {(document.versions?.length ?? 0) === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">No version history yet.</p>
                  ) : (
                    <div className="relative pl-6 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-700">
                      {document.versions.map((v, i) => (
                        <div key={v.id} className="relative">
                          <div className={`absolute -left-[23px] top-1.5 w-[10px] h-[10px] rounded-full border-2 ${i === 0 ? 'bg-blue-600 border-blue-200 dark:border-blue-900' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`} />
                          <div className={`p-4 rounded-xl border transition-all ${i === 0 ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-900 shadow-sm' : 'bg-transparent border-transparent'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Version {v.version}.0</span>
                              {i === 0 && <span className="text-[10px] bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">CURRENT</span>}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{v.changes}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                              <User className="w-3 h-3" /><span>{v.updatedBy}</span>
                              <span className="mx-1">•</span>
                              <Calendar className="w-3 h-3" /><span>{format(new Date(v.updatedAt), 'MMM dd')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

const MetaField: React.FC<{ label: string; icon?: React.ReactNode; mono?: boolean; children: React.ReactNode }> = ({ label, icon, mono, children }) => (
  <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 min-w-0">
    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">{icon}{label}</div>
    <div className={`text-sm text-slate-800 dark:text-slate-100 truncate ${mono ? 'font-mono' : ''}`}>
      {children || <span className="text-slate-300">—</span>}
    </div>
  </div>
);