// src/components/CabinetAssignment.tsx
import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Grid, 
  MapPin, 
  CheckCircle2,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useArchive } from '../context/ArchiveContext';
import { registrationApi } from '../services/api';

interface Cabinet {
  id: string;
  number: string;
  drawers: string[];
  branchId?: string;
  branchName?: string;
}

export const CabinetAssignment: React.FC = () => {
  const { branches, fetchCabinets, cabinets } = useArchive();
  const [selectedCabinet, setSelectedCabinet] = useState<Cabinet | null>(null);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDrawer, setSelectedDrawer] = useState('');

  const handleAssignDrawer = async () => {
    if (!selectedCabinet || !selectedBranch || !selectedDrawer) {
      toast.error('Please select cabinet, branch, and drawer');
      return;
    }

    try {
      await registrationApi.assignDrawer({
        cabinetId: selectedCabinet.id,
        branchId: selectedBranch,
        drawerNumber: selectedDrawer
      });
      toast.success('Drawer assigned successfully');
      fetchCabinets();
    } catch (error) {
      toast.error('Failed to assign drawer');
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl border border-slate-200 p-8">
        <h2 className="text-2xl font-black text-slate-900 mb-6">Cabinet & Drawer Assignment</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cabinet List */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Available Cabinets</h3>
            <div className="space-y-4">
              {cabinets.map((cabinet) => (
                <motion.div
                  key={cabinet.id}
                  whileHover={{ scale: 1.02 }}
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
                    {cabinet.branchName && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        {cabinet.branchName}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {cabinet.drawers.map((drawer) => (
                      <div
                        key={drawer}
                        className="p-2 bg-white rounded-lg border border-slate-200 text-center"
                      >
                        <FolderOpen className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                        <span className="text-xs font-medium">Drawer {drawer}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Assignment Form */}
          <div className="bg-slate-50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Assign Drawer to Branch</h3>
            
            {selectedCabinet ? (
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    Select Branch
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl"
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
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl"
                  >
                    <option value="">Choose a drawer...</option>
                    {selectedCabinet.drawers.map(drawer => (
                      <option key={drawer} value={drawer}>
                        Drawer {drawer}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAssignDrawer}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  Assign Drawer to Branch
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
      </div>
    </div>
  );
};