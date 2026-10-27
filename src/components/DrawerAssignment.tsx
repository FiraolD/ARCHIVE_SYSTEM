import React, { useState, useEffect } from 'react';
import { Archive, Grid, Building2, CheckCircle2, History, User } from 'lucide-react';

import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useArchive } from '../context/ArchiveContext';
import { registrationApi } from '../services/api';
import { PageHeader, SectionCard, PageHeaderButton, Modal } from './ui';

interface Cabinet { id: string; number: string; drawers: string[]; }
interface DrawerAssignmentHistory {
  id: string;
  branch_name: string;
  assigned_at: string;
  ended_at?: string;
  assigned_by_name?: string;
}

interface DrawerAssignment {
  id: string; cabinet_id: string; drawer_number: string;
  branch_id: string; branch_name: string; branch_code: string;
  cabinet_number: string; assigned_at: string; assigned_by_name?: string;
}

export const DrawerAssignment: React.FC = () => {
  const { branches } = useArchive();
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [assignments, setAssignments] = useState<DrawerAssignment[]>([]);
  const [selectedCabinet, setSelectedCabinet] = useState<Cabinet | null>(null);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDrawer, setSelectedDrawer] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<DrawerAssignmentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cabinetsRes, assignmentsRes] = await Promise.all([
        registrationApi.getCabinets(),
        registrationApi.getDrawerAssignments(),
      ]);
      setCabinets(cabinetsRes.data);
      setAssignments(assignmentsRes.data);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const getDrawerAssignment = (cabinetId: string, drawerNumber: string) =>
    assignments.find(a => a.cabinet_id === cabinetId && a.drawer_number === drawerNumber);

  const handleAssignDrawer = async () => {
    if (!selectedCabinet || !selectedBranch || !selectedDrawer) {
      toast.error('Please select cabinet, branch, and drawer'); return;
    }
    try {
      setIsLoading(true);
      await registrationApi.assignDrawer({ cabinetId: selectedCabinet.id, branchId: selectedBranch, drawerNumber: selectedDrawer });
      toast.success(`Drawer ${selectedDrawer} assigned successfully`);
      await loadData();
      setSelectedDrawer('');
      setSelectedBranch('');
    } catch {
      toast.error('Failed to assign drawer');
    } finally {
      setIsLoading(false);
    }
  };

  const viewHistory = async (cabinetId: string, drawerNumber: string) => {
    try {
      const response = await registrationApi.getDrawerHistory(cabinetId, drawerNumber);
      setHistoryData(response.data);
      setShowHistory(true);
    } catch {
      toast.error('Failed to load history');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Drawer Assignment"
        subtitle="Assign cabinet drawers to branches for organized file storage"
        icon={Grid}
        actions={<PageHeaderButton icon={History} onClick={loadData}>Refresh</PageHeaderButton>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Available Cabinets" icon={Archive}>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {cabinets.map((cabinet) => (
              <motion.div
                key={cabinet.id}
                whileHover={{ scale: 1.01 }}
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedCabinet?.id === cabinet.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-200'
                }`}
                onClick={() => setSelectedCabinet(cabinet)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Archive className="w-6 h-6 text-blue-600" />
                    <span className="font-bold text-slate-900 dark:text-white">Cabinet {cabinet.number}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {cabinet.drawers.map((drawer) => {
                    const assignment = getDrawerAssignment(cabinet.id, drawer);
                    return (
                      <div key={drawer} className={`p-2 rounded-lg border text-center relative group ${
                        assignment
                          ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-200'
                      }`}>
                        <Grid className={`w-4 h-4 mx-auto mb-1 ${assignment ? 'text-green-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-medium block">Drawer {drawer}</span>
                        {assignment && (
                          <>
                            <span className="text-[10px] text-green-600 font-bold mt-1 block truncate">{assignment.branch_code}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); viewHistory(cabinet.id, drawer); }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-slate-800 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <History className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Assign Drawer" icon={Building2}>
          {selectedCabinet ? (
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Selected Cabinet</label>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <Archive className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-slate-900 dark:text-white">Cabinet {selectedCabinet.number}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Select Branch</label>
                <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none">
                  <option value="">Choose a branch...</option>
                  {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Select Drawer</label>
                <select value={selectedDrawer} onChange={(e) => setSelectedDrawer(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none">
                  <option value="">Choose a drawer...</option>
                  {selectedCabinet.drawers.map(drawer => {
                    const assignment = getDrawerAssignment(selectedCabinet.id, drawer);
                    return (
                      <option key={drawer} value={drawer}>
                        Drawer {drawer}{assignment ? ` (Assigned to ${assignment.branch_code})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <button
                onClick={handleAssignDrawer}
                disabled={!selectedBranch || !selectedDrawer || isLoading}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Assign Drawer'}
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a cabinet to assign drawers</p>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Current Assignments" icon={CheckCircle2}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="p-4 bg-green-50 dark:bg-green-950/40 rounded-xl border border-green-200 dark:border-green-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    Cabinet {assignment.cabinet_number} • Drawer {assignment.drawer_number}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />{assignment.branch_name} ({assignment.branch_code})
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                    Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <Modal open={showHistory} onClose={() => setShowHistory(false)} title="Assignment History" size="md">
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {historyData.map((item, index) => (
            <div key={item.id || index} className="relative pl-8 pb-4 border-l-2 border-slate-200 dark:border-slate-700">
              <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-blue-600" />
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 dark:text-white">{item.branch_name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(item.assigned_at).toLocaleString()}</span>
                </div>
                {item.ended_at && <p className="text-xs text-slate-500 dark:text-slate-400">Ended: {new Date(item.ended_at).toLocaleString()}</p>}
                {item.assigned_by_name && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-2">
                    <User className="w-3 h-3" />Assigned by: {item.assigned_by_name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};