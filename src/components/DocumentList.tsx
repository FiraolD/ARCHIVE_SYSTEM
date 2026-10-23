import React, { useMemo, useState } from 'react';
import { FileQuestion } from 'lucide-react';
import { Document } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { UI_LABELS } from '../lib/constants';
import { DocumentCard } from './DocumentCard';

interface DocumentListProps {
  documents: Document[];
  onPreview: (doc: Document) => void;
  groupDuplicates?: boolean;
}

interface Group {
  key: string;
  claimNumber: string | null;
  docs: Document[];
}

const pick = <T,>(...vals: (T | undefined | null | '')[]): T | undefined =>
  vals.find((v) => v !== undefined && v !== null && v !== '') as T | undefined;

export const DocumentList: React.FC<DocumentListProps> = ({ documents, onPreview, groupDuplicates = true }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const groups: Group[] = useMemo(() => {
    if (!groupDuplicates) {
      return documents.map((d) => ({
        key: d.id,
        claimNumber: (pick(d.claim_number, d.claimNumber) as string) ?? null,
        docs: [d],
      }));
    }
    const map = new Map<string, Group>();
    for (const d of documents) {
      const ck = ((pick(d.claim_number, d.claimNumber) as string) || '').trim().toLowerCase() || d.id;
      if (!map.has(ck)) map.set(ck, { key: ck, claimNumber: (pick(d.claim_number, d.claimNumber) as string) ?? null, docs: [] });
      map.get(ck)!.docs.push(d);
    }
    return Array.from(map.values());
  }, [documents, groupDuplicates]);

  if (documents.length === 0) {
    return (
      <div className="dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center">
          <FileQuestion className="w-8 h-8 text-slate-300" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200">{UI_LABELS.EMPTY_STATE_DOCS}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
            Start by uploading documents to the archive using the Add/Ingest Files tab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {groups.map((g) => {
        const primary = g.docs[0];
        const isGroup = g.docs.length > 1;
        const isOpen = !!expanded[g.key];
        return (
          <div key={g.key} className={isGroup && isOpen ? 'col-span-full' : ''}>
            <DocumentCard
              doc={primary}
              onPreview={onPreview}
              groupCount={isGroup ? g.docs.length : undefined}
              isOpen={isOpen}
              onToggleGroup={isGroup ? () => setExpanded((s) => ({ ...s, [g.key]: !s[g.key] })) : undefined}
            />
            <AnimatePresence>
              {isGroup && isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mt-3 ml-4 border-l-2 border-indigo-200 dark:border-indigo-900 pl-4 space-y-3"
                >
                  {g.docs.slice(1).map((d) => (
                    <DocumentCard key={d.id} doc={d} onPreview={onPreview} compact />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};