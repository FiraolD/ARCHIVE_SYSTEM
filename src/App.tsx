import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { 
  FileText, 
  UploadCloud, 
  ShieldCheck, 
  History, 
  Settings, 
  Bell, 
  Menu,
  User as UserIcon,
  Search,
  Building2,
  RefreshCcw,
  ChevronRight,
  FileSearch,
  CheckCircle2,
  LogOut,
  TrendingUp,
  Users,
  Package,
  Archive,
  Grid,
  FolderOpen,
  Layers,
  Box,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentPreview } from './components/DocumentPreview';
import { Document, Role } from './types';
import { Toaster, toast } from 'sonner';
import { UI_LABELS } from './lib/constants';
import { useArchive } from './context/ArchiveContext';
import { ArchiveProvider } from './context/ArchiveContext';
import { ThemeProvider } from './context/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import { Logo } from './components/Logo';

// Lazy-loaded pages (named exports adapted for React.lazy)
const LoginPage = lazy(() => import('./components/LoginPage').then(m => ({ default: m.LoginPage })));
const OperationsDashboard = lazy(() => import('./components/OperationsDashboard').then(m => ({ default: m.OperationsDashboard })));
const FileRequestPage = lazy(() => import('./components/FileRequestPage').then(m => ({ default: m.FileRequestPage })));
const RegistrationPage = lazy(() => import('./components/RegistrationForms').then(m => ({ default: m.RegistrationPage })));
const StatusUpdatePage = lazy(() => import('./components/StatusUpdatePage').then(m => ({ default: m.StatusUpdatePage })));
const AddIngestFileForm = lazy(() => import('./components/AddIngestFileForm').then(m => ({ default: m.AddIngestFileForm })));
const AdminRequests = lazy(() => import('./components/AdminRequests').then(m => ({ default: m.AdminRequests })));
const UserManagement = lazy(() => import('./components/UserManagement').then(m => ({ default: m.UserManagement })));
const ReportsPage = lazy(() => import('./components/ReportsPage'));

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

type AppTab = 'file-request' | 'dashboard' | 'user-management' | 'registration' | 'status-update' | 'upload' | 'request-management' | 'reports';

const AppContent: React.FC = () => {
  const { 
    user, 
    documents, 
    notifications, 
    markNotificationRead,
    markAllNotificationsRead,
    logout,
    fetchDocuments,
    fetchNotifications
  } = useArchive();
  
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch documents on mount and when tab changes
  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchNotifications();
    }
  }, [user]);

  // Filter documents based on search
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter(doc => 
      doc.title?.toLowerCase().includes(query) ||
      doc.id?.toLowerCase().includes(query) ||
      doc.archiveReferenceNumber?.toLowerCase().includes(query) ||
      (doc.physicalPlacement && doc.physicalPlacement.toLowerCase().includes(query)) ||
      (doc.policyNumber && doc.policyNumber.toLowerCase().includes(query)) ||
      (doc.claimNumber && doc.claimNumber.toLowerCase().includes(query)) ||
      (doc.insuredName && doc.insuredName.toLowerCase().includes(query)) ||
      (doc.plateNumber && doc.plateNumber.toLowerCase().includes(query))
    );
  }, [searchQuery, documents]);

  // Updated menu items
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'file-request', label: UI_LABELS.SIDEBAR.FILE_REQUEST, icon: FileSearch },
    { 
      id: 'registration', 
      label: 'Registration', 
      icon: Building2, 
      roles: ['Admin'],
      subItems: [
        { id: 'branch', label: 'Branch Registration', icon: Building2 },
        { id: 'department', label: 'Department', icon: Layers },
        { id: 'product', label: 'Product', icon: Package },
        { id: 'box', label: 'Box Registration', icon: Box },
        { id: 'drawer-assignment', label: 'Drawer Assignment', icon: Square },
        { id: 'add-to-box', label: 'Add File to Box', icon: FolderOpen }
      ]
    },
    { id: 'status-update', label: UI_LABELS.SIDEBAR.STATUS_UPDATE, icon: RefreshCcw, roles: ['Admin', 'Manager'] },
    { id: 'upload', label: UI_LABELS.SIDEBAR.UPLOAD, icon: UploadCloud, roles: ['Admin'] },
    { id: 'user-management', label: 'User Management', icon: Users, roles: ['Admin'] },
    { id: 'request-management', label: 'Request Management', icon: CheckCircle2, roles: ['Admin'] },
    { id: 'reports', label: 'Reports', icon: Grid, roles: ['Admin', 'Manager'] }
  ];

  const visibleMenuItems = menuItems.filter(item => 
    !item.roles || (user && item.roles.includes(user.role))
  );

  // Handle tab change
  const handleTabChange = (tabId: AppTab, subTab?: string) => {
    const tabData = menuItems.find(m => m.id === tabId);
    if (tabData?.roles && user && !tabData.roles.includes(user.role)) {
      toast.error('You do not have permission to access this section');
      return;
    }
    setActiveTab(tabId);
    if (subTab) {
      // Handle sub tab if needed
    }
  };

  // Filter notifications based on user role
  const filteredNotifications = notifications.filter(n => {
    if (n.adminOnly) return user?.role === 'Admin';
    return true;
  });

  const unreadNotifications = filteredNotifications.filter(n => !n.read);

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    toast.success('All notifications marked as read');
  };

  // If no user, show login page
  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-950 font-sans text-slate-900	dark:text-white dark:text-white dark:text-slate-100 overflow-hidden">
      <Toaster position="top-right" expand={false} richColors />
      
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(true)}
            className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          width: sidebarOpen ? 280 : 80,
          x: 0 
        }}
        className={`bg-[#0f172a] dark:bg-slate-950 text-slate-400 dark:text-slate-500 dark:text-slate-400 flex flex-col relative z-50 transition-all duration-300 ease-in-out border-r border-white/5 dark:border-slate-800/50 ${
          !sidebarOpen ? 'w-[80px]' : 'w-[280px]'
        }`}
      >
        <div className="p-6 flex items-center gap-3">
          <Logo className="w-10 h-10" variant="light" />
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-white font-black tracking-tighter text-2xl truncate dark:text-slate-200"
            >
              AWAISH<span className="text-blue-400 dark:text-blue-400">ARCH</span>
            </motion.span>
          )}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {visibleMenuItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => handleTabChange(item.id as AppTab)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${
                  activeTab === item.id 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 dark:shadow-blue-600/20' 
                    : 'hover:dark:bg-slate-800/5 hover:text-white dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 transition-transform ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                {sidebarOpen && <span className="font-bold text-sm tracking-tight truncate">{item.label}</span>}
              </button>
              
              {/* Submenu items for Registration */}
              {sidebarOpen && item.subItems && activeTab === 'registration' && (
                <div className="ml-8 mt-2 space-y-1">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.id}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:dark:bg-slate-800/5 dark:text-slate-500 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <subItem.icon className="w-4 h-4" />
                      <span>{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 dark:border-slate-800/50 space-y-4">
          <div className="flex items-center gap-3 px-4 py-3 dark:bg-slate-800/5 rounded-2xl border border-white/5 dark:border-slate-800/50 dark:bg-slate-800/30">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-white/10 dark:border-slate-700">
              <UserIcon className="w-5 h-5 text-slate-400 dark:text-slate-300" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white truncate dark:text-slate-100">{user.name}</p>
                <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest dark:text-blue-400">{user.role}</p>
              </div>
            )}
          </div>
          
          {sidebarOpen && (
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:dark:bg-slate-800/5 rounded-xl transition-all group dark:text-slate-500 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-bold text-sm">Sign Out</span>
            </button>
          )}
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 dark:bg-slate-800/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 dark:border-slate-800 px-8 flex items-center justify-between z-40 sticky top-0">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 dark:text-slate-400 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-slate-400 dark:text-slate-500 dark:text-slate-400 font-medium">Archive System</span>
              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
              <span className="text-slate-900	dark:text-white dark:text-white dark:text-white font-black capitalize">{activeTab.replace('-', ' ')}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700">
              <span className="px-3 py-1.5 text-xs font-black text-slate-600 dark:text-slate-300">
                {user.role}
              </span>
            </div>
            
            {/* Theme Toggle */}
            <ThemeToggle />
            
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl relative text-slate-500 dark:text-slate-400 dark:text-slate-400 transition-colors group"
              >
                <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-80 dark:bg-slate-800 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <h4 className="font-black text-slate-900	dark:text-white dark:text-white dark:text-white">Notifications</h4>
                      <div className="flex items-center gap-2">
                        {unreadNotifications.length > 0 && (
                          <button 
                            onClick={handleMarkAllRead}
                            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold"
                          >
                            Mark all read
                          </button>
                        )}
                        <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto p-2">
                      {filteredNotifications.length > 0 ? (
                        filteredNotifications.map(notification => (
                          <div 
                            key={notification.id} 
                            onClick={() => markNotificationRead(notification.id)}
                            className={`p-4 rounded-2xl mb-1 cursor-pointer transition-colors ${
                              notification.read 
                                ? 'opacity-50 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-700' 
                                : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50'
                            }`}
                          >
                            <p className="text-xs font-black text-slate-900	dark:text-white dark:text-white dark:text-white mb-1">{notification.title}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-tight font-medium">{notification.message}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-2">
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                          <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400 font-medium">No notifications</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <button className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 dark:text-slate-400 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10">
          <div className="max-w-[1400px] mx-auto">
            <Suspense fallback={<PageLoader />}>
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <OperationsDashboard />
                </motion.div>
              )}

              {activeTab === 'file-request' && (
                <motion.div
                  key="file-request"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <FileRequestPage />
                </motion.div>
              )}

              {activeTab === 'registration' && user?.role === 'Admin' && (
                <motion.div
                  key="registration"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <RegistrationPage />
                </motion.div>
              )}

              {activeTab === 'status-update' && (user?.role === 'Admin' || user?.role === 'Manager') && (
                <motion.div
                  key="status-update"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <StatusUpdatePage />
                </motion.div>
              )}

              {activeTab === 'upload' && user?.role === 'Admin' && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <AddIngestFileForm userRole={user.role} />
                </motion.div>
              )}
              {activeTab === 'request-management' && user?.role === 'Admin' && (
                <motion.div
                key="request-management"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                >
                  <AdminRequests />
                </motion.div>
)}
              {activeTab === 'user-management' && user?.role === 'Admin' && (
                <motion.div
                  key="user-management"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <UserManagement />
                </motion.div>
              )}
              {activeTab === 'reports' && (user?.role === 'Admin' || user?.role === 'Manager') && (
                <motion.div
                  key="reports"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <ReportsPage />
                </motion.div>
              )}
            </AnimatePresence>
            </Suspense>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {selectedDoc && (
          <DocumentPreview 
            document={selectedDoc} 
            onClose={() => setSelectedDoc(null)} 
          />
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ArchiveProvider>
        <AppContent />
      </ArchiveProvider>
    </ThemeProvider>
  );
};

export default App;