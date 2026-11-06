// src/components/ui/index.tsx
// Drop-in replacement: same exports and props as before, new look.
// Brand colours are written as hex (navy #1E3C90, cyan #16B0DF) so they never depend on the Tailwind theme.
import React, { useEffect, useRef } from 'react';
import { LucideIcon, Search, X } from 'lucide-react';
import { motion, AnimatePresence, animate, useInView, useReducedMotion } from 'framer-motion';

/* ============================================================
   PAGE HEADER  (compact: ~70px instead of the old ~165px banner)
   ============================================================ */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon: Icon, actions }) => (
  <motion.header
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <div className="flex min-w-0 items-center gap-4">
      {Icon && (
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#1E3C90]/10 text-[#1E3C90] dark:bg-[#16B0DF]/15 dark:text-[#16B0DF]">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </motion.header>
);

interface PageHeaderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  /** 'glass' = secondary (outlined), 'solid' = primary (brand navy). Names kept so pages don't change. */
  variant?: 'glass' | 'solid';
  children: React.ReactNode;
}
export const PageHeaderButton: React.FC<PageHeaderButtonProps> = ({
  icon: Icon, variant = 'glass', children, className = '', type = 'button', ...rest
}) => {
  const base =
    'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#070D24] ' +
    'disabled:cursor-not-allowed disabled:opacity-50';
  const variants = {
    glass:
      'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 ' +
      'dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10',
    solid: 'bg-[#1E3C90] text-white shadow-sm hover:bg-[#2748AB]',
  };
  return (
    <button {...rest} type={type} className={`${base} ${variants[variant]} ${className}`}>
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
};

/* ============================================================
   SECTION CARD
   ============================================================ */
interface SectionCardProps {
  title?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}
export const SectionCard: React.FC<SectionCardProps> = ({
  title, icon: Icon, actions, children, className = '', bodyClassName = 'p-5',
}) => (
  <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03] ${className}`}>
    {(title || actions) && (
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="h-5 w-5 text-[#1E3C90] dark:text-[#16B0DF]" />}
          {title && <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

/* ============================================================
   STAT CARD
   ============================================================ */
type StatColor = 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'slate';
// Fewer rainbow colours: blue and purple both read as "brand"; green / amber / red keep their meaning.
const STAT_TONE: Record<StatColor, string> = {
  blue: 'bg-[#1E3C90]/10 text-[#1E3C90] dark:bg-[#16B0DF]/15 dark:text-[#16B0DF]',
  purple: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
};

/** Counts up once when scrolled into view. Text like "178 MB" is shown as it is. */
const StatValue: React.FC<{ value: number | string }> = ({ value }) => {
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
  value: string | number;
  icon: LucideIcon;
  color?: StatColor;
  subtitle?: string;
  progress?: number;
  onClick?: () => void;
}
export const StatCard: React.FC<StatCardProps> = ({
  title, value, icon: Icon, color = 'blue', subtitle, progress, onClick,
}) => {
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full rounded-xl border border-slate-200 bg-white p-5 text-left transition dark:border-white/10 dark:bg-white/[0.03] ${
        onClick
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-[#1E3C90]/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF] dark:hover:border-[#16B0DF]/40'
          : 'hover:border-[#1E3C90]/30 dark:hover:border-[#16B0DF]/30'
      }`}
    >
      <div className="flex items-start justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${STAT_TONE[color]}`}>
          <Icon className="h-5 w-5" />
        </span>
        {progress !== undefined && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{progress.toFixed(1)}%</span>
        )}
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
        <StatValue value={value} />
      </p>
      {subtitle && <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-[#1E3C90] transition-all duration-700 dark:bg-[#16B0DF]"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </Tag>
  );
};

/* ============================================================
   EMPTY STATE
   ============================================================ */
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}
export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, className = '' }) => (
  <div className={`flex flex-col items-center rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center dark:border-white/10 ${className}`}>
    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5">
      <Icon className="h-6 w-6" />
    </span>
    <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* ============================================================
   FILTER BAR & SEARCH
   ============================================================ */
interface FilterBarProps { children: React.ReactNode; className?: string; }
export const FilterBar: React.FC<FilterBarProps> = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03] ${className}`}>
    <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">{children}</div>
  </div>
);

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}
export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = 'Search…', className = '' }) => (
  <div className={`relative flex-1 ${className}`}>
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

/* ============================================================
   MODAL
   ============================================================ */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
}
const MODAL_SIZES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl',
};
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, size = 'md', footer }) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#08112E]/50 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.18 }}
            className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B1330] ${MODAL_SIZES[size]}`}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-100 bg-white px-6 py-4 dark:border-white/10 dark:bg-[#0B1330]">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
                <button
                  type="button" onClick={onClose} aria-label="Close"
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF] dark:hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="p-6">{children}</div>
            {footer && <div className="flex justify-end gap-3 px-6 pb-6">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================
   FORM PRIMITIVES
   ============================================================ */
const FIELD_BASE =
  'w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition ' +
  'placeholder:text-slate-400 focus:border-[#1E3C90] focus:ring-2 focus:ring-[#1E3C90]/20 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 ' +
  'dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-[#16B0DF] dark:focus:ring-[#16B0DF]/25';

const FieldLabel: React.FC<{ label: string; icon?: LucideIcon; htmlFor?: string }> = ({ label, icon: Icon, htmlFor }) => (
  <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
    {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />} {label}
  </label>
);

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
}
export const FormInput: React.FC<FormInputProps> = ({ label, icon, className = '', id, ...rest }) => {
  const autoId = React.useId();
  const fieldId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} icon={icon} htmlFor={fieldId} />
      <input {...rest} id={fieldId} className={`h-11 ${FIELD_BASE} ${className}`} />
    </div>
  );
};

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  icon?: LucideIcon;
}
export const FormSelect: React.FC<FormSelectProps> = ({ label, icon, children, className = '', id, ...rest }) => {
  const autoId = React.useId();
  const fieldId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} icon={icon} htmlFor={fieldId} />
      <select {...rest} id={fieldId} className={`h-11 ${FIELD_BASE} font-medium ${className}`}>
        {children}
      </select>
    </div>
  );
};
