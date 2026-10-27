import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Layers, Plus, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorDetails } from '../utils/apiError';
import { useArchive } from '../context/ArchiveContext';
import { registrationApi } from '../services/api';
import { DrawerAssignment } from './DrawerAssignment';
import { AddFileToBox } from './AddFileToBox';
import { PageHeader } from './ui';

type FileType = 'Claim File' | 'Circular' | 'Policy';

/* ================================================================
   Shared form wrapper
   ================================================================ */
const FormSection: React.FC<{
  title: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
}> = ({ title, children, onSubmit }) => (
  <form onSubmit={onSubmit} className="space-y-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
        <Plus className="w-6 h-6" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
    <div className="flex justify-end pt-4">
      <button
        type="submit"
        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
      >
        Register
      </button>
    </div>
  </form>
);

/* ================================================================
   Branch
   ================================================================ */
const BranchRegistrationForm: React.FC = () => {
  const { addBranch } = useArchive();
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addBranch(formData);
      setFormData({ name: '', code: '' });
      toast.success('Branch registered successfully');
    } catch {
      toast.error('Failed to register branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormSection title="Branch Registration" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Branch Name</label>
        <input
          name="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g. Bole Premium Branch"
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Branch Code</label>
        <input
          name="code"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          required
          placeholder="e.g. LGS"
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
      </div>
    </FormSection>
  );
};

/* ================================================================
   Department
   ================================================================ */
const DepartmentRegistrationForm: React.FC = () => {
  const { addDepartment } = useArchive();
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingDepartments, setExistingDepartments] = useState<any[]>([]);
  const [suggestedCode, setSuggestedCode] = useState<string>('');

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await registrationApi.getDepartments();
      setExistingDepartments(response.data);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const generateSuggestedCode = (name: string) => {
    if (!name) return '';
    const words = name.split(' ');
    return words.length === 1
      ? name.substring(0, 3).toUpperCase() + '-DEPT'
      : words.map((w) => w[0]).join('').toUpperCase() + '-DEPT';
  };

  const isCodeExists = (code: string) =>
    existingDepartments.some((dept) => dept.code === code);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData({ ...formData, name: newName });
    if (!formData.code) setSuggestedCode(generateSuggestedCode(newName));
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value.toUpperCase();
    setFormData({ ...formData, code: newCode });
    setError(isCodeExists(newCode) ? `Code "${newCode}" already exists` : null);
    setSuggestedCode('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCodeExists(formData.code)) {
      setError(`Code "${formData.code}" already exists.`);
      return;
    }
    setIsSubmitting(true);
    try {
      await addDepartment(formData);
      setFormData({ name: '', code: '' });
      setSuggestedCode('');
      await loadDepartments();
      toast.success('Department registered successfully');
    } catch (error: unknown) {
      if (getApiErrorDetails(error).error?.includes('already exists')) {
        setError(`Department code "${formData.code}" already exists`);
      } else {
        toast.error(getApiErrorDetails(error).error || 'Failed to register department');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormSection title="Department Registration" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Department Name</label>
        <input
          name="name"
          value={formData.name}
          onChange={handleNameChange}
          required
          placeholder="e.g. Claims"
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Department Code</label>
        <input
          name="code"
          value={formData.code}
          onChange={handleCodeChange}
          required
          placeholder="e.g. CLM-DEPT"
          className={`w-full p-3 bg-slate-50 dark:bg-slate-800/60 border rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none ${
            error ? 'border-red-500' : formData.code && !error ? 'border-green-500' : 'border-slate-200 dark:border-slate-700'
          }`}
        />
        {suggestedCode && !formData.code && (
          <button
            type="button"
            onClick={() => setFormData({ ...formData, code: suggestedCode })}
            className="text-xs text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-1"
          >
            Use suggested: <span className="font-mono font-bold">{suggestedCode}</span>
          </button>
        )}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        {formData.code && !error && !isCodeExists(formData.code) && (
          <p className="text-xs text-green-600 mt-1">✓ Code available</p>
        )}
      </div>
      {existingDepartments.length > 0 && (
        <div className="md:col-span-2 mt-4">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Existing Department Codes
          </p>
          <div className="flex flex-wrap gap-2">
            {existingDepartments.map((dept) => (
              <span
                key={dept.id}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400"
              >
                {dept.code}
              </span>
            ))}
          </div>
        </div>
      )}
    </FormSection>
  );
};

/* ================================================================
   Product
   ================================================================ */
const ProductRegistrationForm: React.FC = () => {
  const { addProduct } = useArchive();
  const [productName, setProductName] = useState('');
  const [, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addProduct({ name: productName });
      setProductName('');
      toast.success('Product registered successfully');
    } catch {
      toast.error('Failed to register product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormSection title="Policy/Product Registration" onSubmit={handleSubmit}>
      <div className="md:col-span-2 space-y-1.5">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Product Name</label>
        <input
          name="name"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          required
          placeholder="e.g. Health Insurance Plan A"
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
      </div>
    </FormSection>
  );
};

/* ================================================================
   Box (physical)
   ================================================================ */
const BoxRegistrationForm: React.FC = () => {
  const { addBox, branches, generateBoxIdentifier } = useArchive();
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.code || '');
  const [fileType, setFileType] = useState<FileType>('Claim File');
  const previewId = useMemo(
    () => generateBoxIdentifier(selectedBranch),
    [selectedBranch, generateBoxIdentifier]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addBox({ branchCode: selectedBranch, fileType });
      toast.success(`Box registered: ${previewId}`);
    } catch {
      toast.error('Failed to register box');
    }
  };

  return (
    <FormSection title="Box Registration" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Select Branch</label>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.code}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">File Type</label>
        <select
          value={fileType}
          onChange={(e) => setFileType(e.target.value as FileType)}
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
        >
          <option value="Claim File">Claim File</option>
          <option value="Circular">Circular</option>
          <option value="Policy">Policy</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-xs font-black uppercase text-blue-600 tracking-widest">Box ID Preview</p>
            <p className="text-lg font-black text-blue-900 dark:text-blue-200 font-mono">{previewId}</p>
          </div>
        </div>
      </div>
    </FormSection>
  );
};

/* ================================================================
   File Box (cabinet)
   ================================================================ */
const CabinetRegistrationForm: React.FC = () => {
  const { addCabinet } = useArchive();
  const [formData, setFormData] = useState({ number: '', drawers: '' });
  const [, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const drawersArray = formData.drawers
        .split(',')
        .map((d) => d.trim())
        .filter((d) => d.length > 0);
      await addCabinet({ number: formData.number, drawers: drawersArray });
      toast.success('File Box registered successfully');
    } catch {
      toast.error('Failed to register File Box');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormSection title="File Box Registration" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">File Box Name</label>
        <input
          name="number"
          value={formData.number}
          onChange={(e) => setFormData({ ...formData, number: e.target.value })}
          required
          placeholder="Assigned automatically: FILEBOX + sequence"
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Drawers</label>
        <input
          name="drawers"
          value={formData.drawers}
          onChange={(e) => setFormData({ ...formData, drawers: e.target.value })}
          required
          placeholder="12 drawers are created automatically"
          className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
      </div>
    </FormSection>
  );
};

/* ================================================================
   Page
   ================================================================ */
export const RegistrationPage: React.FC<{ activeTab?: string }> = ({ activeTab = 'branch' }) => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Registration"
        subtitle="Register branches, departments, products, boxes and cabinets"
        icon={Layers}
      />

      {/* Full width form area */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 md:p-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'branch' && <BranchRegistrationForm />}
          {activeTab === 'department' && <DepartmentRegistrationForm />}
          {activeTab === 'product' && <ProductRegistrationForm />}
          {activeTab === 'box' && <BoxRegistrationForm />}
          {activeTab === 'cabinet' && <CabinetRegistrationForm />}
          {activeTab === 'drawer-assignment' && <DrawerAssignment />}
          {activeTab === 'add-to-box' && <AddFileToBox />}
        </motion.div>
      </div>
    </div>
  );
};