// src/components/PageHeaderButton.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  variant?: 'glass' | 'solid';
  children: React.ReactNode;
}

export const PageHeaderButton: React.FC<PageHeaderButtonProps> = ({
  icon: Icon,
  variant = 'glass',
  children,
  className = '',
  ...rest
}) => {
  const base =
    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    glass:
      'bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white',
    solid: 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg',
  };

  return (
    <button {...rest} className={`${base} ${variants[variant]} ${className}`}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};