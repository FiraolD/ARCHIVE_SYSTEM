import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FilePlus, 
  User, 
  Calendar, 
  ArrowRight, 
  FileText, 
  ShieldCheck, 
  Building2, 
  Hash, 
  MessageSquare,
  Package,
  Lock,
  Archive,
  Grid,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { DocumentUploader } from './DocumentUploader';
import { FILE_TYPES } from '../lib/constants';
import { useArchive } from '../context/ArchiveContext';
import { registrationApi } from '../services/api';

interface Cabinet {
  id: string;
  number: string;
  drawers: string[];
  branchId?: string;
  branchName?: string;
}

interface Product {
  id: string;
  name: string;
}

export const AddIngestFileForm: React.FC<{ userRole?: string }> = ({ userRole = 'Admin' }) => {
  const [fileType, setFileType] = useState<typeof FILE_TYPES[number]>('Claim File');
  const [selectedBranchCode, setSelectedBranchCode] = useState<string>('BOL');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedCabinet, setSelectedCabinet] = useState<string>('');
  const [selectedDrawer, setSelectedDrawer] = useState<string>('');
  const [availableCabinets, setAvailableCabinets] = useState<Cabinet[]>([]);
  const [availableDrawers, setAvailableDrawers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    insuredName: '',
    policyNumber: '',
    claimNumber: '',
    estimatedLoss: '',
    dateAdded: new Date().toISOString().split('T')[0],
    receivedBy: '',
    deliveredBy: '',
    receiverRemark: '',
    title: '',
    plateNumber: '',
    vehicleRegistration: '',
    make: '',
    model: ''
  });

  

  const { branches, departments, products, fetchBranches, fetchDepartments, fetchProducts, ingestDocument } = useArchive();

  // Fetch cabinets when branch changes
  useEffect(() => {
    if (selectedBranchId) {
      fetchCabinetsByBranch(selectedBranchId);
    } else {
      setAvailableCabinets([]);
      setSelectedCabinet('');
      setSelectedDrawer('');
    }
  }, [selectedBranchId]);

  // Update drawers when cabinet changes
  useEffect(() => {
    if (selectedCabinet) {
      const cabinet = availableCabinets.find(c => c.id === selectedCabinet);
      if (cabinet) {
        setAvailableDrawers(cabinet.drawers);
      }
    } else {
      setAvailableDrawers([]);
    }
    setSelectedDrawer('');
  }, [selectedCabinet]);



  // Add this to your AddIngestFileForm component

// State for branch-specific assignments
const [branchAssignments, setBranchAssignments] = useState<Record<string, any[]>>({});

// Load drawer assignments when branch changes
useEffect(() => {
  if (selectedBranchId) {
    loadBranchAssignments(selectedBranchId);
  }
}, [selectedBranchId]);

const loadBranchAssignments = async (branchId: string) => {
  try {
    // Check if we already loaded this branch's assignments
    if (branchAssignments[branchId]) {
      const assignments = branchAssignments[branchId];
      if (assignments.length > 0) {
        // Auto-select the first available cabinet/drawer
        const firstAssignment = assignments[0];
        setSelectedCabinet(firstAssignment.cabinet_id);
        setSelectedDrawer(firstAssignment.drawer_number);
      }
      return;
    }

    // Load from API
    const response = await registrationApi.getDrawerAssignments(branchId);
    const assignments = response.data;
    
    // Store in cache
    setBranchAssignments(prev => ({
      ...prev,
      [branchId]: assignments
    }));

    if (assignments.length > 0) {
      // Auto-select the first available cabinet/drawer
      const firstAssignment = assignments[0];
      setSelectedCabinet(firstAssignment.cabinet_id);
      setSelectedDrawer(firstAssignment.drawer_number);
      
      toast.info(`Found ${assignments.length} drawer(s) assigned to this branch`);
    }
  } catch (error) {
    console.error('Failed to load branch assignments:', error);
  }
};

  const fetchCabinetsByBranch = async (branchId: string) => {
    try {
      const response = await registrationApi.getCabinetsByBranch(branchId);
      setAvailableCabinets(response.data);
    } catch (error) {
      console.error('Failed to fetch cabinets:', error);
      toast.error('Failed to load cabinets for this branch');
    }
  };

  // Generate file reference number
  const generateFileReference = (): string => {
    const year = new Date().getFullYear().toString().slice(-2);
    const branch = branches.find(b => b.id === selectedBranchId);
    const branchCode = branch?.code || 'XXX';
    const product = products.find(p => p.id === selectedProduct);
    const productCode = product?.name.replace(/\s+/g, '').substring(0, 3).toUpperCase() || 'PRD';
    
    // In production, this would come from the backend
    const nextNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    
    return `FL/${branchCode}/${productCode}/${nextNumber}/${year}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (userRole !== 'Admin') {
    toast.error('Only administrators can ingest files.');
    return;
  }

  // Validation
  if (!selectedBranchId) {
    toast.error('Please select a branch');
    return;
  }

  if (fileType === 'Claim File' && !selectedProduct) {
    toast.error('Please select a product for claim file');
    return;
  }

  // Check if file is selected
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  if (!fileInput?.files?.[0]) {
    toast.error('Please select a file to upload');
    return;
  }

  setIsSubmitting(true);

  try {
    const formDataToSend = new FormData();
    
    // Required fields
    formDataToSend.append('type', fileType);
    formDataToSend.append('branchId', selectedBranchId);
    formDataToSend.append('branchCode', selectedBranchCode);
    formDataToSend.append('physicalPlacement', 
      selectedCabinet && selectedDrawer 
        ? `Cabinet ${selectedCabinet} - Drawer ${selectedDrawer}`
        : 'Temporary Location'
    );
    formDataToSend.append('receivedBy', formData.receivedBy || 'System User');
    formDataToSend.append('deliveredBy', formData.deliveredBy || 'System User');
    
    // Title is REQUIRED
    let title = '';
    if (fileType === 'Claim File') {
      title = formData.insuredName 
        ? `Claim - ${formData.insuredName}`
        : `Claim File - ${new Date().toLocaleDateString()}`;
    } else {
      title = formData.title || `${fileType} - ${new Date().toLocaleDateString()}`;
    }
    formDataToSend.append('title', title);
    
    // Optional fields
    formDataToSend.append('dateAdded', formData.dateAdded);
    formDataToSend.append('receiverRemark', formData.receiverRemark || '');
    
    if (selectedProduct) {
      formDataToSend.append('productId', selectedProduct);
    }
    
    if (selectedCabinet) {
      formDataToSend.append('cabinetId', selectedCabinet);
    }
    
    if (selectedDrawer) {
      formDataToSend.append('drawerNumber', selectedDrawer);
    }
    
    // Claim File specific fields
    if (fileType === 'Claim File') {
      formDataToSend.append('insuredName', formData.insuredName || '');
      formDataToSend.append('policyNumber', formData.policyNumber || '');
      formDataToSend.append('claimNumber', formData.claimNumber || '');
      formDataToSend.append('estimatedLoss', formData.estimatedLoss || '0');
      formDataToSend.append('plateNumber', formData.plateNumber || '');
      formDataToSend.append('vehicleRegistration', formData.vehicleRegistration || '');
      formDataToSend.append('make', formData.make || '');
      formDataToSend.append('model', formData.model || '');
    }
    
    // Add file
    formDataToSend.append('file', fileInput.files[0]);

    // Log for debugging
    console.log('Sending FormData:');
    for (let pair of formDataToSend.entries()) {
      console.log(pair[0] + ':', pair[1]);
    }

    const response = await ingestDocument(formDataToSend);
    
    // Success handling
    toast.success(
      <div>
        <p className="font-bold">Document ingested successfully!</p>
        <p className="text-xs font-mono mt-1">Ref: {response.archiveReferenceNumber}</p>
      </div>
    );
    
    // Reset form
    setFormData({
      insuredName: '',
      policyNumber: '',
      claimNumber: '',
      estimatedLoss: '',
      dateAdded: new Date().toISOString().split('T')[0],
      receivedBy: '',
      deliveredBy: '',
      receiverRemark: '',
      title: '',
      plateNumber: '',
      vehicleRegistration: '',
      make: '',
      model: ''
    });
    setSelectedCabinet('');
    setSelectedDrawer('');
    setSelectedProduct('');
    
    // Clear file input
    if (fileInput) {
      fileInput.value = '';
    }
    
  } catch (error: any) {
    // ✅ CATCH BLOCK - Handle errors
    console.error('Ingest error:', error);
    
    // Show the actual error message from server
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'Failed to ingest document';
    toast.error(errorMessage);
    
    // Log detailed error info for debugging
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
    
  } finally {
    // ✅ FINALLY BLOCK - Always reset submitting state
    setIsSubmitting(false);
  }
};

// Reusable Input Field Component
const InputField: React.FC<{ 
  label: string; 
  name: string;
  icon: any; 
  placeholder?: string; 
  type?: string; 
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}> = ({ 
  label, 
  name,
  icon: Icon, 
  placeholder, 
  type = 'text', 
  value,
  onChange,
  required 
}) => (
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
      <Icon className="w-3 h-3" /> {label}
    </label>
    <input 
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-slate-800"
    />
  </div>
);

// Reusable Select Field Component
const SelectField: React.FC<{ 
  label: string; 
  name: string;
  icon: any; 
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
}> = ({ 
  label, 
  name,
  icon: Icon, 
  options,
  value,
  onChange,
  required 
}) => (
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
      <Icon className="w-3 h-3" /> {label}
    </label>
    <select 
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold text-slate-800"
    >
      <option value="">Select {label}...</option>
      {options.length > 0 ? (
        options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))
      ) : (
        <option disabled>No options available</option>
      )}
    </select>
  </div>
)};