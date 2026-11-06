import React, { useState } from 'react';
import { ShieldAlert, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useArchive } from '../context/ArchiveContext';

interface ConsoleAuthGateProps {
  onAuthenticated: () => void;
  onCancel: () => void;
}

// SECURITY: the password must never be written in source code. Anything in a VITE_* variable is
// still bundled into the browser app and can be read by anyone who opens it, so this gate is only a
// convenience. The real protection has to be a server-side check on the endpoints the console calls.
const CONSOLE_MASTER_PASSWORD: string | undefined = import.meta.env.VITE_CONSOLE_PASSWORD;
const ALLOWED_EMAIL = 'firaol_d@awashinsurance.com';

export const ConsoleAuthGate: React.FC<ConsoleAuthGateProps> = ({ onAuthenticated, onCancel }) => {
  const { user } = useArchive();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsLoading(true);

    // Simulate a tiny delay for security UX
    setTimeout(() => {
      if (!CONSOLE_MASTER_PASSWORD) {
        toast.error('The console password is not configured.');
        setIsLoading(false);
        return;
      }

      // 1. Check if the logged-in user is the authorized one
      if (user?.email !== ALLOWED_EMAIL) {
        toast.error('Access denied. You are not authorized to access the console.');
        setIsLoading(false);
        return;
      }

      // 2. Check the password against the hardcoded/env variable
      if (password === CONSOLE_MASTER_PASSWORD) {
        toast.success('Console unlocked');
        onAuthenticated();
      } else {
        toast.error('Invalid Console Password');
        setPassword(''); // Clear the input on failure
      }
      
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="bg-red-500/10 border-b border-red-500/20 p-6 text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-white">Restricted Area</h2>
          <p className="text-slate-400 text-sm mt-1">System Developer Access Only</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {/* Display the logged-in user for transparency */}
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 text-center">
            <p className="text-xs text-slate-400 mb-1">Logged in as</p>
            <p className="text-sm font-bold text-white">{user?.email}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 mb-2 block">
              Console Master Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="Enter code-side password..."
                className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-white placeholder-slate-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Unlock Console'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3 text-slate-400 hover:text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Safety
          </button>
        </form>
      </motion.div>
    </div>
  );
};