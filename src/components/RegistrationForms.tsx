import React, { useState, useMemo , useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Layers, 
  Package, 
  Box as BoxIcon, 
  Archive, 
  Plus, 
  AlertCircle,
  FolderOpen,
  Grid
} from 'lucide-react';
import { toast } from 'sonner';
import { useArchive } from '../context/ArchiveContext';
import { registrationApi } from '../services/api';
import { DrawerAssignment } from './DrawerAssignment';
import { AddFileToBox } from './AddFileToBox';
type RegistrationTab = 'branch' | 'department' | 'product' | 'box' | 'cabinet' | 'drawer-assignment' | 'add-to-box';
type FileType = 'Claim File' | 'Circular' | 'Policy';


// ============================================================================
// BRANCH REGISTRATION FORM
// ============================================================================

const BranchRegistrationForm: React.FC = () => {
  const { addBranch } = useArchive();
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addBranch(formData);
      setFormData({ name: '', code: '' });
      toast.success('Branch registered successfully');
    } catch (error) {
      toast.error('Failed to register branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormSection title="Branch Registration" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700">Branch Name</label>
        <input 
          name="name" 
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required 
          placeholder="e.g. Bole Premium Branch" 
          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" 
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700">Branch Code</label>
        <input 
          name="code" 
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          required 
          placeholder="e.g. LGS" 
          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" 
        />
      </div>
    </FormSection>
  );
};

// ============================================================================
// DEPARTMENT REGISTRATION FORM
// ============================================================================
// In RegistrationForms.tsx, update the DepartmentRegistrationForm


const DepartmentRegistrationForm: React.FC = () => {
  const { addDepartment } = useArchive();
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (words.length === 1) {
      return name.substring(0, 3).toUpperCase() + '-DEPT';
    } else {
      return words.map(w => w[0]).join('').toUpperCase() + '-DEPT';
    }
  };

  const isCodeExists = (code: string) => {
    return existingDepartments.some(dept => dept.code === code);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData({ ...formData, name: newName });
    
    if (!formData.code) {
      setSuggestedCode(generateSuggestedCode(newName));
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value.toUpperCase();
    setFormData({ ...formData, code: newCode });
    
    if (isCodeExists(newCode)) {
      setError(`Code "${newCode}" already exists`);
    } else {
      setError(null);
    }
    setSuggestedCode('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isCodeExists(formData.code)) {
      setError(`Code "${formData.code}" already exists. Please use a different code.`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      await addDepartment(formData);
      setFormData({ name: '', code: '' });
      setSuggestedCode('');
      await loadDepartments(); // Refresh the list
      toast.success('Department registered successfully');
    } catch (error: any) {
      if (error.response?.data?.error?.includes('already exists')) {
        setError(`Department code "${formData.code}" already exists`);
      } else {
        toast.error(error.response?.data?.error || 'Failed to register department');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormSection title="Department Registration" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700">Department Name</label>
        <input 
          name="name" 
          value={formData.name}
          onChange={handleNameChange}
          required 
          placeholder="e.g. Claims" 
          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" 
        />
      </div>
      
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700">Department Code</label>
        <input 
          name="code" 
          value={formData.code}
          onChange={handleCodeChange}
          required 
          placeholder="e.g. CLM-DEPT" 
          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none ${
            error ? 'border-red-500 bg-red-50' : 
            formData.code && !error ? 'border-green-500 bg-green-50' : 
            'border-slate-200'
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
        
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
        
        {formData.code && !error && !isCodeExists(formData.code) && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <span>✓ Code available</span>
          </p>
        )}
      </div>

      {/* Show existing departments for reference */}
      {existingDepartments.length > 0 && (
        <div className="md:col-span-2 mt-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Existing Department Codes
          </p>
          <div className="flex flex-wrap gap-2">
            {existingDepartments.map(dept => (
              <span 
                key={dept.id}
                className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-mono text-slate-600"
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

// ============================================================================
// PRODUCT REGISTRATION FORM
// ============================================================================

const ProductRegistrationForm: React.FC = () => {
  const { addProduct } = useArchive();
  const [productName, setProductName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addProduct({ name: productName });
      setProductName('');
      toast.success('Product registered successfully');
    } catch (error) {
      toast.error('Failed to register product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormSection title="Policy/Product Registration" onSubmit={handleSubmit}>
      <div className="md:col-span-2 space-y-1.5">
        <label className="text-sm font-bold text-slate-700">Product Name</label>
        <input 
          name="name" 
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          required 
          placeholder="e.g. Health Insurance Plan A" 
          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" 
        />
      </div>
    </FormSection>
  );
};

// ============================================================================
// BOX REGISTRATION FORM
// ============================================================================

const BoxRegistrationForm: React.FC = () => {
  const { addBox, branches, generateBoxIdentifier } = useArchive();
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.code || '');
  const [fileType, setFileType] = useState<FileType>('Claim File');

  const previewId = useMemo(() => generateBoxIdentifier(selectedBranch), [selectedBranch, generateBoxIdentifier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addBox({
        branchCode: selectedBranch,
        fileType: fileType,
      });
      toast.success(`Box registered: ${previewId}`);
    } catch (error) {
      toast.error('Failed to register box');
    }
  };

  return (
    <FormSection title="Box Registration" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700">Select Branch</label>
        <select 
          value={selectedBranch} 
          onChange={(e) => setSelectedBranch(e.target.value)} 
          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
        >
          {branches.map(b => <option key={b.id} value={b.code}>{b.name} ({b.code})</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700">File Type</label>
        <select 
          value={fileType} 
          onChange={(e) => setFileType(e.target.value as FileType)} 
          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
        >
          <option value="Claim File">Claim File</option>
          <option value="Circular">Circular</option>
          <option value="Policy">Policy</option>
          <option value="Billing">Billing</option>
          <option value="Correspondence">Correspondence</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-xs font-black uppercase text-blue-600 tracking-widest">Box ID Preview</p>
            <p className="text-lg font-black text-blue-900 font-mono">{previewId}</p>
          </div>
        </div>
      </div>
    </FormSection>
  );
};

// ============================================================================
// CABINET REGISTRATION FORM
// ============================================================================

const CabinetRegistrationForm: React.FC = () => {
  const { addCabinet } = useArchive();
  const [formData, setFormData] = useState({ number: '', drawers: '' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addCabinet();
      toast.success('File Box registered successfully with 12 drawers');
    } catch (error) {
      toast.error('Failed to register File Box');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormSection title="File Box Registration" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700">File Box Name</label>
        <input 
          name="number" 
          value={formData.number}
          onChange={(e) => setFormData({ ...formData, number: e.target.value })}
          required 
          placeholder="Assigned automatically: FILEBOX + sequence" 
          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" 
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700">Drawers</label>
        <input 
          name="drawers" 
          value={formData.drawers}
          onChange={(e) => setFormData({ ...formData, drawers: e.target.value })}
          required 
          placeholder="12 drawers are created automatically" 
          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" 
        />
      </div>
    </FormSection>
  );
};

// ============================================================================
// FORM SECTION COMPONENT (Helper)
// ============================================================================

const FormSection: React.FC<{ title: string; children: React.ReactNode; onSubmit: (e: React.FormEvent) => void }> = ({ title, children, onSubmit }) => (
  <form onSubmit={onSubmit} className="space-y-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xl font-bold text-slate-800">{title}</h3>
      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
        <Plus className="w-6 h-6" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {children}
    </div>
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


// ============================================================================
// MAIN REGISTRATION PAGE COMPONENT
// ============================================================================

export const RegistrationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RegistrationTab>('branch');

  const tabs: { id: RegistrationTab; label: string; icon: any }[] = [
    { id: 'branch', label: 'Branch', icon: Building2 },
    { id: 'department', label: 'Department', icon: Layers },
    { id: 'product', label: 'Product', icon: Package },
    { id: 'box', label: 'Box', icon: BoxIcon },
    { id: 'cabinet', label: 'File Box', icon: Archive },
    { id: 'drawer-assignment', label: 'Drawer Assignment', icon: Grid },
    { id: 'add-to-box', label: 'Add File to Box', icon: FolderOpen },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Tabs */}
      <div className="lg:w-1/4 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="font-semibold text-sm">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="lg:w-3/4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
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
    </div>
  );
};