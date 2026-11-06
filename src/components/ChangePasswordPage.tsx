import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Check, Eye, EyeOff, Loader2, Lock, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useArchive } from '../context/ArchiveContext';
import { Logo } from './Logo';

const MIN_LENGTH = 8;

/** 0 = too short ... 4 = strong. Only the length rule is enforced; the rest guides people to a better password. */
const strengthOf = (p: string): number => {
  if (p.length < MIN_LENGTH) return 0;
  let s = 1;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
};
const STRENGTH_LABEL = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['bg-slate-600', 'bg-red-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500'];

export const ChangePasswordPage: React.FC = () => {
  const { user, changePassword, logout } = useArchive();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = strengthOf(newPassword);
  const longEnough = newPassword.length >= MIN_LENGTH;
  const matches = confirmPassword.length > 0 && newPassword === confirmPassword;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit = longEnough && matches && !isSubmitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!longEnough) { toast.error(`Your password must be at least ${MIN_LENGTH} characters`); return; }
    if (newPassword !== confirmPassword) { toast.error('The passwords do not match'); return; }

    try {
      setIsSubmitting(true);
      await changePassword(undefined, newPassword);
    } catch {
      // The context reports the API error.
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'h-12 w-full rounded-lg border border-white/15 bg-white/[0.06] pl-11 pr-12 text-[15px] text-white outline-none transition ' +
    'placeholder:text-slate-500 focus:border-[#16B0DF] focus:ring-2 focus:ring-[#16B0DF]/25 disabled:opacity-60';

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: 'radial-gradient(900px circle at 10% 105%, #1E3C90 0%, rgba(30,60,144,0) 60%), #08112E' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center gap-4">
          <Logo className="h-14 w-auto rounded-lg bg-white p-2 shadow-lg" variant="light" />
          <span className="text-2xl font-extrabold tracking-tight text-white">
            Awash<span className="font-light text-[#16B0DF]">Arch</span>
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
          <h1 className="text-xl font-semibold text-white">Set your password</h1>
          <p className="mt-1.5 text-sm text-slate-300">
            Welcome, {user?.name}. Choose a personal password to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
            {/* new password */}
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-slate-200">New password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="new-password" type={show ? 'text' : 'password'} autoComplete="new-password" autoFocus
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting} placeholder={`At least ${MIN_LENGTH} characters`} className={inputClass}
                />
                <button
                  type="button" onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide passwords' : 'Show passwords'} aria-pressed={show}
                  className="absolute inset-y-0 right-1.5 grid w-10 place-items-center rounded-md text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF]"
                >
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* strength meter */}
              {newPassword.length > 0 && (
                <div className="mt-3" aria-live="polite">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${strength >= i ? STRENGTH_COLOR[strength] : 'bg-white/10'}`} />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-300">
                    Strength: <span className="font-medium text-white">{STRENGTH_LABEL[strength]}</span>
                    {strength > 0 && strength < 3 && <span className="text-slate-400"> · try a longer phrase with numbers and symbols</span>}
                  </p>
                </div>
              )}

              <p className={`mt-2 flex items-center gap-1.5 text-xs ${longEnough ? 'text-emerald-400' : 'text-slate-400'}`}>
                <Check className="h-3.5 w-3.5" /> At least {MIN_LENGTH} characters
              </p>
            </div>

            {/* confirm */}
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-slate-200">Confirm new password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="confirm-password" type={show ? 'text' : 'password'} autoComplete="new-password"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting} placeholder="Re-enter your new password"
                  aria-invalid={mismatch}
                  className={`${inputClass} ${mismatch ? '!border-red-400 focus:!ring-red-400/30' : ''}`}
                />
              </div>
              {mismatch && (
                <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" /> The passwords do not match yet.
                </p>
              )}
              {matches && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> Passwords match
                </p>
              )}
            </div>

            <button
              type="submit" disabled={!canSubmit}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1E3C90] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(30,60,144,0.9)] transition hover:bg-[#2748AB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08112E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving password…</> : 'Save password and continue'}
            </button>

            <button
              type="button" onClick={logout}
              className="flex w-full items-center justify-center gap-2 py-1 text-sm text-slate-300 transition hover:text-white"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
