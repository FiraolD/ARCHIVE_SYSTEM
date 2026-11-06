import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, Menu, Search } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';

export interface TopbarNotification {
  id: string | number;
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
}

interface TopbarProps {
  onMenuClick: () => void;
  onOpenSearch: () => void;
  notifications: TopbarNotification[];
  onMarkRead: (id: any) => void;
  onMarkAllRead: () => void;
}

const timeAgo = (iso: string): string => {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(s)) return '';
  if (s < 45) return 'Just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 2592000) return `${Math.round(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick, onOpenSearch, notifications, onMarkRead, onMarkAllRead }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;

  // close the notification list on outside click or Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-white/10 dark:bg-[#070D24]/80 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Toggle navigation"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF] dark:text-slate-400 dark:hover:bg-white/10"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* search / command palette trigger */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex h-10 w-full max-w-md items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-500 transition hover:border-[#1E3C90]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF] dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-[#16B0DF]/40 dark:hover:bg-white/10"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">Search documents or jump to a page…</span>
        <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 sm:inline">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />

        <div className="relative" ref={wrapRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
            aria-expanded={open}
            className="relative grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF] dark:text-slate-400 dark:hover:bg-white/10"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-xs font-semibold leading-[18px] text-white ring-2 ring-white dark:ring-[#070D24]">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.14 }}
                className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B1330]"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Notifications
                    {unread > 0 && (
                      <span className="ml-2 rounded-full bg-[#1E3C90]/10 px-2 py-0.5 text-xs font-medium text-[#1E3C90] dark:bg-[#16B0DF]/15 dark:text-[#16B0DF]">
                        {unread} new
                      </span>
                    )}
                  </h2>
                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllRead}
                      className="flex items-center gap-1 rounded text-xs font-medium text-[#1E3C90] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF] dark:text-[#5CCBF0]"
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="custom-scrollbar max-h-[26rem] overflow-y-auto p-2">
                  {notifications.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                      <Bell className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">You're all caught up</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => onMarkRead(n.id)}
                        className={`mb-1 flex w-full gap-3 rounded-lg p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF] ${
                          n.read
                            ? 'hover:bg-slate-50 dark:hover:bg-white/5'
                            : 'bg-[#1E3C90]/5 hover:bg-[#1E3C90]/10 dark:bg-[#16B0DF]/10 dark:hover:bg-[#16B0DF]/15'
                        }`}
                      >
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-[#16B0DF]'}`} />
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm ${n.read ? 'text-slate-600 dark:text-slate-400' : 'font-medium text-slate-900 dark:text-white'}`}>{n.title}</span>
                          <span className="mt-0.5 block text-[13px] leading-snug text-slate-500 dark:text-slate-400">{n.message}</span>
                          <span className="mt-1.5 block text-xs text-slate-400 dark:text-slate-500">{timeAgo(n.timestamp)}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
