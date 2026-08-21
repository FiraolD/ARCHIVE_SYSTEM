// src/components/LoginPage.tsx
import React, { useState } from 'react';
import { Mail, Lock, LogIn, Building2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useArchive } from '../context/ArchiveContext';
import { Logo } from './Logo';

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
    
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (password.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }
    
    try {
      setIsLoading(true);
      await login(email, password);
    } catch (error) {
      console.error('Login failed. Please check your credentials and try again.', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* Logo Section Above Card */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo className="w-auto h-24 rounded-lg" variant="light" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            AWASH<span className="text-blue-400">ARCHIVE</span>
          </h1>
          <p className="text-slate-300 mt-2 text-sm">Enterprise Document Archive System</p>
        </div>

        {/* Login Card with Glass Effect */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
          <div className="bg-white/10 p-6 text-center border-b border-white/10">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white">Welcome Back</h2>
            <p className="text-slate-300 text-sm mt-1">Sign in to access your documents</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@awashinsure.com"
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:ring-4 focus:ring-blue-500/20 outline-none text-white placeholder-white/40 font-medium transition-all focus:border-blue-500"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:ring-4 focus:ring-blue-500/20 outline-none text-white placeholder-white/40 font-medium transition-all focus:border-blue-500"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold shadow-xl shadow-blue-500/30 hover:shadow-blue-600/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
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
          </form>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-400 text-xs">
            Internal system for Archive Management.
          </p>
          <p className="mt-2 text-slate-500 text-[11px]">
            © 2026 Awash Insurance. All rights reserved.
          </p>
          <p className="mt-1 text-slate-600 text-[10px]">
            Developed by Firaol Delesa
          </p>
        </div>
      </motion.div>
    </div>
  );
};