import React from 'react';
import {
  FileText, Eye, History, MapPin, CheckCircle, Package,
  ArrowLeft, Calendar, DollarSign, Hash, Building2,
  Layers, ChevronDown, CheckCircle2, Ban,
} from 'lucide-react';
import { Document } from '../types';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const pick = <T,>(...vals: (T | undefined | null | '')[]): T | undefined =>
  vals.find((v) => v !== undefined && v !== null && v !== '') as T | undefined;

export interface DocumentCardProps {
  doc: Document;
  onPreview?: (doc: Document) => void;
  onSelect?: (doc: Document) => void;
  groupCount?: number;
  isOpen?: boolean;
  onToggleGroup?: () => void;
  selected?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  compact?: boolean;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  doc, onPreview, onSelect, groupCount, isOpen, onToggleGroup,
  selected, disabled, disabledMessage, compact,
}) => {
  const archiveRef = pick(doc.archive_reference_number, doc.archiveReferenceNumber);
  const claimNo = pick(doc.claim_number, doc.claimNumber);
  const policyNo = pick(doc.policy_number, doc.policyNumber);
  const insuredName = pick(doc.insured_name, doc.insuredName);
  const sumInsured = pick(doc.sum_insured);
  const accidentDate = pick(doc.date_of_accident);
  const plateNumber = pick(doc.plate_number, doc.plateNumber);
  const branchName = pick(doc.branch_name, doc.branch);
  const physicalPlacement = pick(doc.physical_placement, doc.physicalPlacement);

  const handleClick = () => {
    if (disabled) return;
    if (onSelect) onSelect(doc);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className={[
        'bg-white dark:bg-slate-900 rounded-xl border transition-all overflow-hidden',
        compact ? 'shadow-none' : 'shadow-sm hover:shadow-md',
        selected
          ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-500'
          : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700',
        disabled ? 'opacity-60 cursor-not-allowed' : onSelect ? 'cursor-pointer' : '',
      ].join(' ')}
    >
      <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${groupCount ? 'bg-indigo-50 dark:bg-indigo-950/50' : 'bg-blue-50 dark:bg-blue-950/50'}`}>
            {groupCount
              ? <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              : <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate" title={doc.title}>{doc.title}</h3>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{doc.type}</span>
              {archiveRef && (
                <>
                  <span className="text-[11px] text-slate-300 dark:text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(String(archiveRef)); }}
                    title="Copy archive reference"
                    className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline break-all text-left"
                  >
                    {archiveRef}
                  </button>
                </>
              )}
            </div>
            {insuredName && (
              <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 break-words" title={String(insuredName)}>
                {insuredName}
              </div>
            )}
          </div>
          <StatusBadge status={doc.status} />
        </div>
      </div>

      <div className="px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <CardField label="Claim number" icon={<Hash className="w-3 h-3" />} mono>{claimNo}</CardField>
        <CardField label="Policy number" icon={<Hash className="w-3 h-3" />} mono>{policyNo}</CardField>
        <CardField label="Sum insured" icon={<DollarSign className="w-3 h-3" />}>
          {sumInsured != null ? `ETB ${Number(sumInsured).toLocaleString()}` : null}
        </CardField>
        <CardField label="Date of accident" icon={<Calendar className="w-3 h-3" />}>
          {accidentDate ? format(new Date(accidentDate), 'MMM dd, yyyy') : null}
        </CardField>
        <CardField label="Plate" icon={<Hash className="w-3 h-3" />} mono>{plateNumber}</CardField>
        <CardField label="Branch" icon={<Building2 className="w-3 h-3" />}>{branchName}</CardField>
      </div>

      <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate" title={physicalPlacement}>{physicalPlacement || 'No placement'}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {groupCount && onToggleGroup && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleGroup(); }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center gap-1 transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              {groupCount} copies
            </button>
          )}
          {onSelect && (
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              selected ? 'bg-blue-600 text-white'
              : disabled ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              {disabled
                ? <><Ban className="w-3.5 h-3.5" /> Unavailable</>
                : <><CheckCircle2 className="w-3.5 h-3.5" /> {selected ? 'Selected' : 'Select'}</>}
            </span>
          )}
          {onPreview && !onSelect && (
            <button
              onClick={(e) => { e.stopPropagation(); onPreview(doc); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" /> View
            </button>
          )}
        </div>
      </div>

      {disabled && disabledMessage && (
        <div className="px-5 py-2 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-100 dark:border-amber-900 text-[11px] font-medium text-amber-700 dark:text-amber-300">
          {disabledMessage}
        </div>
      )}
    </motion.div>
  );
};

const CardField: React.FC<{ label: string; icon?: React.ReactNode; mono?: boolean; children: React.ReactNode }> = ({ label, icon, mono, children }) => (
  <div className="min-w-0">
    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
      {icon}{label}
    </div>
    <div className={`text-xs text-slate-800 dark:text-slate-200 truncate ${mono ? 'font-mono' : ''}`}>
      {children || <span className="text-slate-300 dark:text-slate-600">—</span>}
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: Document['status'] }> = ({ status }) => {
  const styles: Record<string, string> = {
    Active: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900',
    'Checked-out': 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    'Settled Claims': 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
    Returned: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900',
  };
  const icons: Record<string, React.ReactNode> = {
    Active: <History className="w-3 h-3" />,
    'Checked-out': <Package className="w-3 h-3" />,
    'Settled Claims': <CheckCircle className="w-3 h-3" />,
    Returned: <ArrowLeft className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${styles[status] || 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
      {icons[status] || <FileText className="w-3 h-3" />}{status}
    </span>
  );
};