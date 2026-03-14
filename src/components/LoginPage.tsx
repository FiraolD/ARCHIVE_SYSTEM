// src/components/LoginPage.tsx
import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useArchive } from '../context/ArchiveContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useArchive();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    
    // Simple validation
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (password.length < 3) {
      toast.error('Password must be at least 3 characters');
      return;
    }
    
    try {
      setIsLoading(true);
      await login(email, password);
      // If login succeeds, the app will automatically show the main content
    } catch (error) {
      // Error is handled in context, but we can add additional handling here
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 p-8 text-white relative">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black tracking-tight">INSUREARCH</h2>
            <p className="text-slate-400 mt-1">Document Archive System</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@insurearch.com"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-medium"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-medium"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-black shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
            
            <p className="text-xs text-center text-slate-400 mt-4">
              Demo credentials: admin@insurearch.com / admin123
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
};