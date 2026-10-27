import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, PieChart, Download, ArrowUpRight, FileBarChart,
  Calendar, Loader2, RefreshCw, FileText, Trash2, CheckCircle, Clock,
  Users, Archive, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { reportsApi } from '../services/api';
import { useArchive } from '../context/ArchiveContext';
import {
  PageHeader, PageHeaderButton, StatCard, EmptyState, Modal,
} from './ui';

interface ReportStats {
  summary: { totalDocuments: number; totalRequests: number; totalUsers: number; activeBranches: number; activeDepartments: number };
  documents: { byType: { claims: number; policies: number; circulars: number; correspondence: number; billing: number }; byStatus: { active: number; checkedOut: number; settled: number } };
  requests: { byStatus: { pending: number; approved: number; returned: number; rejected: number; overdue: number } };
  users: { byRole: { admins: number; managers: number; agents: number; viewers: number } };
  trends: { ingestionRate: number; ingestionTrend: string; monthlyTrends: Array<{ month: string; year: number; count: number; claimCount: number; policyCount: number }> };
  storage: { used: string; total: string; percentage: number; details: string };
  generatedAt: string;
}

interface GeneratedReport {
  id: string; name: string; type: string; generated_at: string; format: string; size: string;
}

export const ReportsPage: React.FC = () => {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [period, setPeriod] = useState<'6months' | '1year' | 'all'>('6months');
  const [selectedReportType, setSelectedReportType] = useState<'Monthly Summary' | 'Claims Analysis' | 'Department Usage'>('Monthly Summary');
  const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'EXCEL' | 'CSV'>('PDF');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadDashboardData(); loadGeneratedReports(); }, [period]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await reportsApi.getStats({ period });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load report stats:', error);
      toast.error('Failed to load report data');
    } finally { setIsLoading(false); }
  };

  const loadGeneratedReports = async () => {
    try {
      const response = await reportsApi.getGeneratedReports();
      setGeneratedReports(response.data);
    } catch (error) { console.error('Failed to load generated reports:', error); }
  };

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      const response = await reportsApi.generateReport({ type: selectedReportType, format: selectedFormat });
      toast.success(<div><p className="font-bold">{selectedReportType} Generated</p><p className="text-xs">{response.data.report.name}</p></div>);
      await loadGeneratedReports();
      await loadDashboardData();
      setShowGenerateModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate report');
    } finally { setIsGenerating(false); }
  };

  const handleDownloadReport = async (reportId: string, reportName: string) => {
    try {
      toast.info(`Downloading ${reportName}...`);
      const response = await reportsApi.downloadReport(reportId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', reportName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) { toast.error('Failed to download report'); }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      setDeletingId(reportId);
      await reportsApi.deleteReport(reportId);
      toast.success('Report deleted successfully');
      await loadGeneratedReports();
    } catch (error) { toast.error('Failed to delete report'); } finally { setDeletingId(null); }
  };

  const getMaxTrendValue = () => {
    if (!stats?.trends?.monthlyTrends?.length) return 100;
    return Math.max(...stats.trends.monthlyTrends.map(t => t.count), 100);
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
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Analytics & Reports"
        subtitle="Real-time insights into archival metrics and system health"
        icon={BarChart3}
        actions={
          <>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm font-bold text-white backdrop-blur-sm"
            >
              <option value="6months" className="text-slate-900">Last 6 Months</option>
              <option value="1year" className="text-slate-900">Last Year</option>
              <option value="all" className="text-slate-900">All Time</option>
            </select>
            <PageHeaderButton icon={RefreshCw} onClick={loadDashboardData}>Refresh</PageHeaderButton>
            <PageHeaderButton icon={FileText} variant="solid" onClick={() => setShowGenerateModal(true)}>
              Generate Report
            </PageHeaderButton>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Documents" value={stats?.summary.totalDocuments.toLocaleString() || '0'}
          subtitle={`${stats?.documents.byType.claims || 0} Claims • ${stats?.documents.byType.policies || 0} Policies`}
          icon={Archive} color="blue" />
        <StatCard title="Active Files" value={stats?.documents.byStatus.active.toLocaleString() || '0'}
          subtitle={`${stats?.documents.byStatus.checkedOut || 0} Checked Out`} icon={CheckCircle} color="green" />
        <StatCard title="Pending Requests" value={stats?.requests.byStatus.pending.toLocaleString() || '0'}
          subtitle={`${stats?.requests.byStatus.overdue || 0} Overdue`} icon={Clock} color="amber" />
        <StatCard title="Storage Used" value={stats?.storage.used || '0 GB'}
          subtitle={stats?.storage.details || '0 GB / 5 GB'} icon={PieChart} color="purple"
          progress={stats?.storage.percentage} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Document Ingestion Trends" icon={TrendingUp}>
          {stats?.trends?.monthlyTrends && stats.trends.monthlyTrends.length > 0 ? (
            <>
              <div className="h-64 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-end justify-around p-6 gap-2">
                {stats.trends.monthlyTrends.map((item, i) => {
                  const height = (item.count / getMaxTrendValue()) * 100;
                  return (
                    <div key={i} className="w-full max-w-[40px] flex flex-col items-center group">
                      <div className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600 relative cursor-pointer"
                        style={{ height: `${Math.max(height, 5)}%` }}>
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {item.count} docs
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{item.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-4 text-xs text-slate-400">
                <span>Ingestion Rate: {stats.trends.ingestionRate} docs/month</span>
                <span className={stats.trends.ingestionTrend.includes('+') ? 'text-green-600' : 'text-red-600'}>{stats.trends.ingestionTrend}</span>
              </div>
            </>
          ) : (
            <EmptyState icon={TrendingUp} title="No trend data available" description="Trends will appear once documents are ingested." />
          )}
        </SectionCard>

        <SectionCard title="System Overview" icon={Users}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Users</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{stats?.summary.totalUsers || 0}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Admins: {stats?.users.byRole.admins || 0}</p>
                <p className="text-xs text-slate-400">Agents: {stats?.users.byRole.agents || 0}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-950/50 rounded-lg flex items-center justify-center">
                  <Archive className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Active Branches</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{stats?.summary.activeBranches || 0}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Departments: {stats?.summary.activeDepartments || 0}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950/50 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Request Breakdown</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{stats?.summary.totalRequests || 0}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-600">Approved: {stats?.requests.byStatus.approved || 0}</p>
                <p className="text-xs text-amber-600">Pending: {stats?.requests.byStatus.pending || 0}</p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Generated Reports" icon={FileBarChart}
        actions={<span className="text-sm text-slate-400">{generatedReports.length} reports</span>}>
        {generatedReports.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {generatedReports.map((report) => {
                const Icon = getReportTypeIcon(report.type);
                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group gap-3"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{report.name}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                          <span>{report.type}</span><span>•</span>
                          <span className="uppercase">{report.format}</span><span>•</span>
                          <span>{report.size}</span><span>•</span>
                          <span>{format(new Date(report.generated_at), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleDownloadReport(report.id, report.name)}
                        className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-blue-600" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteReport(report.id)} disabled={deletingId === report.id}
                        className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-red-600" title="Delete">
                        {deletingId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState icon={FileBarChart} title="No reports generated yet"
            description="Click 'Generate Report' to create your first report"
            action={
              <button onClick={() => setShowGenerateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
                Generate Report
              </button>
            } />
        )}
      </SectionCard>

      <Modal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Report"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowGenerateModal(false)} disabled={isGenerating}
              className="px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button onClick={handleGenerateReport} disabled={isGenerating}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : 'Generate'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Report Type</label>
            <div className="grid grid-cols-1 gap-2">
              {(['Monthly Summary', 'Claims Analysis', 'Department Usage'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedReportType(type)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedReportType === type ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-200'
                  }`}
                >
                  <p className="font-bold text-slate-900 dark:text-white">{type}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {type === 'Monthly Summary' && 'Overview of all documents and requests'}
                    {type === 'Claims Analysis' && 'Detailed analysis of claim files'}
                    {type === 'Department Usage' && 'Request patterns by department'}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(['PDF', 'EXCEL', 'CSV'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    selectedFormat === format ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-200'
                  }`}
                >
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{format}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReportsPage;