import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Download, 
  Filter,
  ArrowUpRight,
  FileBarChart
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Analytics & Reports</h2>
          <p className="text-slate-500 font-medium">Insights into archival metrics and system health.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportCard title="Ingestion Rate" value="428" subtitle="+12% from last month" icon={TrendingUp} trend="up" />
        <ReportCard title="Active Claims" value="1,244" subtitle="Across all branches" icon={BarChart3} />
        <ReportCard title="Storage Used" value="84%" subtitle="2.1 TB / 2.5 TB" icon={PieChart} trend="down" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900">Archival Trends</h3>
            <select className="bg-slate-50 border-none rounded-lg text-sm font-bold px-3 py-1 text-slate-600">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-64 bg-slate-50 rounded-2xl flex items-end justify-around p-6 gap-2">
            {[40, 65, 45, 90, 55, 75].map((h, i) => (
              <div key={i} className="w-full max-w-[40px] bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600 group relative" style={{ height: `${h}%` }}>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {h * 10}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-around mt-4">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(m => (
              <span key={m} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m}</span>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-8">Recent Generated Reports</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                    <FileBarChart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Monthly Archival Summary - 0{i}/24</p>
                    <p className="text-xs text-slate-500 font-medium">Generated on March {10+i}, 2024</p>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-4 border-2 border-dashed border-slate-200 rounded-2xl font-bold text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all">
            Generate Custom Report
          </button>
        </div>
      </div>
    </div>
  );
};

const ReportCard: React.FC<{ title: string; value: string; subtitle: string; icon: any; trend?: 'up' | 'down' }> = ({
  title, value, subtitle, icon: Icon, trend
}) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
        <Icon className="w-6 h-6" />
      </div>
      {trend && (
        <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend === 'up' ? 'Good' : 'Review'}
        </span>
      )}
    </div>
    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{title}</p>
    <div className="flex items-baseline gap-2 mt-1">
      <h4 className="text-3xl font-black text-slate-900">{value}</h4>
    </div>
    <p className="text-xs font-medium text-slate-400 mt-2">{subtitle}</p>
  </div>
);