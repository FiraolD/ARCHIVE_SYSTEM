import React, { useState } from 'react';
import { format } from 'date-fns';
import { Shield, User, Search, Info, Loader2 } from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  details: string;
}

interface AuditTrailProps {
  logs: AuditLog[];
  isLoading?: boolean;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ logs, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(log => 
    log.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resource?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-800">Security Audit Trail</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Timestamp</th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">User</th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Action</th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Resource</th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Info className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium">
                        {searchTerm ? 'No matching logs found.' : 'No audit logs available.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">
                          {format(new Date(log.timestamp), 'MMM dd, yyyy')}
                        </span>
                        <span className="text-xs text-slate-400">
                          {format(new Date(log.timestamp), 'HH:mm:ss')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                          <User className="w-3 h-3 text-slate-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{log.user}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {log.resource}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{log.details}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  const styles: Record<string, string> = {
    'VIEW': 'text-blue-600 bg-blue-50 border-blue-100',
    'UPDATE': 'text-amber-600 bg-amber-50 border-amber-100',
    'DELETE': 'text-red-600 bg-red-50 border-red-100',
    'LOGIN': 'text-green-600 bg-green-50 border-green-100',
    'Document Ingested': 'text-purple-600 bg-purple-50 border-purple-100',
    'Status Updated': 'text-orange-600 bg-orange-50 border-orange-100',
    'Placement Updated': 'text-indigo-600 bg-indigo-50 border-indigo-100',
    'File Requested': 'text-cyan-600 bg-cyan-50 border-cyan-100',
    'Request Approved': 'text-emerald-600 bg-emerald-50 border-emerald-100',
    'Document Returned': 'text-teal-600 bg-teal-50 border-teal-100',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${styles[action] || 'text-slate-600 bg-slate-50 border-slate-100'}`}>
      {action}
    </span>
  );
};