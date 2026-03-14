import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  User,
  Calendar,
  History,
  TrendingUp,
  Download,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useArchive } from '../context/ArchiveContext';
import { dashboardApi } from '../services/api';
import { toast } from 'sonner';

interface DashboardStats {
  totalDocuments?: number;
  activeDocuments?: number;
  checkedOutDocuments?: number;
  pendingRequests?: number;
  overdueRequests?: number;
  myRequests?: number;
  myActiveRequests?: number;
  myOverdueRequests?: number;
  recentActivity: any[];
  recentDocuments?: any[];
}

export const OperationsDashboard: React.FC = () => {
  const { user } = useArchive();
  const [stats, setStats] = useState<DashboardStats>({ recentActivity: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      const response = await dashboardApi.getStats();
      console.log('Dashboard data:', response.data);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await loadDashboard();
    setIsRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Admin Dashboard
  if (user?.role === 'Admin') {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Admin Dashboard</h2>
            <p className="text-slate-500 font-medium mt-1">
              Overview of archive system statistics
            </p>
          </div>
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Documents"
            value={stats.totalDocuments || 0}
            icon={FileText}
            color="bg-blue-500"
            subtitle="All archived documents"
          />
          <StatCard
            title="Active Files"
            value={stats.activeDocuments || 0}
            icon={CheckCircle2}
            color="bg-green-500"
            subtitle="Available for checkout"
          />
          <StatCard
            title="Checked Out"
            value={stats.checkedOutDocuments || 0}
            icon={Clock}
            color="bg-amber-500"
            subtitle="Currently borrowed"
          />
          <StatCard
            title="Pending Requests"
            value={stats.pendingRequests || 0}
            icon={AlertCircle}
            color="bg-purple-500"
            subtitle="Awaiting approval"
          />
        </div>

        {/* Recent Documents */}
        {stats.recentDocuments && stats.recentDocuments.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Recently Added Documents</h3>
            <div className="space-y-4">
              {stats.recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-slate-900">{doc.title}</p>
                      <p className="text-xs text-slate-500 font-mono">{doc.archive_reference_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      doc.status === 'Active' ? 'bg-green-100 text-green-700' :
                      doc.status === 'Checked-out' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {doc.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <RecentActivity activities={stats.recentActivity || []} />
      </div>
    );
  }

  // User Dashboard
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900">My Dashboard</h2>
          <p className="text-slate-500 font-medium mt-1">
            Track your file requests and activity
          </p>
        </div>
        <button
          onClick={refreshData}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="My Requests"
          value={stats.myRequests || 0}
          icon={FileText}
          color="bg-blue-500"
          subtitle="Total requests made"
        />
        <StatCard
          title="Active Checkouts"
          value={stats.myActiveRequests || 0}
          icon={CheckCircle2}
          color="bg-green-500"
          subtitle="Files currently with you"
        />
        <StatCard
          title="Overdue"
          value={stats.myOverdueRequests || 0}
          icon={AlertCircle}
          color="bg-red-500"
          subtitle="Need to return"
        />
      </div>

      <RecentActivity activities={stats.recentActivity || []} title="My Recent Activity" />
    </div>
  );
};

const StatCard: React.FC<{ 
  title: string; 
  value: number; 
  icon: any; 
  color: string;
  subtitle?: string;
}> = ({ title, value, icon: Icon, color, subtitle }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
  >
    <div className="flex items-start justify-between">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-3xl font-black text-slate-900">{value}</span>
    </div>
    <p className="text-sm font-bold text-slate-700 mt-4">{title}</p>
    {subtitle && (
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    )}
  </motion.div>
);

const RecentActivity: React.FC<{ activities: any[]; title?: string }> = ({ 
  activities, 
  title = "Recent Activity" 
}) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-6">
    <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
    <div className="space-y-4">
      {activities.length > 0 ? (
        activities.map((activity, i) => (
          <div key={activity.id || i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div className={`w-2 h-2 rounded-full ${
              activity.status === 'Approved' ? 'bg-green-500' :
              activity.status === 'Pending' ? 'bg-amber-500' :
              activity.status === 'Overdue' ? 'bg-red-500' :
              activity.status === 'Returned' ? 'bg-blue-500' :
              'bg-slate-400'
            }`} />
            <div className="flex-1">
              <p className="font-medium text-slate-900">{activity.document_title || 'Document'}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(activity.request_date || activity.created_at).toLocaleDateString()}
                </span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span className="flex items-center gap-1">
                  <History className="w-3 h-3" />
                  {activity.status}
                </span>
                {activity.requested_by_name && (
                  <>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {activity.requested_by_name}
                    </span>
                  </>
                )}
              </div>
              {activity.archive_reference_number && (
                <p className="text-[10px] font-mono text-blue-600 mt-1">
                  Ref: {activity.archive_reference_number}
                </p>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-400 font-medium">No recent activity</p>
          <p className="text-xs text-slate-300 mt-1">Activity will appear here as you use the system</p>
        </div>
      )}
    </div>
  </div>
);