// src/components/ui/index.tsx
import React, { useEffect } from 'react';
import { LucideIcon, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ============================================================
   PAGE HEADER
   ============================================================ */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
}
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon: Icon, actions }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 md:p-10 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl shadow-blue-500/20"
  >
    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-2 md:mb-4">{title}</h1>
        {subtitle && <p className="text-blue-100 text-base md:text-lg font-medium leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0 flex-wrap">{actions}</div>}
    </div>
    <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
      <Icon size={200} />
    </div>
  </motion.div>
);

interface PageHeaderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  variant?: 'glass' | 'solid';
  children: React.ReactNode;
}
export const PageHeaderButton: React.FC<PageHeaderButtonProps> = ({
  icon: Icon, variant = 'glass', children, className = '', ...rest
}) => {
  const base = 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    glass: 'bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white',
    solid: 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg',
  };
  return (
    <button {...rest} className={`${base} ${variants[variant]} ${className}`}>
      {Icon && <Icon className="w-4 h-4" />}
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
  title, icon: Icon, actions, children, className = '', bodyClassName = 'p-6',
}) => (
  <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
    {(title || actions) && (
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          {title && <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    )}
    <div className={bodyClassName}>{children}</div>
  </div>
);

/* ============================================================
   STAT CARD
   ============================================================ */
type StatColor = 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'slate';
const STAT_COLORS: Record<StatColor, string> = {
  blue: 'bg-blue-500', green: 'bg-green-500', amber: 'bg-amber-500',
  purple: 'bg-purple-500', red: 'bg-red-500', slate: 'bg-slate-500',
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
}) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    onClick={onClick}
    className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 ${STAT_COLORS[color]} rounded-2xl text-white shadow-lg`}>
        <Icon className="w-6 h-6" />
      </div>
      {progress !== undefined && (
        <span className="text-xs font-bold text-slate-400">{progress.toFixed(1)}%</span>
      )}
    </div>
    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{title}</p>
    <h4 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{value}</h4>
    {subtitle && <p className="text-xs font-medium text-slate-400 mt-2">{subtitle}</p>}
    {progress !== undefined && (
      <div className="mt-4 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-purple-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    )}
  </motion.div>
);

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
  <div className={`bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 flex flex-col items-center text-center ${className}`}>
    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
    </div>
    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
    {description && <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/* ============================================================
   FILTER BAR & SEARCH
   ============================================================ */
interface FilterBarProps { children: React.ReactNode; className?: string; }
export const FilterBar: React.FC<FilterBarProps> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm ${className}`}>
    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">{children}</div>
  </div>
);

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}
export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder, className = '' }) => (
  <div className={`relative flex-1 ${className}`}>
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
    />
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
          className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            className={`bg-white dark:bg-slate-900 rounded-3xl w-full ${MODAL_SIZES[size]} shadow-2xl max-h-[90vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-3xl z-10">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{title}</h3>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            )}
            <div className="p-6">{children}</div>
            {footer && <div className="px-6 pb-6 flex gap-3 justify-end">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================
   FORM PRIMITIVES
   ============================================================ */
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
}
export const FormInput: React.FC<FormInputProps> = ({ label, icon: Icon, className = '', ...rest }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
      {Icon && <Icon className="w-3 h-3" />} {label}
    </label>
    <input
      {...rest}
      className={`w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-slate-800 dark:text-slate-100 ${className}`}
    />
  </div>
);

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  icon?: LucideIcon;
}
export const FormSelect: React.FC<FormSelectProps> = ({ label, icon: Icon, children, className = '', ...rest }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
      {Icon && <Icon className="w-3 h-3" />} {label}
    </label>
    <select
      {...rest}
      className={`w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-800 dark:text-slate-100 ${className}`}
    >
      {children}
    </select>
  </div>
);