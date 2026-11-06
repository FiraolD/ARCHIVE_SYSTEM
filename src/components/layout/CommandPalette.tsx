import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  /** called when the user picks "Search documents for …" */
  onSearchDocuments: (query: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, commands, onSearchDocuments }) => {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => { if (open) { setQuery(''); setIndex(0); } }, [open]);

  const q = query.trim();
  const results: Command[] = useMemo(() => {
    const needle = q.toLowerCase();
    const matches = needle
      ? commands.filter((c) => `${c.label} ${c.hint ?? ''}`.toLowerCase().includes(needle))
      : commands;
    const searchCmd: Command[] = q
      ? [{ id: '__search', label: `Search documents for “${q}”`, hint: 'Documents', icon: Search, run: () => onSearchDocuments(q) }]
      : [];
    return [...searchCmd, ...matches];
  }, [q, commands, onSearchDocuments]);

  useEffect(() => { setIndex(0); }, [q]);

  // keep the highlighted row in view while using the arrow keys
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const choose = (cmd?: Command) => {
    if (!cmd) return;
    onClose();
    cmd.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[index]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-[#08112E]/50 px-4 pt-[14vh] backdrop-blur-sm"
          onMouseDown={onClose}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label="Search and jump to"
            initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
            className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B1330]"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-white/10">
              <Search className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a claim number, name, or page…"
                aria-label="Search"
                className="h-14 w-full bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />
              <kbd className="shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">Esc</kbd>
            </div>

            <ul ref={listRef} role="listbox" className="custom-scrollbar max-h-[22rem] overflow-y-auto p-2">
              {results.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Nothing matches “{q}”.</li>
              ) : (
                results.map((c, i) => (
                  <li key={c.id} role="option" aria-selected={i === index} data-i={i}>
                    <button
                      type="button"
                      onMouseMove={() => setIndex(i)}
                      onClick={() => choose(c)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        i === index
                          ? 'bg-[#1E3C90]/10 text-[#1E3C90] dark:bg-[#16B0DF]/15 dark:text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <c.icon className={`h-4 w-4 shrink-0 ${i === index ? 'text-[#1E3C90] dark:text-[#16B0DF]' : 'text-slate-400'}`} />
                      <span className="flex-1 truncate">{c.label}</span>
                      {c.hint && <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{c.hint}</span>}
                      {i === index && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
              <span><kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> to move</span>
              <span><kbd className="font-sans">Enter</kbd> to open</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
