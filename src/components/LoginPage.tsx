import React, { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useAnimation,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Package,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useArchive } from '../context/ArchiveContext';
import { Logo } from './Logo';

/* -------------------------------------------------------------------------- */
/*  Brand palette (hard-coded so it does not depend on the Tailwind theme)     */
/*  ink #08112E · navy #1E3C90 · cyan #16B0DF · paper #F4F6FB                  */
/* -------------------------------------------------------------------------- */

const REMEMBER_KEY = 'awasharch.email';

/* ----------------------------- Archive wall data --------------------------- */

const COLS = 7;
const ROWS = 8;
const CELLS = Array.from({ length: COLS * ROWS }, (_, i) => i);
const cellLabel = (i: number) => `${String.fromCharCode(65 + Math.floor(i / COLS))}-${(i % COLS) + 1}`;
const cellDrawer = (i: number) => (i % 3) + 1;
// pick a cell in the right half of the wall so it is never hidden behind the text
const randomCell = () => Math.floor(Math.random() * ROWS) * COLS + (3 + Math.floor(Math.random() * (COLS - 3)));

/**
 * The shelving wall: a grid of archive boxes seen at a slight angle.
 * It is rendered twice – a dim base layer, and a bright "lit" layer that is
 * revealed only around the cursor through a radial mask.
 */
const Wall: React.FC<{ lit?: boolean; active?: number | null }> = ({ lit = false, active = null }) => (
  <div
    aria-hidden
    className="absolute inset-0 grid gap-3 p-6"
    style={{
      gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
      transform: 'perspective(1400px) rotateY(-16deg) rotateX(5deg) scale(1.2)',
      transformOrigin: '80% 50%',
    }}
  >
    {CELLS.map((i) => {
      const isActive = !lit && active === i;
      return (
        <motion.div
          key={i}
          animate={isActive ? { y: -7, scale: 1.05 } : { y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className={[
            'relative rounded-md border transition-colors duration-500',
            lit
              ? 'border-[#16B0DF]/70 bg-[#16B0DF]/10'
              : isActive
              ? 'border-[#16B0DF] bg-[#16B0DF]/25 shadow-[0_14px_28px_-10px_rgba(22,176,223,0.6)]'
              : 'border-white/[0.07] bg-white/[0.025]',
          ].join(' ')}
        >
          {/* label plate */}
          <span
            className={`absolute left-1/2 top-2 h-1.5 w-6 -translate-x-1/2 rounded-sm ${
              lit || isActive ? 'bg-[#16B0DF]' : 'bg-white/10'
            }`}
          />
          {/* handle */}
          <span
            className={`absolute bottom-2 left-1/2 h-1 w-3 -translate-x-1/2 rounded-full ${
              lit || isActive ? 'bg-[#16B0DF]/90' : 'bg-white/10'
            }`}
          />
          {isActive && (
            <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-cyan-100">
              {cellLabel(i)}
            </span>
          )}
        </motion.div>
      );
    })}
  </div>
);

/* --------------------------------- Field ---------------------------------- */

interface FieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  placeholder: string;
  icon: React.ReactNode;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onKey?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
  trailing?: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({
  id, label, type, value, placeholder, icon, onChange, onBlur, onKey, error, disabled, autoComplete, trailing,
}) => (
  <div>
    <div className="group relative">
      <span
        className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
          error
            ? 'text-red-500'
            : 'text-slate-400 group-focus-within:text-[#1E3C90] dark:group-focus-within:text-[#16B0DF]'
        }`}
      >
        {icon}
      </span>

      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKey}
        onKeyUp={onKey}
        className={[
          'peer h-14 w-full rounded-lg border bg-white pb-1 pl-11 pr-12 pt-5 text-[15px] font-medium text-slate-900',
          'outline-none transition placeholder:text-transparent focus:placeholder:text-slate-400',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'dark:bg-white/[0.04] dark:text-white dark:focus:placeholder:text-slate-500',
          error
            ? 'border-red-400 focus:ring-2 focus:ring-red-400/30'
            : 'border-slate-300 focus:border-[#1E3C90] focus:ring-2 focus:ring-[#1E3C90]/20 dark:border-white/15 dark:focus:border-[#16B0DF] dark:focus:ring-[#16B0DF]/25',
        ].join(' ')}
      />

      {/* floating label: sits in the field until it is focused or filled */}
      <label
        htmlFor={id}
        className={[
          'pointer-events-none absolute left-11 top-2 text-xs font-medium transition-all duration-150',
          'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px]',
          'peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs',
          error
            ? 'text-red-600 dark:text-red-400'
            : 'text-slate-500 peer-focus:text-[#1E3C90] dark:text-slate-400 dark:peer-focus:text-[#16B0DF]',
        ].join(' ')}
      >
        {label}
      </label>

      {trailing && <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>}
    </div>

    <AnimatePresence initial={false}>
      {error && (
        <motion.p
          id={`${id}-error`}
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <span className="flex items-center gap-1.5 pt-1.5 text-[13px] text-red-600 dark:text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </span>
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

/* ------------------------------ Validation -------------------------------- */

const validateEmail = (v: string) =>
  !v.trim()
    ? 'Enter your email address.'
    : !/^\S+@\S+\.\S+$/.test(v.trim())
    ? 'Enter a valid email, like name@awashinsure.com.'
    : '';

const validatePassword = (v: string) =>
  !v ? 'Enter your password.' : v.length < 4 ? 'Password must be at least 4 characters.' : '';

/* -------------------------------- Page ------------------------------------ */

type Status = 'idle' | 'loading' | 'success';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [capsOn, setCapsOn] = useState(false);
  const [activeCell, setActiveCell] = useState<number | null>(null);

  const { login } = useArchive();
  const reduceMotion = useReducedMotion();
  const shakeControls = useAnimation();
  const panelRef = useRef<HTMLDivElement>(null);

  const isLoading = status === 'loading';
  const emailError = touched.email ? validateEmail(email) : '';
  const passwordError = touched.password ? validatePassword(password) : '';

  /* restore remembered email */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {
      /* storage unavailable – ignore */
    }
  }, []);

  /* cursor spotlight over the archive wall */
  const mx = useMotionValue(600);
  const my = useMotionValue(360);
  const sx = useSpring(mx, { stiffness: 140, damping: 22 });
  const sy = useSpring(my, { stiffness: 140, damping: 22 });
  const litMask = useMotionTemplate`radial-gradient(230px circle at ${sx}px ${sy}px, #000 0%, transparent 100%)`;
  const glow = useMotionTemplate`radial-gradient(420px circle at ${sx}px ${sy}px, rgba(22,176,223,0.14), transparent 70%)`;

  useEffect(() => {
    const el = panelRef.current;
    if (el) {
      mx.set(el.clientWidth * 0.7);
      my.set(el.clientHeight * 0.4);
    }
  }, [mx, my]);

  const onPanelMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  /* the wall "finds" a box every few seconds */
  useEffect(() => {
    setActiveCell(randomCell());
    if (reduceMotion) return;
    const id = window.setInterval(() => setActiveCell(randomCell()), 3400);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const shake = () => {
    if (reduceMotion) return;
    shakeControls.start({ x: [0, -8, 8, -6, 6, -3, 3, 0], transition: { duration: 0.45 } });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setTouched({ email: true, password: true });
    const firstError = validateEmail(email) || validatePassword(password);
    if (firstError) {
      toast.error(firstError);
      shake();
      return;
    }

    try {
      setStatus('loading');
      await login(email.trim(), password);

      try {
        if (rememberMe) localStorage.setItem(REMEMBER_KEY, email.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* ignore */
      }

      setStatus('success');
      toast.success('Welcome back!');
      // If the page is still mounted after a moment, return the button to normal
      window.setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error('Login failed:', error);
      setStatus('idle');
      // Error toast is usually handled by the context, but just in case:
      toast.error('Invalid email or password');
      shake();
    }
  };

  /* one orchestrated entrance for the form */
  const rise = (i: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: 0.08 + i * 0.07, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
        };

  return (
    <div className="flex min-h-screen bg-[#F4F6FB] transition-colors duration-300 dark:bg-[#070D24]">
      {/* ======================= LEFT: the archive wall ======================= */}
      <div
        ref={panelRef}
        onMouseMove={onPanelMove}
        className="relative hidden overflow-hidden lg:block lg:w-1/2"
        style={{
          background:
            'radial-gradient(900px circle at 10% 105%, #1E3C90 0%, rgba(30,60,144,0) 62%), #08112E',
        }}
      >
        {/* dim wall */}
        <Wall active={activeCell} />

        {/* lit wall, revealed around the cursor */}
        <motion.div
          aria-hidden
          className="absolute inset-0"
          style={{ maskImage: litMask, WebkitMaskImage: litMask }}
        >
          <Wall lit />
        </motion.div>

        <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: glow }} />

        {/* scrim so the copy stays readable */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#08112E] via-[#08112E]/85 to-[#08112E]/0" />

        {/* content */}
        <motion.div
          {...(reduceMotion
            ? {}
            : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.8 } })}
          className="relative z-10 flex h-full min-h-screen flex-col justify-between p-12 xl:p-16"
        >
          <div className="flex items-center gap-4">
            <Logo className="h-12 w-auto rounded-lg bg-white p-1 shadow-lg" variant="light" />
            <span className="text-3xl font-extrabold tracking-tight text-white">
              Awash<span className="font-light text-[#16B0DF]">Arch</span>
            </span>
          </div>

          <div className="max-w-md pb-6">
            <p
              className="text-[42px] font-bold leading-[1.08] tracking-tight text-white xl:text-5xl"
              style={{ textWrap: 'balance' } as React.CSSProperties}
            >
              Find any insurance file in seconds.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-slate-300">
              Track, audit, and retrieve physical and digital records across every branch.
            </p>

            <ul className="mt-10 space-y-4">
              {[
                { icon: Search, text: 'Live file tracking and audit trail' },
                { icon: Users, text: 'Access based on each person’s role' },
                { icon: Package, text: 'Boxes and drawers assigned automatically' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3.5 text-[15px] font-medium text-slate-100">
                  <span className="grid h-8 w-8 place-items-center rounded-md border border-[#16B0DF]/40 bg-[#16B0DF]/10">
                    <Icon className="h-4 w-4 text-[#16B0DF]" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* caption that follows the wall's "lookup" */}
        <div aria-hidden className="pointer-events-none absolute bottom-10 right-10 z-10">
          <AnimatePresence mode="wait">
            {activeCell !== null && (
              <motion.div
                key={activeCell}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2.5 rounded-md border border-[#16B0DF]/40 bg-[#08112E]/80 px-3.5 py-2 text-sm text-cyan-100 backdrop-blur"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16B0DF] opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16B0DF]" />
                </span>
                Box {cellLabel(activeCell)}, drawer {cellDrawer(activeCell)} located
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ========================= RIGHT: the form ============================ */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6 sm:p-12">
        {/* faint brand wash in the corner */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full opacity-60 blur-3xl dark:opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(22,176,223,0.25), transparent 70%)' }}
        />

        <div className="relative w-full max-w-[400px]">
          {/* mobile brand */}
          <motion.div {...rise(0)} className="mb-10 flex items-center gap-3 lg:hidden">
            <Logo className="h-10 w-10" variant="dark" />
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Awash<span className="font-light text-[#1E3C90] dark:text-[#16B0DF]">Arch</span>
            </span>
          </motion.div>

          <motion.div {...rise(0)} className="mb-9">
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">
              Sign in to AwashArch
            </h1>
            <p className="mt-2 text-[15px] text-slate-500 dark:text-slate-400">
              Use your Awash Insurance email and password.
            </p>
          </motion.div>

          <motion.div animate={shakeControls}>
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <motion.div {...rise(1)}>
                <Field
                  id="email"
                  label="Email address"
                  type="email"
                  value={email}
                  placeholder="name@awashinsure.com"
                  autoComplete="username"
                  disabled={isLoading}
                  error={emailError}
                  onChange={setEmail}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  icon={<Mail className="h-5 w-5" />}
                />
              </motion.div>

              <motion.div {...rise(2)}>
                <Field
                  id="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLoading}
                  error={passwordError}
                  onChange={setPassword}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, password: true }));
                    setCapsOn(false);
                  }}
                  onKey={(e) => setCapsOn(e.getModifierState('CapsLock'))}
                  icon={<Lock className="h-5 w-5" />}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="grid h-10 w-10 place-items-center rounded-md text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF] dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  }
                />
                <AnimatePresence initial={false}>
                  {capsOn && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <span className="flex items-center gap-1.5 pt-1.5 text-[13px] text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        Caps Lock is on.
                      </span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div {...rise(3)} className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#1E3C90] focus-visible:ring-2 focus-visible:ring-[#16B0DF] dark:border-slate-600 dark:accent-[#16B0DF]"
                  />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Remember my email</span>
                </label>
                <button
                  type="button"
                  onClick={() => toast.info('Please contact your administrator to reset your password.')}
                  className="rounded text-sm font-semibold text-[#1E3C90] transition-colors hover:text-[#16B0DF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF] dark:text-[#5CCBF0] dark:hover:text-white"
                >
                  Forgot password?
                </button>
              </motion.div>

              <motion.div {...rise(4)}>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={[
                    'relative flex h-12 w-full items-center justify-center overflow-hidden rounded-lg font-semibold text-white',
                    'transition active:scale-[0.99] disabled:cursor-not-allowed',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16B0DF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#070D24]',
                    status === 'success'
                      ? 'bg-emerald-600'
                      : 'bg-[#1E3C90] shadow-[0_10px_24px_-10px_rgba(30,60,144,0.9)] hover:bg-[#2748AB]',
                  ].join(' ')}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={status}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-2"
                    >
                      {status === 'idle' && (
                        <>
                          <LogIn className="h-5 w-5" />
                          Sign in
                        </>
                      )}
                      {status === 'loading' && (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Signing in…
                        </>
                      )}
                      {status === 'success' && (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          Signed in
                        </>
                      )}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </motion.div>
            </form>
          </motion.div>

          <motion.div {...rise(5)} className="mt-12 space-y-1.5 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              <span>For authorised Awash Insurance staff only</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} Awash Insurance. Internal use only.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
