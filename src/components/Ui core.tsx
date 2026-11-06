/**
 * Drop-in replacements for four components that live in your `components/ui` file.
 * Props match how the pages already call them, so no page needs to change.
 * Replace the old definitions of SectionCard, StatCard, EmptyState and SearchInput with these.
 */
import React, { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ------------------------------- SectionCard ------------------------------ */

interface SectionCardProps {
  title: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  bodyClassName?: string;
  className?: string;
  children: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title, icon: Icon, actions, bodyClassName = 'p-5', className = '', children,
}) => (
  <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03] ${className}`}>
    <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
      <h2 className="flex items-center gap-2.5 text-base font-semibold text-slate-900 dark:text-white">
        {Icon && <Icon className="h-5 w-5 text-[#1E3C90] dark:text-[#16B0DF]" />}
        {title}
      </h2>
      {actions}
    </header>
    <div className={bodyClassName}>{children}</div>
  </section>
);

/* -------------------------------- StatCard -------------------------------- */

type StatColor = 'blue' | 'green' | 'purple' | 'amber' | 'red';

// Fewer rainbow colours: blue and purple both read as "brand"; green/amber/red keep their meaning.
const TONE: Record<StatColor, string> = {
  blue: 'bg-[#1E3C90]/10 text-[#1E3C90] dark:bg-[#16B0DF]/15 dark:text-[#16B0DF]',
  purple: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

/** Counts up once when it scrolls into view; strings such as "178 MB" are shown as they are. */
const Value: React.FC<{ value: number | string }> = ({ value }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  const countable = typeof value === 'number' || (/^[\d,]+$/.test(String(value)) && Number.isFinite(numeric));

  useEffect(() => {
    if (!countable || !inView || !ref.current || reduce) return;
    const c = animate(0, numeric, {
      duration: 0.9,
      ease: 'easeOut',
      onUpdate: (v) => { if (ref.current) ref.current.textContent = Math.round(v).toLocaleString('en-US'); },
    });
    return () => c.stop();
  }, [countable, inView, numeric, reduce]);

  return <span ref={ref}>{countable ? numeric.toLocaleString('en-US') : value}</span>;
};

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: StatColor;
  subtitle?: string;
  progress?: number;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color = 'blue', subtitle, progress }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[#1E3C90]/30 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[#16B0DF]/30">
    <span className={`grid h-10 w-10 place-items-center rounded-lg ${TONE[color]}`}>
      <Icon className="h-5 w-5" />
    </span>
    <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{title}</p>
    <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
      <Value value={value} />
    </p>
    {subtitle && <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
    {typeof progress === 'number' && (
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div className="h-full rounded-full bg-[#1E3C90] transition-all duration-700 dark:bg-[#16B0DF]" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
    )}
  </div>
);

/* ------------------------------- EmptyState ------------------------------- */

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center dark:border-white/10">
    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5">
      <Icon className="h-6 w-6" />
    </span>
    <p className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* ------------------------------- SearchInput ------------------------------ */

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = 'Search…', className = '' }) => (
  <div className={`relative ${className}`}>
    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Escape') onChange(''); }}
      placeholder={placeholder}
      aria-label={placeholder}
      className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1E3C90] focus:bg-white focus:ring-2 focus:ring-[#1E3C90]/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-[#16B0DF] dark:focus:ring-[#16B0DF]/25"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Clear search"
        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
);
