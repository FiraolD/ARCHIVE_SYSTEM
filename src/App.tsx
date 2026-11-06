import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { useArchive, ArchiveProvider } from './context/ArchiveContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { CommandPalette } from './components/layout/CommandPalette';
import type { Command } from './components/layout/CommandPalette';
import { NAV_ITEMS, canSee } from './components/layout/nav.ts';
import type { AppTab } from './components/layout/nav.ts';

/* ---------------------------------------------------------------------------
   Pages are loaded on demand. The same loader functions are used to PRELOAD a
   page when the pointer hovers its menu item, so the click feels instant.
--------------------------------------------------------------------------- */
const load = {
  dashboard: () => import('./components/OperationsDashboard'),
  documents: () => import('./components/DocumentsPage'),
  'file-request': () => import('./components/FileRequestPage'),
  registration: () => import('./components/RegistrationForms'),
  'status-update': () => import('./components/StatusUpdatePage'),
  upload: () => import('./components/AddIngestFileForm'),
  'request-management': () => import('./components/AdminRequests'),
  'user-management': () => import('./components/UserManagement'),
  reports: () => import('./components/ReportsPage'),
  'admin-query': () => import('./components/AdminQueryPage'),
} as const;

const LoginPage = lazy(() => import('./components/LoginPage').then((m) => ({ default: m.LoginPage })));
const ChangePasswordPage = lazy(() => import('./components/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })));
const ConsoleAuthGate = lazy(() => import('./components/ConsoleAuthGate').then((m) => ({ default: m.ConsoleAuthGate })));
const OperationsDashboard = lazy(() => load.dashboard().then((m) => ({ default: m.OperationsDashboard })));
const DocumentsPage = lazy(() => load.documents().then((m) => ({ default: m.DocumentsPage })));
const FileRequestPage = lazy(() => load['file-request']().then((m) => ({ default: m.FileRequestPage })));
const RegistrationPage = lazy(() => load.registration().then((m) => ({ default: m.RegistrationPage })));
const StatusUpdatePage = lazy(() => load['status-update']().then((m) => ({ default: m.StatusUpdatePage })));
const AddIngestFileForm = lazy(() => load.upload().then((m) => ({ default: m.AddIngestFileForm })));
const AdminRequests = lazy(() => load['request-management']().then((m) => ({ default: m.AdminRequests })));
const UserManagement = lazy(() => load['user-management']().then((m) => ({ default: m.UserManagement })));
const ReportsPage = lazy(() => load.reports());
const AdminQueryPage = lazy(() => load['admin-query']().then((m) => ({ default: m.AdminQueryPage })));

const prefetch = (tab: AppTab) => { load[tab]?.().catch(() => { /* offline or renamed: the click will report it */ }); };

/** Shown while a page's code downloads: a grey outline of a page instead of a lone spinner. */
const PageSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy aria-label="Loading page">
    <div className="flex items-center gap-4">
      <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
      <div className="space-y-2">
        <div className="h-6 w-56 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-200 dark:bg-white/10" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />)}
    </div>
    <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
  </div>
);

const SIDEBAR_KEY = 'awasharch.sidebar.collapsed';

const AppContent: React.FC = () => {
  const {
    user, notifications, markNotificationRead, markAllNotificationsRead,
    logout, fetchDocuments, fetchNotifications, filters, setFilters,
  } = useArchive();

  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [registrationTab, setRegistrationTab] = useState('branch');
  const [isConsoleAuthorized, setIsConsoleAuthorized] = useState(false);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === '1'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [docsKey, setDocsKey] = useState(0); // bump to re-mount the Documents page after a palette search

  // ==========================================
  // COMBINED SESSION & HIDDEN ROUTE CHECK (unchanged)
  // ==========================================
  useEffect(() => {
    if (!user) return;

    // 1. Fetch initial data
    fetchDocuments();
    fetchNotifications();

    // 2. Check if the user is trying to access the console via URL
    const path = decodeURIComponent(window.location.pathname).toLowerCase();
    const isConsoleUrl = path.endsWith('/console') || path.includes('/archive system/console');

    if (isConsoleUrl) {
      if (user.role === 'Admin') {
        // The Auth Gate catches this in the render cycle.
        setActiveTab('admin-query');
      } else {
        toast.error('Access Denied. Only Admins can access the Console.');
        setActiveTab('dashboard');
        window.history.replaceState({}, '', '/');
      }
    } else {
      setActiveTab('dashboard');
      if (window.location.pathname !== '/' && window.location.pathname !== '') {
        window.history.replaceState({}, '', '/');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Ctrl/⌘ + K opens the search palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleLogout = () => {
    window.history.replaceState({}, '', '/');
    setIsConsoleAuthorized(false);
    setActiveTab('dashboard');
    setMobileOpen(false);
    logout();
  };

  const visibleMenuItems = useMemo(
    () => NAV_ITEMS.filter((item) => canSee(item.roles, user?.role)),
    [user?.role],
  );

  const handleTabChange = useCallback((tabId: AppTab, subTab?: string) => {
    const tabData = NAV_ITEMS.find((m) => m.id === tabId);
    if (tabData?.roles && user && !tabData.roles.includes(user.role)) {
      toast.error('You do not have permission to access this section');
      return;
    }
    setActiveTab(tabId);
    setMobileOpen(false);

    if (tabId === 'registration' && !subTab) {
      // File Clerks start on 'box', Admins on 'branch'
      setRegistrationTab(user?.role === 'File Clerk' ? 'box' : 'branch');
    } else if (tabId === 'registration' && subTab) {
      setRegistrationTab(subTab);
    }
  }, [user]);

  const onMenuClick = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setCollapsed((c) => {
        const next = !c;
        try { localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0'); } catch { /* ignore */ }
        return next;
      });
    } else {
      setMobileOpen(true);
    }
  };

  const searchDocuments = useCallback((q: string) => {
    setFilters({ page: 1, limit: filters?.limit ?? 20, search: q });
    setDocsKey((k) => k + 1);
    handleTabChange('documents');
  }, [setFilters, filters?.limit, handleTabChange]);

  const commands: Command[] = useMemo(() => {
    const list: Command[] = [];
    visibleMenuItems.forEach((item) => {
      if (item.subItems) {
        item.subItems
          .filter((s) => canSee(s.roles, user?.role))
          .forEach((s) => list.push({
            id: `registration:${s.id}`, label: s.label, hint: 'Registration', icon: s.icon,
            run: () => handleTabChange('registration', s.id),
          }));
      } else {
        list.push({ id: item.id, label: item.label, hint: item.group || 'Overview', icon: item.icon, run: () => handleTabChange(item.id) });
      }
    });
    return list;
  }, [visibleMenuItems, user?.role, handleTabChange]);

  const visibleNotifications = notifications.filter((n: any) => (n.adminOnly ? user?.role === 'Admin' : true));

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    toast.success('All notifications marked as read');
  };

  // ==========================================
  // GATES (unchanged)
  // ==========================================
  if (!user) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <LoginPage />
      </Suspense>
    );
  }

  if (user.must_change_password) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <ChangePasswordPage />
      </Suspense>
    );
  }

  if (activeTab === 'admin-query' && user.role === 'Admin' && !isConsoleAuthorized) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <ConsoleAuthGate
          onAuthenticated={() => setIsConsoleAuthorized(true)}
          onCancel={() => {
            setActiveTab('dashboard');
            window.history.replaceState({}, '', '/');
          }}
        />
      </Suspense>
    );
  }

  // ==========================================
  // PAGE CONTENT (same role rules as before)
  // ==========================================
  const isStaff = user.role === 'Admin' || user.role === 'File Clerk';
  const isAdmin = user.role === 'Admin';

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return <OperationsDashboard />;
      case 'documents': return <DocumentsPage key={docsKey} />;
      case 'file-request': return <FileRequestPage />;
      case 'registration': return isStaff ? <RegistrationPage activeTab={registrationTab} /> : null;
      case 'status-update': return isStaff ? <StatusUpdatePage /> : null;
      case 'admin-query': return isAdmin ? <AdminQueryPage /> : null;
      case 'upload': return isStaff ? <AddIngestFileForm userRole={user.role} /> : null;
      case 'request-management': return isStaff ? <AdminRequests /> : null;
      case 'user-management': return isAdmin ? <UserManagement /> : null;
      case 'reports': return isStaff ? <ReportsPage /> : null;
      default: return null;
    }
  };

  // ==========================================
  // MAIN LAYOUT
  // ==========================================
  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6FB] font-sans text-slate-900 dark:bg-[#070D24] dark:text-slate-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-[#1E3C90] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      <Sidebar
        items={visibleMenuItems}
        activeTab={activeTab}
        registrationTab={registrationTab}
        onNavigate={handleTabChange}
        onPrefetch={prefetch}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        user={{ name: user.name, role: user.role }}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onMenuClick={onMenuClick}
          onOpenSearch={() => setPaletteOpen(true)}
          notifications={visibleNotifications as any}
          onMarkRead={markNotificationRead}
          onMarkAllRead={handleMarkAllRead}
        />

        <main id="main" className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1400px]">
            <Suspense fallback={<PageSkeleton />}>
              {/* quick fade-in, no waiting for an exit animation */}
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                {renderPage()}
              </motion.div>
            </Suspense>
          </div>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
        onSearchDocuments={searchDocuments}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ArchiveProvider>
        <AppContent />
        {/* One Toaster for the whole app, so messages also appear on the sign-in, password and console screens. */}
        <Toaster
          position="top-right"
          expand={false}
          closeButton
          toastOptions={{
            classNames: {
              toast: 'group bg-white dark:bg-[#0B1330] border border-slate-200 dark:border-white/10 shadow-2xl rounded-xl p-4 flex gap-3',
              title: 'font-semibold text-slate-900 dark:text-white text-sm',
              description: 'text-slate-500 dark:text-slate-400 text-xs mt-1',
            },
          }}
        />
      </ArchiveProvider>
    </ThemeProvider>
  );
};

export default App;
