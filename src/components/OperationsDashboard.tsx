import React, { useEffect, useState } from 'react';
import {
  FileText, AlertCircle, CheckCircle2, User, Calendar,
  History, RefreshCw, Hash, FileSearch, MapPin, Building2,
  Archive, Loader2, LayoutDashboard,
} from 'lucide-react';
import { useArchive } from '../context/ArchiveContext';
import { dashboardApi, documentApi } from '../services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PageHeader, PageHeaderButton, SectionCard, StatCard, EmptyState } from './ui';

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

export const OperationsDashboard: React.FC = () => {
  const { user } = useArchive();
  const [stats, setStats] = useState<DashboardStats>({ recentActivity: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [claimDocuments, setClaimDocuments] = useState<DashboardDocument[]>([]);
  const [policyDocuments, setPolicyDocuments] = useState<DashboardDocument[]>([]);

  useEffect(() => { loadDashboard(); loadDocumentsByType(); }, []);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
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
      const claimResponse = await documentApi.getDocuments({ type: 'Claim File', limit: 10 });
      setClaimDocuments(claimResponse.data.documents || []);
      const policyResponse = await documentApi.getDocuments({ type: 'Policy', limit: 10 });
      setPolicyDocuments(policyResponse.data.documents || []);
    } catch (error) {
      console.error('Failed to load documents by type:', error);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await Promise.all([loadDashboard(), loadDocumentsByType()]);
    setIsRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (user?.role === 'Admin') {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Admin Dashboard"
          subtitle="Overview of archive system statistics"
          icon={LayoutDashboard}
          actions={<PageHeaderButton icon={RefreshCw} onClick={refreshData} disabled={isRefreshing}>Refresh</PageHeaderButton>}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Documents" value={stats.totalDocuments || 0} icon={FileText} color="blue" subtitle="All archived documents" />
          <StatCard title="Active Files" value={stats.activeDocuments || 0} icon={CheckCircle2} color="green" subtitle="Available for checkout" />
          <StatCard title="Checked Out" value={stats.checkedOutDocuments || 0} icon={Clock} color="amber" subtitle="Currently borrowed" />
          <StatCard title="Pending Requests" value={stats.pendingRequests || 0} icon={AlertCircle} color="purple" subtitle="Awaiting approval" />
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

        {stats.recentDocuments && stats.recentDocuments.length > 0 && (
          <SectionCard title="Recently Added Documents" icon={FileText}>
            <div className="space-y-3">
              {stats.recentDocuments.slice(0, 5).map((doc) => <DocumentRow key={doc.id} document={doc} />)}
            </div>
          </SectionCard>
        )}

        <RecentActivity activities={stats.recentActivity || []} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="My Dashboard"
        subtitle="Track your file requests and activity"
        icon={User}
        actions={<PageHeaderButton icon={RefreshCw} onClick={refreshData} disabled={isRefreshing}>Refresh</PageHeaderButton>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="My Requests" value={stats.myRequests || 0} icon={FileText} color="blue" subtitle="Total requests made" />
        <StatCard title="Active Checkouts" value={stats.myActiveRequests || 0} icon={CheckCircle2} color="green" subtitle="Files currently with you" />
        <StatCard title="Overdue" value={stats.myOverdueRequests || 0} icon={AlertCircle} color="red" subtitle="Need to return" />
      </div>

      <RecentActivity activities={stats.recentActivity || []} title="My Recent Activity" />
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
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          {document.claim_number && (
            <span className="flex items-center gap-1 text-xs text-blue-600 font-mono">
              <Hash className="w-3 h-3" /> Claim: {document.claim_number}
            </span>
          )}
          {document.policy_number && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-mono">
              <FileText className="w-3 h-3" /> Policy: {document.policy_number}
            </span>
          )}
          {document.insured_name && (
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <User className="w-3 h-3" /> Insured: {document.insured_name}
            </span>
          )}
        </div>
        {!document.cabinet_number && document.physical_placement && (
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {document.physical_placement}
          </p>
        )}
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${
        document.status === 'Active' ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300'
        : document.status === 'Checked-out' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
        : 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
      }`}>{document.status}</span>
    </div>
    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
      <p className="text-[10px] font-mono text-slate-400">Ref: {document.archive_reference_number || 'N/A'}</p>
      <p className="text-[10px] text-slate-400">
        {document.created_at ? format(new Date(document.created_at), 'MMM dd, yyyy') : ''}
      </p>
    </div>
  </div>
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
);