import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Grid, 
  Building2, 
  CheckCircle2,
  History,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useArchive } from '../context/ArchiveContext';
import { registrationApi } from '../services/api';

interface Cabinet {
  id: string;
  number: string;
  drawers: string[];
}

interface DrawerAssignment {
  id: string;
  cabinet_id: string;
  drawer_number: string;
  branch_id: string;
  branch_name: string;
  branch_code: string;
  cabinet_number: string;
  assigned_at: string;
  assigned_by_name?: string;
}

export const DrawerAssignment: React.FC = () => {
  const { branches, user } = useArchive();
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [assignments, setAssignments] = useState<DrawerAssignment[]>([]);
  const [selectedCabinet, setSelectedCabinet] = useState<Cabinet | null>(null);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDrawer, setSelectedDrawer] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cabinetsRes, assignmentsRes] = await Promise.all([
        registrationApi.getCabinets(),
        registrationApi.getDrawerAssignments()
      ]);
      setCabinets(cabinetsRes.data);
      setAssignments(assignmentsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const getDrawerAssignment = (cabinetId: string, drawerNumber: string) => {
    return assignments.find(a => 
      a.cabinet_id === cabinetId && 
      a.drawer_number === drawerNumber
    );
  };

  const handleAssignDrawer = async () => {
    if (!selectedCabinet || !selectedBranch || !selectedDrawer) {
      toast.error('Please select cabinet, branch, and drawer');
      return;
    }

    try {
      setIsLoading(true);
      await registrationApi.assignDrawer({
        cabinetId: selectedCabinet.id,
        branchId: selectedBranch,
        drawerNumber: selectedDrawer
      });

      toast.success(`Drawer ${selectedDrawer} assigned successfully`);
      await loadData(); // Reload to get updated assignments
      
      // Reset selections
      setSelectedDrawer('');
      setSelectedBranch('');
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to load history');
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl border border-slate-200 p-8">
        <h2 className="text-2xl font-black text-slate-900 mb-6">Drawer Assignment</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cabinet List */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Available Cabinets</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4">
              {cabinets.map((cabinet) => (
                <motion.div
                  key={cabinet.id}
                  whileHover={{ scale: 1.01 }}
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedCabinet?.id === cabinet.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-200'
                  }`}
                  onClick={() => setSelectedCabinet(cabinet)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Archive className="w-6 h-6 text-blue-600" />
                      <span className="font-bold text-slate-900">Cabinet {cabinet.number}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {cabinet.drawers.map((drawer) => {
                      const assignment = getDrawerAssignment(cabinet.id, drawer);
                      
                      return (
                        <div
                          key={drawer}
                          className={`p-2 rounded-lg border text-center relative group ${
                            assignment 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-white border-slate-200 hover:border-blue-200'
                          }`}
                        >
                          <Grid className={`w-4 h-4 mx-auto mb-1 ${
                            assignment ? 'text-green-600' : 'text-slate-400'
                          }`} />
                          <span className="text-xs font-medium block">Drawer {drawer}</span>
                          {assignment && (
                            <>
                              <span className="text-[10px] text-green-600 font-bold mt-1 block truncate">
                                {assignment.branch_code}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewHistory(cabinet.id, drawer);
                                }}
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
          </div>

          {/* Assignment Form */}
          <div className="bg-slate-50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Assign Drawer</h3>
            
            {selectedCabinet ? (
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    Selected Cabinet
                  </label>
                  <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <Archive className="w-5 h-5 text-blue-600" />
                      <span className="font-bold text-slate-900">Cabinet {selectedCabinet.number}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    Select Branch
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  >
                    <option value="">Choose a branch...</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    Select Drawer
                  </label>
                  <select
                    value={selectedDrawer}
                    onChange={(e) => setSelectedDrawer(e.target.value)}
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  >
                    <option value="">Choose a drawer...</option>
                    {selectedCabinet.drawers.map(drawer => {
                      const assignment = getDrawerAssignment(selectedCabinet.id, drawer);
                      return (
                        <option 
                          key={drawer} 
                          value={drawer}
                          className={assignment ? 'text-green-600' : ''}
                        >
                          Drawer {drawer} 
                          {assignment && ` (Assigned to ${assignment.branch_code})`}
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
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Assign Drawer'
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a cabinet to assign drawers</p>
              </div>
            )}
          </div>
        </div>

        {/* Current Assignments Summary */}
        <div className="mt-8 pt-8 border-t border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Current Assignments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Cabinet {assignment.cabinet_number} • Drawer {assignment.drawer_number}
                    </p>
                    <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {assignment.branch_name} ({assignment.branch_code})
                    </p>
                    <p className="text-[10px] text-slate-500 mt-2">
                      Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <DrawerHistoryModal
            history={historyData}
            onClose={() => setShowHistory(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const DrawerHistoryModal: React.FC<{ history: any[]; onClose: () => void }> = ({ history, onClose }) => (
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
      className="bg-white rounded-3xl max-w-2xl w-full p-8"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-2xl font-black text-slate-900 mb-6">Assignment History</h3>
      
      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {history.map((item, index) => (
          <div key={item.id || index} className="relative pl-8 pb-4 border-l-2 border-slate-200">
            <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-blue-600" />
            <div className="bg-slate-50 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900">
                  {item.branch_name}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(item.assigned_at).toLocaleString()}
                </span>
              </div>
              {item.ended_at && (
                <p className="text-xs text-slate-500">
                  Ended: {new Date(item.ended_at).toLocaleString()}
                </p>
              )}
              {item.assigned_by_name && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                  <User className="w-3 h-3" />
                  Assigned by: {item.assigned_by_name}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="mt-6 w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
      >
        Close
      </button>
    </motion.div>
  </motion.div>
);