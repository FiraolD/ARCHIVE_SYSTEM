// src/components/PageHeader.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  actions,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-blue-600 to-blue-800 p-10 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl shadow-blue-500/20"
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-black tracking-tighter mb-4">{title}</h1>
          {subtitle && (
            <p className="text-blue-100 text-lg font-medium leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
      <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
        <Icon size={200} />
      </div>
    </motion.div>
  );
};