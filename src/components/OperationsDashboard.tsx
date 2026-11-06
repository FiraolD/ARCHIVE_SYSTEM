import React, { useEffect, useState } from 'react';
import {
<<<<<<< HEAD
  FileText, Clock, AlertCircle, CheckCircle2, User, Calendar,
  History, RefreshCw, FileSearch, Building2, Archive,
  LayoutDashboard, Database, Users, Activity, Server, HardDrive
=======
  FileText, AlertCircle, CheckCircle2, User, Calendar,
  History, RefreshCw, Hash, FileSearch, MapPin, Building2,
  Archive, Loader2, LayoutDashboard, Clock,
>>>>>>> 9b2a11fc6243168849ef3bdc80d020b09aa41860
} from 'lucide-react';
import { useArchive } from '../context/ArchiveContext';
import { dashboardApi, documentApi } from '../services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PageHeader, PageHeaderButton, SectionCard, StatCard, EmptyState } from './ui';

<<<<<<< HEAD
/** Raw SQL / schema-change log lines are noise for dashboard readers; they stay in the audit trail. */
const isSchemaNoise = (a: any) =>
  /\.(ddl|sql)$/i.test(a?.action ?? '') ||
  /^\s*(ALTER|CREATE|DROP|TRUNCATE|INSERT|UPDATE|DELETE|SELECT)\s/i.test(a?.details ?? '');
=======
interface DashboardDocument {
  id: string;
  archive_reference_number?: string;
  branch_name?: string;
  cabinet_number?: string;
  drawer_number?: string;
  claim_number?: string;
  policy_number?: string;
  insured_name?: string;
  physical_placement?: string;
  status?: string;
  created_at?: string;
}

interface DashboardActivity {
  id?: string;
  status?: string;
  document_title?: string;
  request_date?: string;
  requester_name?: string;
  archive_reference_number?: string;
}

interface DashboardStats {
  totalDocuments?: number;
  activeDocuments?: number;
  checkedOutDocuments?: number;
  pendingRequests?: number;
  overdueRequests?: number;
  myRequests?: number;
  myActiveRequests?: number;
  myOverdueRequests?: number;
  recentActivity?: DashboardActivity[];
  recentDocuments?: DashboardDocument[];
}
>>>>>>> 9b2a11fc6243168849ef3bdc80d020b09aa41860

export const OperationsDashboard: React.FC = () => {
  const { user } = useArchive();
  const [stats, setStats] = useState<any>({ recentActivity: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [claimDocuments, setClaimDocuments] = useState<DashboardDocument[]>([]);
  const [policyDocuments, setPolicyDocuments] = useState<DashboardDocument[]>([]);

  useEffect(() => {
    loadDashboard();
    if (user?.role === 'File Clerk') {
      loadDocumentsByType();
    }
  }, [user?.role]);

  const loadDashboard = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const response = await dashboardApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocumentsByType = async () => {
    try {
      const [claimResponse, policyResponse] = await Promise.all([
        documentApi.getDocuments({ type: 'Claim File', limit: 10 }),
        documentApi.getDocuments({ type: 'Policy', limit: 10 }),
      ]);
      setClaimDocuments(claimResponse.data.documents || []);
      setPolicyDocuments(policyResponse.data.documents || []);
    } catch (error) {
      console.error('Failed to load documents by type:', error);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadDashboard(true),
      user?.role === 'File Clerk' ? loadDocumentsByType() : Promise.resolve(),
    ]);
    setIsRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6" aria-busy>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
          <div className="space-y-2">
            <div className="h-6 w-56 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-4 w-80 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />)}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
      </div>
    );
  }

  // ==========================================
  // 1. ADMIN DASHBOARD UI
  // ==========================================
  if (user?.role === 'Admin') {
    const adminActivity = (stats.recentActivity ?? []).filter((a: any) => !isSchemaNoise(a)).slice(0, 8);
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="System Dashboard"
          subtitle="Monitor database health and system performance"
          icon={Server}
          actions={<PageHeaderButton icon={RefreshCw} onClick={refreshData} disabled={isRefreshing}>Refresh</PageHeaderButton>}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Documents" value={(stats.adminStats?.totalDocuments || 0).toLocaleString()} icon={FileText} color="blue" subtitle="Records in database" />
          <StatCard title="Active Users" value={(stats.adminStats?.totalUsers || 0).toLocaleString()} icon={Users} color="green" subtitle="Registered accounts" />
          <StatCard title="Database Size" value={stats.adminStats?.dbSize || '0 MB'} icon={HardDrive} color="purple" subtitle={`${stats.adminStats?.tableCount || 0} Tables`} />
          <StatCard title="Active Connections" value={stats.adminStats?.activeConnections || 0} icon={Activity} color="amber" subtitle="Live DB connections" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SectionCard title="System Health" icon={Database}>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Audit Logs</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{(stats.adminStats?.totalAuditLogs || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-950/50 rounded-lg flex items-center justify-center">
                    <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">Online</p>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <div className="lg:col-span-2">
            <SectionCard title="Recent System Activity" icon={History}>
              <div className="space-y-4">
                {adminActivity.length > 0 ? (
                  adminActivity.map((activity: any, i: number) => (
                    <div key={activity.id || i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{activity.action}</p>
                          <span className="text-xs text-slate-400">{activity.timestamp ? format(new Date(activity.timestamp), 'MMM dd, HH:mm') : ''}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{activity.user_name || 'System'} • {activity.details}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState icon={History} title="No recent activity" />
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. FILE CLERK DASHBOARD UI (Operations)
  // ==========================================
  if (user?.role === 'File Clerk') {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Operations Dashboard"
          subtitle="Overview of archive system operations and file requests"
          icon={LayoutDashboard}
          actions={<PageHeaderButton icon={RefreshCw} onClick={refreshData} disabled={isRefreshing}>Refresh</PageHeaderButton>}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Documents" value={(stats.operationalStats?.totalDocuments || 0).toLocaleString()} icon={FileText} color="blue" subtitle="All archived documents" />
          <StatCard title="Active Files" value={(stats.operationalStats?.activeDocuments || 0).toLocaleString()} icon={CheckCircle2} color="green" subtitle="Available for checkout" />
          <StatCard title="Checked Out" value={stats.operationalStats?.checkedOutDocuments || 0} icon={Clock} color="amber" subtitle="Currently borrowed" />
          <StatCard title="Pending Requests" value={stats.operationalStats?.pendingRequests || 0} icon={AlertCircle} color="purple" subtitle="Awaiting approval" />
        </div>

        {claimDocuments.length > 0 && (
          <SectionCard title="Recent Claim Files" icon={FileSearch}>
            <div className="space-y-3">
              {claimDocuments.map((doc) => <DocumentRow key={doc.id} document={doc} />)}
            </div>
          </SectionCard>
        )}

        {policyDocuments.length > 0 && (
          <SectionCard title="Recent Policy Documents" icon={FileText}>
            <div className="space-y-3">
              {policyDocuments.map((doc) => <DocumentRow key={doc.id} document={doc} />)}
            </div>
          </SectionCard>
        )}

        <SectionCard title="Recent Activity" icon={History}>
          <div className="space-y-4">
            {stats.recentActivity?.length > 0 ? (
              stats.recentActivity.slice(0, 5).map((activity: any, i: number) => (
                <div key={activity.id || i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'Approved' ? 'bg-green-500' :
                    activity.status === 'Pending' ? 'bg-amber-500' :
                    activity.status === 'Overdue' ? 'bg-red-500' : 'bg-slate-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{activity.document_title || 'Document'}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>{activity.request_date ? format(new Date(activity.request_date), 'MMM dd, yyyy') : ''}</span>
                      <span>•</span>
                      <span>{activity.status}</span>
                      {activity.requested_by_name && <><span>•</span><span>{activity.requested_by_name}</span></>}
                    </div>
                  </div>
                </div>
              ))
            ) : <EmptyState icon={History} title="No recent activity" />}
          </div>
        </SectionCard>
      </div>
    );
  }

  // ==========================================
  // 3. AGENT DASHBOARD UI (Personal Data Only)
  // ==========================================
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="My Dashboard"
        subtitle="Track your file requests and recent activity"
        icon={User}
        actions={<PageHeaderButton icon={RefreshCw} onClick={refreshData} disabled={isRefreshing}>Refresh</PageHeaderButton>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="My Requests" value={stats.agentStats?.myRequests || 0} icon={FileText} color="blue" subtitle="Total requests made" />
        <StatCard title="Active Checkouts" value={stats.agentStats?.myActiveRequests || 0} icon={CheckCircle2} color="green" subtitle="Files currently with you" />
        <StatCard title="Overdue" value={stats.agentStats?.myOverdueRequests || 0} icon={AlertCircle} color="red" subtitle="Need to return" />
      </div>

      <SectionCard title="My Recent Activity" icon={History}>
        <div className="space-y-4">
          {stats.recentActivity?.length > 0 ? (
            stats.recentActivity.map((activity: any, i: number) => (
              <div key={activity.id || i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'Approved' ? 'bg-green-500' :
                  activity.status === 'Pending' ? 'bg-amber-500' :
                  activity.status === 'Returned' ? 'bg-blue-500' :
                  activity.status === 'Rejected' ? 'bg-red-500' : 'bg-slate-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">
                    {activity.document_title || 'Document'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {activity.request_date ? format(new Date(activity.request_date), 'MMM dd, yyyy') : ''}
                    </span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span>{activity.status}</span>
                  </div>
                  {activity.archive_reference_number && (
                    <p className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-1">
                      Ref: {activity.archive_reference_number}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState icon={History} title="No recent activity" description="Your file requests will appear here." />
          )}
        </div>
      </SectionCard>
    </div>
  );
};

const DocumentRow: React.FC<{ document: DashboardDocument }> = ({ document }) => (
  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-900 dark:text-white truncate">
          {document.archive_reference_number || 'Untitled'}
        </p>
        <div className="flex items-center gap-4 mt-2 text-xs flex-wrap">
          {document.branch_name && (
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <Building2 className="w-3 h-3" /> Branch: {document.branch_name}
            </span>
          )}
          {document.cabinet_number && document.drawer_number && (
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <Archive className="w-3 h-3" /> Cabinet {document.cabinet_number} • Drawer {document.drawer_number}
            </span>
          )}
        </div>
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${
        document.status === 'Active' ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300'
        : document.status === 'Checked-out' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
        : 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
      }`}>{document.status}</span>
    </div>
  </div>
<<<<<<< HEAD
=======
);

const RecentActivity: React.FC<{ activities: DashboardActivity[]; title?: string }> = ({ activities, title = 'Recent Activity' }) => (
  <SectionCard title={title} icon={History}>
    <div className="space-y-4">
      {activities.length > 0 ? (
        activities.slice(0, 5).map((activity, i) => (
          <div key={activity.id || i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
            <div className={`w-2 h-2 rounded-full ${
              activity.status === 'Approved' ? 'bg-green-500'
              : activity.status === 'Pending' ? 'bg-amber-500'
              : activity.status === 'Overdue' ? 'bg-red-500'
              : activity.status === 'Returned' ? 'bg-blue-500'
              : 'bg-slate-400'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 dark:text-white truncate">{activity.document_title || 'Document'}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {activity.request_date ? format(new Date(activity.request_date), 'MMM dd, yyyy') : ''}
                </span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span className="flex items-center gap-1"><History className="w-3 h-3" />{activity.status}</span>
                {activity.requester_name && (
                  <>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{activity.requester_name}</span>
                  </>
                )}
              </div>
              {activity.archive_reference_number && (
                <p className="text-[10px] font-mono text-blue-600 mt-1">Ref: {activity.archive_reference_number}</p>
              )}
            </div>
          </div>
        ))
      ) : (
        <EmptyState icon={History} title="No recent activity" description="Activity will appear here as you use the system." />
      )}
    </div>
  </SectionCard>
>>>>>>> 9b2a11fc6243168849ef3bdc80d020b09aa41860
);