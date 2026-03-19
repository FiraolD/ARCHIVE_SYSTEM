import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Lock, 
  User as UserIcon,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  MoreVertical,
  Building2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useArchive } from '../context/ArchiveContext';
import { userApi, registrationApi } from '../services/api'; // Make sure registrationApi is imported

interface User {
  id: string;
  name: string; 
  email: string;
  role: 'Admin' | 'Manager' | 'Agent' | 'Viewer';
  department?: string;
  department_name?: string;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  is_active: boolean;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useArchive();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await userApi.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      console.log('Fetching departments...');
      const response = await registrationApi.getDepartments();
      console.log('Departments fetched:', response.data);
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
          <h2 className="text-3xl font-black text-slate-900">User Management</h2>
          <p className="text-slate-500 font-medium">Create and manage system users with department assignment</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
        >
          <UserPlus className="w-5 h-5" />
          Add New User
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name, email, role, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
          />
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl border  p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black text-lg">
                      {user.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900">{user.name}</h3>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="relative group">
                    <button className="p-2 hover:bg-slate-100 rounded-lg">
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-slate-200  group-hover:block z-10">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit User
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 flex items-center gap-2 text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete User
                        </button>
                      )}
                    </div>   :   
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-left">
                    <span className="text-xs font-medium text-slate-500">Role</span>
          :       <RoleBadge role={user.role} />
                  </div>
                  
                  {/* Display Department */}
                  {user.department_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Department:  </span>
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {user.department_name}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-left">
                    <span className="text-xs font-medium text-slate-500">Status:  </span>
                    <span className={`flex items-center gap-1 text-xs font-bold ${
                      user.is_active ? 'text-green-600' : 'text-slate-400'
                    }`}>
                      {user.is_active? (
                        <><CheckCircle2 className="w-3 h-3" /> Active</>
                      ) : (
                        <><XCircle className="w-3 h-3" /> Inactive</>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-left">
                    <span className="text-xs font-medium text-slate-500">Joined:</span>
                    <span className="text-xs text-slate-700">  
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  {user.lastLogin && (
                    <div className="flex items-center justify-between">  
                      <span className="text-xs font-medium text-slate-500">Last Login:</span>
                      <span className="text-xs text-slate-700">  
                        {new Date(user.lastLogin).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No users found</p>
              <p className="text-sm mt-1">Click "Add New User" to create one</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Add/Edit User Modal */}
      <AnimatePresence>
        {(showAddForm || editingUser) && (
          <UserFormModal
            user={editingUser}
            departments={departments}
            onClose={() => {
              setShowAddForm(false);
              setEditingUser(null);
            }}
            onSuccess={() => {
              fetchUsers();
              setShowAddForm(false);
              setEditingUser(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const styles: Record<string, string> = {
    Admin: 'bg-purple-100 text-purple-700 border-purple-200',
    Manager: 'bg-blue-100 text-blue-700 border-blue-200',
    Agent: 'bg-green-100 text-green-700 border-green-200',
    Viewer: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${styles[role] || 'bg-slate-100 text-slate-700'}`}>
      {role}
    </span>
  );
};

// Updated UserFormModal with Department Selection
const UserFormModal: React.FC<{ 
  user?: User | null; 
  departments: Department[];
  onClose: () => void; 
  onSuccess: () => void;
}> = ({ user, departments, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'Agent',
    department: user?.department_name || '',
    is_active: user?.is_active ?? true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (user) {
        await userApi.updateUser(user.id, formData);
        toast.success('User updated successfully');
      } else {
        await userApi.createUser(formData);
        toast.success('User created successfully');
      }
      onSuccess();
    } catch (error: any) {
      console.error('User operation error:', error);
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
        <h3 className="text-2xl font-black text-slate-900 mb-6">
          {user ? 'Edit User' : 'Create New User'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
              placeholder="john@example.com"
            />
          </div>

          {!user && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Password
              </label>
              <input
                type="password"
                required={!user}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                placeholder="••••••••"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
            >
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Agent">Agent</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>

          {/* Department Selection */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Department
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
            >
              <option value="">Select Department</option>
              {departments && departments.length > 0 ? (
                departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))
              ) : (
                <option disabled>No departments available</option>
              )}
            </select>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                User is active
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (user ? 'Update User' : 'Create User')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};