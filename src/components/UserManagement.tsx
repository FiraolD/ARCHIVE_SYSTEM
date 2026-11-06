import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Edit2, Lock, Power, Loader2, Users as UsersIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useArchive } from '../context/ArchiveContext';
import { userApi, registrationApi } from '../services/api';
import { PageHeader, PageHeaderButton, Modal } from './ui';

const timeAgo = (iso: string): string => {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return 'Just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 2592000) return `${Math.round(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: 'Admin' | 'File Clerk' | 'Agent' | 'Viewer' | string;
  department_name?: string;
  branch_name?: string;
  created_at?: string;
  last_login?: string;
  is_active?: boolean | string; // Handled carefully below
  isActive?: boolean | string;
}

interface Department { id: string; name: string; code: string; }
interface Branch { id: string; name: string; code: string; }

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useArchive();
  
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal States
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, deptRes, branchRes] = await Promise.all([
        userApi.getUsers(),
        registrationApi.getDepartments(),
        registrationApi.getBranches().catch(() => ({ data: [] }))
      ]);
      
      setUsers(usersRes.data);
      setDepartments(deptRes.data);
      setBranches(branchRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  // ROBUST HELPER: Safely checks if a user is active regardless of API format
  const isUserActive = (user: User) => {
    // Check snake_case first, then camelCase
    const status = user.is_active !== undefined ? user.is_active : user.isActive;
    
    // Check for boolean true, string "true", or number 1
    if (status === true || status === 'true' || status === 1) return true;
    return false;
  };

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      return toast.error("You cannot deactivate your own account.");
    }
    
    const isCurrentlyActive = isUserActive(user);
    const action = isCurrentlyActive ? 'deactivate' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} ${user.name}?`)) return;

    try {
      await userApi.updateUser(user.id, { is_active: !isCurrentlyActive });
      toast.success(`User ${action}d successfully`);
      fetchData();
    } catch (error) {
      toast.error(`Failed to ${action} user`);
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`Reset password for ${user.name} to the default (Insurance123)?`)) return;
    try {
      await userApi.resetPassword(user.id);
      toast.success(`Password reset to default for ${user.name}`);
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = 
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchRole = roleFilter ? u.role === roleFilter : true;
      const matchBranch = branchFilter ? u.branch_name === branchFilter : true;
      
      let matchStatus = true;
      if (statusFilter === 'active') matchStatus = isUserActive(u);
      if (statusFilter === 'inactive') matchStatus = !isUserActive(u);

      return matchSearch && matchRole && matchBranch && matchStatus;
    });
  }, [users, searchQuery, roleFilter, branchFilter, statusFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('');
    setBranchFilter('');
    setStatusFilter('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Page Header */}
      <PageHeader
        title="Users"
        subtitle="Manage who can sign in, their role, and which branch they belong to"
        icon={UsersIcon}
        actions={
          <PageHeaderButton icon={Plus} variant="solid" onClick={() => setShowAddForm(true)}>
            Add User
          </PageHeaderButton>
        }
      />

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300"
          >
            <option value="">All roles</option>
            <option value="Admin">Admin</option>
            <option value="File Clerk">File Clerk</option>
            <option value="Agent">Agent</option>
            <option value="Viewer">Viewer</option>
          </select>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300"
          >
            <option value="">All branches</option>
            {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={clearFilters} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
            Clear
          </button>
          <button className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/20">
            Apply
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{filteredUsers.length} users</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">Name</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">Username</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">Email</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">Role</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">Branch</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">Last Login</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-500">No users found</td></tr>
              ) : (
                filteredUsers.map((user) => {
                  const active = isUserActive(user); // Use the safe checker

                  return (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {user.username || user.email.split('@')[0]}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {user.email}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {user.branch_name || 'Awash Head Office'}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">
                        <span title={user.last_login ? new Date(user.last_login).toLocaleString() : undefined}>{user.last_login ? timeAgo(user.last_login) : 'Never'}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          active 
                            ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900' 
                            : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`} />
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingUser(user)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleResetPassword(user)} className="p-1.5 text-slate-400 hover:text-amber-600 rounded" title="Reset Password">
                            <Lock className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleToggleStatus(user)} className={`p-1.5 rounded ${active ? 'text-slate-400 hover:text-red-600' : 'text-slate-400 hover:text-green-600'}`} title={active ? "Deactivate" : "Activate"}>
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal open={showAddForm || !!editingUser} onClose={() => { setShowAddForm(false); setEditingUser(null); }} title={editingUser ? 'Edit User' : 'Add New User'} size="md">
        <UserForm 
          editing={editingUser} 
          departments={departments} 
          branches={branches}
          onSuccess={() => { setShowAddForm(false); setEditingUser(null); fetchData(); }}
          onCancel={() => { setShowAddForm(false); setEditingUser(null); }}
        />
      </Modal>
    </div>
  );
};

const UserForm: React.FC<{
  editing: User | null;
  departments: Department[];
  branches: Branch[];
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ editing, departments, branches, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: editing?.name || '',
    email: editing?.email || '',
    role: editing?.role || 'Agent',
    department: editing?.department_name || '',
    branch: editing?.branch_name || 'Awash Head Office',
    is_active: editing ? (editing.is_active === true || editing.is_active === 'true') : true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editing) {
        await userApi.updateUser(editing.id, formData);
        toast.success('User updated');
      } else {
        await userApi.createUser(formData);
        toast.success('User created. Default password is Insurance123');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-xs font-medium text-slate-500 mb-2 block">Full Name</label>
        <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none text-sm dark:text-white" />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 mb-2 block">Email Address</label>
        <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none text-sm dark:text-white" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-2 block">Role</label>
          <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:text-white">
            <option value="Admin">Admin</option>
            <option value="File Clerk">File Clerk</option>
            <option value="Agent">Agent</option>
            <option value="Viewer">Viewer</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-2 block">Branch</label>
          <select value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
            className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:text-white">
            <option value="Awash Head Office">Awash Head Office</option>
            {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 mb-2 block">Department</label>
        <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:text-white">
          <option value="">Select Department</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </div>
      {editing && (
        <div className="flex items-center gap-3 pt-2">
          <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
          <label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300">User is active</label>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-6 border-t dark:border-slate-800">
        <button type="button" onClick={onCancel} className="px-6 py-2.5 border dark:border-slate-600 rounded-lg text-sm font-medium dark:text-slate-300">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Save Changes' : 'Create User')}
        </button>
      </div>
    </form>
  );
};