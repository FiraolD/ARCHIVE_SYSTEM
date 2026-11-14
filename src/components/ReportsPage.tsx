import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Archive, ArrowDownToLine, BarChart3, Building2, CalendarDays,
  CheckCircle2, Clock3, FileBarChart, FileText, HardDrive, Loader2, PieChart,
  RefreshCw, ShieldCheck, Trash2, TrendingUp, Users,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart as RechartsPieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { reportsApi } from '../services/api';
import { Modal, PageHeader, PageHeaderButton, SectionCard, EmptyState } from './ui';

type Preset = '7days' | '30days' | '90days' | '6months' | '1year' | 'all' | 'custom';
type ReportType = 'Monthly Summary' | 'Claims Analysis' | 'Department Usage';
type ExportFormat = 'PDF' | 'EXCEL' | 'CSV';

interface ReportStats {
  range: { startDate: string | null; endDate: string | null; period: string };
  summary: {
    totalDocuments: number; totalRequests: number; totalUsers: number;
    activeBranches: number; activeDepartments: number;
    requestFulfillmentRate: number; averageReturnDays: number;
  };
  documents: {
    byType: { claims: number; policies: number; circulars: number; correspondence: number; billing: number };
    byStatus: { active: number; checkedOut: number; settled: number; returned: number };
  };
  requests: {
    byStatus: { pending: number; approved: number; returnPending: number; returned: number; rejected: number; overdue: number };
  };
  users: { byRole: { admins: number; fileClerks: number; agents: number; viewers: number } };
  trends: { monthlyTrends: Array<{ month: string; year: number; count: number; claimCount: number; policyCount: number }> };
  breakdowns: {
    branches: Array<{ name: string; count: number }>;
    departments: Array<{ name: string; count: number }>;
  };
  recentActivity: Array<{ id: string; description: string; category: string; occurred_at: string }>;
  storage: { used: string; total: string; percentage: number; details: string };
  generatedAt: string;
}

interface GeneratedReport {
  id: string; name: string; type: string; generated_at: string; format: string; size: string;
}

const PRESETS: Array<{ value: Preset; label: string }> = [
  { value: '7days', label: '7 days' },
  { value: '30days', label: '30 days' },
  { value: '90days', label: '90 days' },
  { value: '6months', label: '6 months' },
  { value: '1year', label: '1 year' },
  { value: 'all', label: 'All time' },
];
const CHART_COLORS = ['#2563eb', '#8b5cf6', '#14b8a6', '#f59e0b', '#f43f5e'];
const numberFormat = new Intl.NumberFormat('en-US');
const today = () => new Date().toLocaleDateString('en-CA');

export const ReportsPage: React.FC = () => {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preset, setPreset] = useState<Preset>('6months');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState(today);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('Monthly Summary');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('PDF');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const dateParams = useMemo(() => (
    preset === 'custom'
      ? { startDate: customStart, endDate: customEnd }
      : { period: preset }
  ), [preset, customStart, customEnd]);

  const loadDashboardData = useCallback(async () => {
    if (preset === 'custom' && (!customStart || !customEnd || customStart > customEnd)) return;
    try {
      setIsLoading(true);
      const response = await reportsApi.getStats(dateParams);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load report stats:', error);
      toast.error('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  }, [dateParams, preset, customStart, customEnd]);

  const loadGeneratedReports = useCallback(async () => {
    try {
      const response = await reportsApi.getGeneratedReports();
      setGeneratedReports(response.data);
    } catch (error) {
      console.error('Failed to load generated reports:', error);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    void loadGeneratedReports();
  }, [loadGeneratedReports]);

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      const response = await reportsApi.generateReport({
        type: selectedReportType,
        format: selectedFormat,
      });
      toast.success(`${selectedReportType} generated: ${response.data.report.name}`);
      await loadGeneratedReports();
      setShowGenerateModal(false);
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId: string, reportName: string) => {
    try {
      const response = await reportsApi.downloadReport(reportId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = reportName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      setDeletingId(reportId);
      await reportsApi.deleteReport(reportId);
      toast.success('Report deleted');
      await loadGeneratedReports();
    } catch (error) {
      toast.error('Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  };

  const typeData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Claims', value: stats.documents.byType.claims },
      { name: 'Policies', value: stats.documents.byType.policies },
      { name: 'Circulars', value: stats.documents.byType.circulars },
      { name: 'Correspondence', value: stats.documents.byType.correspondence },
      { name: 'Billing', value: stats.documents.byType.billing },
    ].filter(item => item.value > 0);
  }, [stats]);

  const rangeLabel = preset === 'custom'
    ? `${customStart || 'Start date'} – ${customEnd || 'End date'}`
    : PRESETS.find(item => item.value === preset)?.label ?? '6 months';

  if (isLoading && !stats) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Analytics & Reports"
        subtitle="A clear view of archive activity, document growth, service demand, and storage."
        icon={BarChart3}
        actions={
          <>
            <PageHeaderButton icon={RefreshCw} onClick={() => void loadDashboardData()} disabled={isLoading}>Refresh</PageHeaderButton>
            <PageHeaderButton icon={FileText} variant="solid" onClick={() => setShowGenerateModal(true)}>Generate Report</PageHeaderButton>
          </>
        }
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Report period</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Metrics and trends for {rangeLabel}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map(option => (
              <button
                key={option.value}
                onClick={() => setPreset(option.value)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  preset === option.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
            <button
              onClick={() => setPreset('custom')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                preset === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Custom
            </button>
          </div>
        </div>
        {preset === 'custom' && (
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              From
              <input type="date" value={customStart} max={customEnd || today()} onChange={event => setCustomStart(event.target.value)}
                className="mt-1 block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </label>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              To
              <input type="date" value={customEnd} min={customStart} max={today()} onChange={event => setCustomEnd(event.target.value)}
                className="mt-1 block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </label>
            {(!customStart || !customEnd || customStart > customEnd) && (
              <span className="pb-2 text-sm text-rose-600">Choose a valid start and end date.</span>
            )}
          </div>
        )}
      </section>

      {isLoading && stats && <p className="text-sm text-slate-500">Updating report metrics…</p>}
      {stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Documents added" value={stats.summary.totalDocuments} subtitle={`${stats.documents.byType.claims.toLocaleString()} claim files`} icon={Archive} color="blue" />
            <MetricCard title="File requests" value={stats.summary.totalRequests} subtitle={`${stats.requests.byStatus.pending.toLocaleString()} awaiting action`} icon={FileText} color="violet" />
            <MetricCard title="Fulfillment rate" value={`${stats.summary.requestFulfillmentRate}%`} subtitle={`${stats.requests.byStatus.returned.toLocaleString()} returned in period`} icon={ShieldCheck} color="green" />
            <MetricCard title="Storage in use" value={stats.storage.used} subtitle={stats.storage.details} icon={HardDrive} color="amber" progress={stats.storage.percentage} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <SectionCard title="Document growth" icon={TrendingUp}>
              {stats.trends.monthlyTrends.length ? (
                <div className="h-[300px] w-full pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.trends.monthlyTrends} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tickFormatter={(month, index) => `${month} '${String(stats.trends.monthlyTrends[index]?.year ?? '').slice(-2)}`} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip labelFormatter={(label, payload) => payload?.[0]?.payload?.year ? `${label} ${payload[0].payload.year}` : label} />
                      <Line type="monotone" dataKey="count" name="Documents" stroke="#2563eb" strokeWidth={3} dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="claimCount" name="Claims" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState icon={TrendingUp} title="No documents in this range" description="Try a wider date range to see ingestion trends." />}
            </SectionCard>

            <SectionCard title="Document mix" icon={PieChart}>
              {typeData.length ? (
                <div className="grid h-[300px] grid-cols-1 items-center sm:grid-cols-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={typeData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={100} paddingAngle={3}>
                        {typeData.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => numberFormat.format(Number(value))} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {typeData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                          {item.name}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">{numberFormat.format(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <EmptyState icon={PieChart} title="No document mix yet" description="Document type breakdown will appear here." />}
            </SectionCard>

            <SectionCard title="Request status" icon={Activity}>
              <div className="space-y-4 py-2">
                <RequestStatus label="Approved" value={stats.requests.byStatus.approved} total={stats.summary.totalRequests} color="bg-emerald-500" />
                <RequestStatus label="Pending" value={stats.requests.byStatus.pending} total={stats.summary.totalRequests} color="bg-amber-500" />
                <RequestStatus label="Return pending" value={stats.requests.byStatus.returnPending} total={stats.summary.totalRequests} color="bg-sky-500" />
                <RequestStatus label="Returned" value={stats.requests.byStatus.returned} total={stats.summary.totalRequests} color="bg-blue-500" />
                <RequestStatus label="Rejected" value={stats.requests.byStatus.rejected} total={stats.summary.totalRequests} color="bg-rose-500" />
                <RequestStatus label="Overdue" value={stats.requests.byStatus.overdue} total={stats.summary.totalRequests} color="bg-violet-500" />
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <MiniMetric label="Avg. return time" value={`${stats.summary.averageReturnDays} days`} icon={Clock3} />
                  <MiniMetric label="In this period" value={numberFormat.format(stats.summary.totalRequests)} icon={FileBarChart} />
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <RankedBreakdown title="Documents by branch" icon={Building2} rows={stats.breakdowns.branches} color="#2563eb" />
            <RankedBreakdown title="Documents by department" icon={Users} rows={stats.breakdowns.departments} color="#8b5cf6" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <SectionCard title="Archive snapshot" icon={CheckCircle2}>
              <div className="space-y-4">
                <SnapshotLine label="Active files" value={stats.documents.byStatus.active} color="text-emerald-600" />
                <SnapshotLine label="Checked out" value={stats.documents.byStatus.checkedOut} color="text-amber-600" />
                <SnapshotLine label="Settled claims" value={stats.documents.byStatus.settled} color="text-blue-600" />
                <SnapshotLine label="Returned" value={stats.documents.byStatus.returned} color="text-violet-600" />
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <MiniMetric label="Users" value={numberFormat.format(stats.summary.totalUsers)} icon={Users} />
                  <MiniMetric label="Branches" value={numberFormat.format(stats.summary.activeBranches)} icon={Building2} />
                  <MiniMetric label="Departments" value={numberFormat.format(stats.summary.activeDepartments)} icon={Archive} />
                </div>
                <p className="text-xs text-slate-400">Status and organization counts are current snapshots. Storage reflects all archived documents.</p>
              </div>
            </SectionCard>
            <SectionCard title="Recent activity" icon={Activity}>
              {stats.recentActivity.length ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stats.recentActivity.map(item => (
                    <div key={`${item.category}-${item.id}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.category.startsWith('Request') ? 'bg-violet-500' : 'bg-blue-500'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{item.description}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.category}</p>
                      </div>
                      <time className="shrink-0 text-xs text-slate-400">{format(new Date(item.occurred_at), 'MMM d')}</time>
                    </div>
                  ))}
                </div>
              ) : <EmptyState icon={Activity} title="No activity in this range" description="Recent documents and file requests will appear here." />}
            </SectionCard>
            <SectionCard title="Monthly document breakdown" icon={BarChart3}>
              {stats.trends.monthlyTrends.length ? (
                <div className="h-[280px] w-full pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.trends.monthlyTrends} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="claimCount" name="Claims" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="policyCount" name="Policies" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState icon={BarChart3} title="No monthly breakdown" description="Choose a period with document activity." />}
            </SectionCard>
          </div>
        </>
      )}

      <SectionCard title="Generated reports" icon={FileBarChart}
        actions={<span className="text-sm text-slate-400">{generatedReports.length} saved</span>}>
        {generatedReports.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {generatedReports.map(report => (
              <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"><FileText className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{report.name}</p>
                    <p className="text-xs text-slate-500">{report.type} · {report.format} · {report.size} · {format(new Date(report.generated_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => void handleDownloadReport(report.id, report.name)} aria-label={`Download ${report.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"><ArrowDownToLine className="h-4 w-4" /></button>
                  <button onClick={() => void handleDeleteReport(report.id)} disabled={deletingId === report.id} aria-label={`Delete ${report.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-800">
                    {deletingId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={FileBarChart} title="No reports generated" description="Create an export to keep a shareable copy of your archive insights." />}
      </SectionCard>

      <Modal open={showGenerateModal} onClose={() => setShowGenerateModal(false)} title="Generate report" size="sm"
        footer={
          <>
            <button onClick={() => setShowGenerateModal(false)} disabled={isGenerating} className="rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
            <button onClick={() => void handleGenerateReport()} disabled={isGenerating} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-50">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Generate
            </button>
          </>
        }>
        <div className="space-y-5">
          <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
            Dashboard insights are filtered to {rangeLabel}. Generated exports use the selected report type’s standard detail.
          </p>
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">Report type</label>
            <select value={selectedReportType} onChange={event => setSelectedReportType(event.target.value as ReportType)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <option>Monthly Summary</option><option>Claims Analysis</option><option>Department Usage</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">Export format</label>
            <div className="grid grid-cols-3 gap-2">
              {(['PDF', 'EXCEL', 'CSV'] as const).map(fileFormat => (
                <button key={fileFormat} onClick={() => setSelectedFormat(fileFormat)} className={`rounded-xl border-2 p-3 text-sm font-bold ${selectedFormat === fileFormat ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200' : 'border-slate-200 dark:border-slate-700 dark:text-slate-300'}`}>{fileFormat}</button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const MetricCard: React.FC<{
  title: string; value: string | number; subtitle: string; icon: typeof Archive;
  color: 'blue' | 'violet' | 'green' | 'amber'; progress?: number;
}> = ({ title, value, subtitle, icon: Icon, color, progress }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{typeof value === 'number' ? numberFormat.format(value) : value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[color]}`}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      {progress !== undefined && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div>}
    </div>
  );
};

const RequestStatus: React.FC<{ label: string; value: number; total: number; color: string }> = ({ label, value, total, color }) => (
  <div>
    <div className="mb-1.5 flex justify-between text-sm">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="font-bold text-slate-900 dark:text-white">{numberFormat.format(value)}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${total ? Math.min(100, value / total * 100) : 0}%` }} />
    </div>
  </div>
);

const MiniMetric: React.FC<{ label: string; value: string; icon: typeof Archive }> = ({ label, value, icon: Icon }) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Icon className="h-3.5 w-3.5 shrink-0" />{label}</div>
    <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">{value}</p>
  </div>
);

const SnapshotLine: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center justify-between"><span className="text-sm text-slate-600 dark:text-slate-300">{label}</span><span className={`font-bold ${color}`}>{numberFormat.format(value)}</span></div>
);

const RankedBreakdown: React.FC<{
  title: string; icon: typeof Archive; rows: Array<{ name: string; count: number }>; color: string;
}> = ({ title, icon: Icon, rows, color }) => {
  const maximum = Math.max(1, ...rows.map(row => row.count));
  return (
    <SectionCard title={title} icon={Icon}>
      {rows.length ? (
        <div className="space-y-4">
          {rows.map(row => (
            <div key={row.name}>
              <div className="mb-1.5 flex justify-between gap-3 text-sm">
                <span className="truncate text-slate-600 dark:text-slate-300">{row.name}</span>
                <span className="font-bold text-slate-900 dark:text-white">{numberFormat.format(row.count)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full" style={{ width: `${Math.max(2, row.count / maximum * 100)}%`, backgroundColor: color }} />
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyState icon={Icon} title="No breakdown available" description="No documents were recorded for these groups in this period." />}
    </SectionCard>
  );
};

export default ReportsPage;
