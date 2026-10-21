import React, { useState } from 'react';
import { RetentionPolicy } from '../types';
import { ChevronDown, ShieldCheck, Scale, Info, Clock, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RetentionPoliciesProps {
  policies: RetentionPolicy[];
}

export const RetentionPolicies: React.FC<RetentionPoliciesProps> = ({ policies }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Retention & Compliance</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Document governance according to regulatory standards.</p>
      </div>
      <div className="px-3 py-1 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-900 rounded-full flex items-center gap-2 text-xs font-bold">
        <ShieldCheck className="w-4 h-4" />
        System Compliant
      </div>
    </div>

    {policies.length === 0 ? (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6 text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm">No retention policies defined for the current organization.</p>
      </div>
    ) : (
      <div className="grid gap-3">
        {policies.map((policy) => (
          <PolicyAccordion key={policy.id} policy={policy} />
        ))}
      </div>
    )}
  </div>
);

const PolicyAccordion: React.FC<{ policy: RetentionPolicy }> = ({ policy }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`border rounded-xl transition-all ${
      isOpen
        ? 'border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
    }`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${
            isOpen
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100">{policy.category}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Period: {policy.duration}</p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 mt-2 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                    <Info className="w-3 h-3" /> Description
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{policy.description}</p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                    <Scale className="w-3 h-3" /> Legal Reference
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{policy.legalRequirement}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};