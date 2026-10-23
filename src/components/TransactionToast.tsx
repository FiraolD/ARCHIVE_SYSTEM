import React from 'react';
import { CheckCircle2, FileText, Package, RefreshCcw, X } from 'lucide-react';
import { toast } from 'sonner';

interface TransactionToastProps {
  title: string;
  message: string;
  type: 'success' | 'info' | 'error';
  iconType?: 'file' | 'box' | 'status' | 'default';
  toastId?: string | number;
}

export const showTransactionToast = ({
  title,
  message,
  type,
  iconType = 'default',
  toastId
}: TransactionToastProps) => {
  const icons = {
    file: <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    box: <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    status: <RefreshCcw className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
    default: <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />,
  };

  const bgColors = {
    success: 'bg-green-50 dark:bg-slate-900 border-green-200 dark:border-green-900/50',
    info: 'bg-blue-50 dark:bg-slate-900 border-blue-200 dark:border-blue-900/50',
    error: 'bg-red-50 dark:bg-slate-900 border-red-200 dark:border-red-900/50',
  };

  toast.custom((t) => (
    <div className={`${bgColors[type]} border rounded-2xl p-4 shadow-xl flex items-start gap-4 w-[350px] relative overflow-hidden`}>
      {/* Accent Bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} />
      
      <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm shrink-0">
        {icons[iconType]}
      </div>
      
      <div className="flex-1 min-w-0 pr-4">
        <p className="font-black text-slate-900 dark:text-white text-sm">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-medium">{message}</p>
      </div>

      <button 
        onClick={() => toast.dismiss(t)}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  ), { id: toastId });
};