import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Download, 
  Filter,
  ArrowUpRight,
  FileBarChart,
  Calendar,
  Loader2,
  RefreshCw,
  FileText,
  Trash2,
  CheckCircle,
  Clock,
  Users,
  Archive,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { reportsApi } from '../services/api';
import { useArchive } from '../context/ArchiveContext';

interface ReportStats {
  summary: {
    totalDocuments: number;
    totalRequests: number;
    totalUsers: number;
    activeBranches: number;
    activeDepartments: number;
  };
  documents: {
    byType: {
      claims: number;
      policies: number;
      circulars: number;
      correspondence: number;
      billing: number;
    };
    byStatus: {
      active: number;
      checkedOut: number;
      settled: number;
    };
  };
  requests: {
    byStatus: {
      pending: number;
      approved: number;
      returned: number;
      rejected: number;
      overdue: number;
    };
  };
  users: {
    byRole: {
      admins: number;
      managers: number;
      agents: number;
      viewers: number;
    };
  };
  trends: {
    ingestionRate: number;
    ingestionTrend: string;
    monthlyTrends: Array<{
      month: string;
      year: number;
      count: number;
      claimCount: number;
      policyCount: number;
    }>;
  };
  storage: {
    used: string;
    total: string;
    percentage: number;
    details: string;
  };
  recentReports: Array<{
    id: string;
    name: string;
    type: string;
    generated_at: string;
    format: string;
    size: string;
  }>;
  generatedAt: string;
}

interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  generated_at: string;
  format: string;
  size: string;
}

export const ReportsPage: React.FC = () => {
  const { user } = useArchive();
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [period, setPeriod] = useState<'6months' | '1year' | 'all'>('6months');
  const [selectedReportType, setSelectedReportType] = useState<'Monthly Summary' | 'Claims Analysis' | 'Department Usage'>('Monthly Summary');
  const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'EXCEL' | 'CSV'>('PDF');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    loadGeneratedReports();
  }, [period]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await reportsApi.getStats({ period });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load report stats:', error);
      toast.error('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGeneratedReports = async () => {
    try {
      const response = await reportsApi.getGeneratedReports();
      setGeneratedReports(response.data);
    } catch (error) {
      console.error('Failed to load generated reports:', error);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      const response = await reportsApi.generateReport({
        type: selectedReportType,
        format: selectedFormat
      });
      
      toast.success(
        <div>
          <p className="font-bold">{selectedReportType} Generated</p>
          <p className="text-xs">{response.data.report.name}</p>
        </div>
      );
      
      // Refresh the lists
      await loadGeneratedReports();
      await loadDashboardData();
      setShowGenerateModal(false);
    } catch (error: any) {
      console.error('Generate error:', error);
      toast.error(error.response?.data?.error || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId: string, reportName: string) => {
    try {
      toast.info(`Downloading ${reportName}...`);
      
      const response = await reportsApi.downloadReport(reportId);
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', reportName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    try {
      setDeletingId(reportId);
      await reportsApi.deleteReport(reportId);
      toast.success('Report deleted successfully');
      await loadGeneratedReports();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  };

  const getMaxTrendValue = () => {
    if (!stats?.trends?.monthlyTrends?.length) return 100;
    return Math.max(...stats.trends.monthlyTrends.map(t => t.count), 100);
  };

  const formatFileSize = (size: string) => {
    return size;
  };

  const getReportTypeIcon = (type: string) => {
    switch(type) {
      case 'Monthly Summary': return Calendar;
      case 'Claims Analysis': return AlertCircle;
      case 'Department Usage': return Users;
      default: return FileBarChart;
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900	dark:text-white dark:text-white">Analytics & Reports</h2>
          <p className="text-slate-500 font-medium">
            Real-time insights into archival metrics and system health.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
          >
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={loadDashboardData}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            <FileText className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Documents"
          value={stats?.summary.totalDocuments.toLocaleString() || '0'}
          subtitle={`${stats?.documents.byType.claims || 0} Claims • ${stats?.documents.byType.policies || 0} Policies`}
          icon={Archive}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Files"
          value={stats?.documents.byStatus.active.toLocaleString() || '0'}
          subtitle={`${stats?.documents.byStatus.checkedOut || 0} Checked Out`}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatCard
          title="Pending Requests"
          value={stats?.requests.byStatus.pending.toLocaleString() || '0'}
          subtitle={`${stats?.requests.byStatus.overdue || 0} Overdue`}
          icon={Clock}
          color="bg-amber-500"
        />
        <StatCard
          title="Storage Used"
          value={stats?.storage.used || '0 GB'}
          subtitle={stats?.storage.details || '0 GB / 5 GB'}
          icon={PieChart}
          color="bg-purple-500"
          progress={stats?.storage.percentage}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Trends Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900">Document Ingestion Trends</h3>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" />
              <span>Last {period === '6months' ? '6 Months' : period === '1year' ? '12 Months' : 'All Time'}</span>
            </div>
          </div>
          
          {stats?.trends?.monthlyTrends && stats.trends.monthlyTrends.length > 0 ? (
            <>
              <div className="h-64 bg-slate-50 rounded-2xl flex items-end justify-around p-6 gap-2">
                {stats.trends.monthlyTrends.map((item, i) => {
                  const height = (item.count / getMaxTrendValue()) * 100;
                  return (
                    <div key={i} className="w-full max-w-[40px] flex flex-col items-center group">
                      <div 
                        className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600 relative cursor-pointer"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {item.count} docs
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-4 text-xs text-slate-400">
                <span>Ingestion Rate: {stats.trends.ingestionRate} docs/month</span>
                <span className={stats.trends.ingestionTrend.includes('+') ? 'text-green-600' : 'text-red-600'}>
                  {stats.trends.ingestionTrend}
                </span>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No trend data available
            </div>
          )}
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm"
        >
          <h3 className="text-xl font-black text-slate-900 mb-6">System Overview</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Users</p>
                  <p className="text-xl font-black text-slate-900">{stats?.summary.totalUsers || 0}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Admins: {stats?.users.byRole.admins || 0}</p>
                <p className="text-xs text-slate-400">Agents: {stats?.users.byRole.agents || 0}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Archive className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Active Branches</p>
                  <p className="text-xl font-black text-slate-900">{stats?.summary.activeBranches || 0}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Departments: {stats?.summary.activeDepartments || 0}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Request Breakdown</p>
                  <p className="text-xl font-black text-slate-900">{stats?.summary.totalRequests || 0}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-600">Approved: {stats?.requests.byStatus.approved || 0}</p>
                <p className="text-xs text-amber-600">Pending: {stats?.requests.byStatus.pending || 0}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Generated Reports Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-900">Generated Reports</h3>
          <span className="text-sm text-slate-400">{generatedReports.length} reports</span>
        </div>

        {generatedReports.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {generatedReports.map((report) => {
                const Icon = getReportTypeIcon(report.type);
                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{report.name}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{report.type}</span>
                          <span>•</span>
                          <span className="uppercase">{report.format}</span>
                          <span>•</span>
                          <span>{report.size}</span>
                          <span>•</span>
                          <span>{format(new Date(report.generated_at), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadReport(report.id, report.name)}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-blue-600"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        disabled={deletingId === report.id}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-red-600"
                        title="Delete"
                      >
                        {deletingId === report.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <FileBarChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No reports generated yet</p>
            <p className="text-sm mt-1">Click "Generate Report" to create your first report</p>
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <GenerateReportModal
            selectedType={selectedReportType}
            setSelectedType={setSelectedReportType}
            selectedFormat={selectedFormat}
            setSelectedFormat={setSelectedFormat}
            onGenerate={handleGenerateReport}
            onClose={() => setShowGenerateModal(false)}
            isGenerating={isGenerating}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  color: string;
  progress?: number;
}> = ({ title, value, subtitle, icon: Icon, color, progress }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 ${color} rounded-2xl text-white shadow-lg`}>
        <Icon className="w-6 h-6" />
      </div>
      {progress !== undefined && (
        <span className="text-xs font-bold text-slate-400">
          {progress.toFixed(1)}%
        </span>
      )}
    </div>
    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{title}</p>
    <h4 className="text-3xl font-black text-slate-900 mt-1">{value}</h4>
    <p className="text-xs font-medium text-slate-400 mt-2">{subtitle}</p>
    
    {progress !== undefined && (
      <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-purple-600 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    )}
  </motion.div>
);

// Generate Report Modal
const GenerateReportModal: React.FC<{
  selectedType: 'Monthly Summary' | 'Claims Analysis' | 'Department Usage';
  setSelectedType: (type: any) => void;
  selectedFormat: 'PDF' | 'EXCEL' | 'CSV';
  setSelectedFormat: (format: any) => void;
  onGenerate: () => void;
  onClose: () => void;
  isGenerating: boolean;
}> = ({
  selectedType,
  setSelectedType,
  selectedFormat,
  setSelectedFormat,
  onGenerate,
  onClose,
  isGenerating
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      className="bg-white rounded-3xl max-w-md w-full p-8"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-2xl font-black text-slate-900 mb-6">Generate Report</h3>

      <div className="space-y-6">
        {/* Report Type */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
            Report Type
          </label>
          <div className="grid grid-cols-1 gap-2">
            {(['Monthly Summary', 'Claims Analysis', 'Department Usage'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedType === type
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-200'
                }`}
              >
                <p className="font-bold text-slate-900">{type}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {type === 'Monthly Summary' && 'Overview of all documents and requests'}
                  {type === 'Claims Analysis' && 'Detailed analysis of claim files'}
                  {type === 'Department Usage' && 'Request patterns by department'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Format Selection */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
            Export Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['PDF', 'EXCEL', 'CSV'] as const).map((format) => (
              <button
                key={format}
                onClick={() => setSelectedFormat(format)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  selectedFormat === format
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-200'
                }`}
              >
                <p className="font-bold text-slate-900 text-sm">{format}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="flex-1 py-4 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

export default ReportsPage;