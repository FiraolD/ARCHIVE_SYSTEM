// src/components/PageHeaderButton.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  /** 'glass' = secondary (outlined), 'solid' = primary (brand navy). Names kept so existing pages don't change. */
  variant?: 'glass' | 'solid';
  children: React.ReactNode;
}

export const PageHeaderButton: React.FC<PageHeaderButtonProps> = ({
  icon: Icon,
  variant = 'glass',
  children,
  className = '',
  type = 'button',
  ...rest
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
