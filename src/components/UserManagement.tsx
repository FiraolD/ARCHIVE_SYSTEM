import React, { useState, useEffect } from 'react';
import {
  Users as UsersIcon, UserPlus, Mail, Lock, User as UserIcon, Edit2, Trash2,
  CheckCircle2, XCircle, MoreVertical, Building2, Loader2, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorDetails } from '../utils/apiError';
import { useArchive } from '../context/ArchiveContext';
import { userApi, registrationApi } from '../services/api';
import type { Role } from '../types';
import {
  PageHeader, PageHeaderButton, SearchInput, EmptyState, Modal,
} from './ui';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Agent' | 'Viewer';
  department?: string;
  department_name?: string;
  avatar?: string;
  createdAt: string;
  created_at?: string;
  lastLogin?: string;
  last_login?: string;
  is_active: boolean;
}

interface Department { id: string; name: string; code: string; }

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useArchive();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchUsers(); fetchDepartments(); }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await userApi.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to fetch users');
    } finally { setIsLoading(false); }
  };

  const fetchDepartments = async () => {
    try {
      const response = await registrationApi.getDepartments();
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      toast.error('Failed to fetch departments');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await userApi.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading && users.length === 0) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Create and manage system users with department assignment"
        icon={UsersIcon}
        actions={
          <>
            <PageHeaderButton icon={RefreshCw} onClick={fetchUsers}>Refresh</PageHeaderButton>
            <PageHeaderButton icon={UserPlus} variant="solid" onClick={() => setShowAddForm(true)}>
              Add User
            </PageHeaderButton>
          </>
        }
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, email, role, or department…"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users found"
          description="Click 'Add User' to create the first one"
          action={
            <button onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
              Add User
            </button>
          } />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => (
            <UserCard
              key={user.id}
              user={user}
              isSelf={user.id === currentUser?.id}
              onEdit={() => setEditingUser(user)}
              onDelete={() => handleDeleteUser(user.id)}
            />
          ))}
        </div>
      )}

      <Modal
        open={showAddForm || !!editingUser}
        onClose={() => { setShowAddForm(false); setEditingUser(null); }}
        title={editingUser ? 'Edit User' : 'Create New User'}
        size="sm"
      >
        <UserForm
          editing={editingUser}
          departments={departments}
          onSuccess={() => { fetchUsers(); setShowAddForm(false); setEditingUser(null); }}
          onCancel={() => { setShowAddForm(false); setEditingUser(null); }}
        />
      </Modal>
    </div>
  );
};

const UserCard: React.FC<{
  user: User;
  isSelf: boolean;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ user, isSelf, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shrink-0">
            {user.name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 dark:text-white truncate">{user.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen(o => !o)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <MoreVertical className="w-4 h-4 text-slate-400" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-20 overflow-hidden">
                <button
                  onClick={() => { setMenuOpen(false); onEdit(); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-sm"
                >
                  <Edit2 className="w-4 h-4" /> Edit User
                </button>
                {!isSelf && (
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" /> Delete User
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <Row label="Role"><RoleBadge role={user.role} /></Row>
        {user.department_name && (
          <Row label="Department">
            <span className="text-xs font-bold flex items-center gap-1">
              <Building2 className="w-3 h-3" /> {user.department_name}
            </span>
          </Row>
        )}
        <Row label="Status">
          <span className={`flex items-center gap-1 text-xs font-bold ${user.is_active ? 'text-green-600' : 'text-slate-400'}`}>
            {user.is_active ? <><CheckCircle2 className="w-3 h-3" /> Active</> : <><XCircle className="w-3 h-3" /> Inactive</>}
          </span>
        </Row>
        <Row label="Joined">
          <span className="text-xs text-slate-700 dark:text-slate-300">
            {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
          </span>
        </Row>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}:</span>
    {children}
  </div>
);

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const styles: Record<string, string> = {
    Admin: 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900',
    Manager: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900',
    Agent: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900',
    Viewer: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };
  return (
    <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${styles[role] || styles.Viewer}`}>
      {role}
    </span>
  );
};

const UserForm: React.FC<{
  editing: User | null;
  departments: Department[];
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ editing, departments, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: editing?.name || '',
    email: editing?.email || '',
    password: '',
    role: editing?.role || 'Agent',
    department: editing?.department_name || '',
    is_active: editing?.is_active ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editing) {
        await userApi.updateUser(editing.id, formData);
        toast.success('User updated successfully');
      } else {
        await userApi.createUser(formData);
        toast.success('User created successfully');
      }
      onSuccess();
    } catch (error: unknown) {
      toast.error(getApiErrorDetails(error).error || 'Operation failed');
    } finally { setIsSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          <UserIcon className="w-3 h-3" /> Full Name
        </label>
        <input type="text" required value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
          placeholder="John Doe" />
      </div>
      <div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          <Mail className="w-3 h-3" /> Email Address
        </label>
        <input type="email" required value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
          placeholder="john@example.com" />
      </div>
      {!editing && (
        <div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            <Lock className="w-3 h-3" /> Password
          </label>
          <input type="password" required value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
            placeholder="••••••••" />
        </div>
      )}
      <div>
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Role</label>
        <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none">
          <option value="Admin">Admin</option>
          <option value="Manager">Manager</option>
          <option value="Agent">Agent</option>
          <option value="Viewer">Viewer</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Department</label>
        <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none">
          <option value="">Select Department</option>
          {departments.length > 0
            ? departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>)
            : <option disabled>No departments available</option>}
        </select>
      </div>
      {editing && (
        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_active" checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
          <label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300">User is active</label>
        </div>
      )}
      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (editing ? 'Update User' : 'Create User')}
        </button>
      </div>
    </form>
  );
};