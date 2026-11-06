import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FilePlus, User, Calendar, ArrowRight, FileText, ShieldCheck, Building2,
  Hash, MessageSquare, Package, Lock, Archive, Grid, CheckCircle2, Loader2,
  Copy, CheckCheck, Edit3, Trash2, Search, AlertTriangle, Save
} from 'lucide-react';
import { toast } from 'sonner';
<<<<<<< HEAD
=======
import { getApiErrorDetails } from '../utils/apiError';
>>>>>>> 9b2a11fc6243168849ef3bdc80d020b09aa41860
import { FILE_TYPES } from '../lib/constants';
import { useArchive } from '../context/ArchiveContext';
import { registrationApi, documentApi } from '../services/api';
import { getProductCustomFields } from '../config/productCustomFields';
import { PageHeader, FormInput, FormSelect, SectionCard, Modal } from './ui';

interface Cabinet {
  id: string;
  number: string;
  drawers: string[];
  branchId?: string;
  branchName?: string;
  drawer_assignments?: Array<{
    drawer: string;
    branchId: string;
    branchName: string;
    branchCode: string;
  }>;
}

type Mode = 'add' | 'modify' | 'delete';

export const AddIngestFileForm: React.FC<{ userRole?: string }> = ({ userRole = 'Admin' }) => {
  const [mode, setMode] = useState<Mode>('add');

  if (userRole !== 'Admin' && userRole !== 'File Clerk') {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-950/40 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Only administrators are authorized to manage files.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Document Management"
        subtitle="Add, modify, or remove files from the archive"
        icon={FilePlus}
      />

      {/* Mode Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl w-fit">
        <button onClick={() => setMode('add')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'add' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
          <FilePlus className="w-4 h-4" /> Add New
        </button>
        <button onClick={() => setMode('modify')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'modify' ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
          <Edit3 className="w-4 h-4" /> Modify
        </button>
        <button onClick={() => setMode('delete')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'delete' ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {mode === 'add' && <AddMode />}
          {mode === 'modify' && <ModifyMode />}
          {mode === 'delete' && <DeleteMode />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/* =========================================================================
   MODE 1: ADD NEW
   ========================================================================= */
const AddMode: React.FC = () => {
  const [fileType, setFileType] = useState<typeof FILE_TYPES[number]>('Claim File');
  const [selectedBranchCode, setSelectedBranchCode] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [, setSelectedProductCode] = useState<string>('');
  const [productCustomValues, setProductCustomValues] = useState<Record<string, string>>({});
  const [selectedCabinet, setSelectedCabinet] = useState<string>('');
  const [selectedDrawer, setSelectedDrawer] = useState<string>('');
  const [availableCabinets, setAvailableCabinets] = useState<Cabinet[]>([]);
  const [availableDrawers, setAvailableDrawers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedReference, setGeneratedReference] = useState<string>('');
  const [showReference, setShowReference] = useState(false);
  const [copied, setCopied] = useState(false);

  const [policyFromDate, setPolicyFromDate] = useState('');
  const [policyToDate, setPolicyToDate] = useState('');

  const [formData, setFormData] = useState({
    insuredName: '', policyNumber: '', claimNumber: '', estimatedLoss: '',
    dateAdded: new Date().toISOString().split('T')[0],
    receivedBy: '', deliveredBy: '', receiverRemark: '', title: '',
    sumInsured: '', dateOfAccident: '', plateNumber: '',
  });

<<<<<<< HEAD
  const { branches, products, fetchBranches, fetchProducts, ingestDocument } = useArchive();
=======
  const { branches, products, fetchBranches, fetchDepartments, fetchProducts, ingestDocument } = useArchive();

  useEffect(() => {
    fetchBranches();
    fetchDepartments();
    fetchProducts();
  }, []);
>>>>>>> 9b2a11fc6243168849ef3bdc80d020b09aa41860

  useEffect(() => { fetchBranches(); fetchProducts(); }, []);
  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
      setSelectedBranchCode(branches[0].code);
    }
  }, [branches]);
  useEffect(() => {
    if (selectedProduct && products) {
      const product = products.find(p => p.id === selectedProduct);
      if (product) setSelectedProductCode(product.name.replace(/\s+/g, '').toUpperCase());
    }
  }, [selectedProduct, products]);

  const selectedProductName = products?.find(product => product.id === selectedProduct)?.name;
  const selectedProductFields = getProductCustomFields(selectedProductName);

  useEffect(() => { setProductCustomValues({}); }, [selectedProduct]);

  useEffect(() => {
    if (selectedBranchId) fetchCabinetsByBranch(selectedBranchId);
    else { setAvailableCabinets([]); setSelectedCabinet(''); setSelectedDrawer(''); }
  }, [selectedBranchId]);

  useEffect(() => {
    if (selectedCabinet && selectedBranchId) {
      const cabinet = availableCabinets.find(c => c.id === selectedCabinet);
      if (cabinet && cabinet.drawer_assignments) {
        setAvailableDrawers(cabinet.drawer_assignments.filter(da => da.branchId === selectedBranchId).map(da => da.drawer));
      } else setAvailableDrawers([]);
    } else setAvailableDrawers([]);
    setSelectedDrawer('');
  }, [selectedCabinet, selectedBranchId, availableCabinets]);

  const fetchCabinetsByBranch = async (branchId: string) => {
    try {
      const response = await registrationApi.getCabinets(branchId);
      setAvailableCabinets((response.data || []).filter((c: Cabinet) => c.drawer_assignments?.some(da => da.branchId === branchId)));
    } catch (error) { console.error(error); }
  };

  const formatDateToDisplay = (isoDate: string): string => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  };

  const buildPolicyPeriod = (): string => {
    if (!policyFromDate && !policyToDate) return '';
    if (policyFromDate && policyToDate) return `${formatDateToDisplay(policyFromDate)} - ${formatDateToDisplay(policyToDate)}`;
    return formatDateToDisplay(policyFromDate || policyToDate);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Reference number copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return toast.error('Please select a branch');
    if (fileType === 'Claim File' && !selectedProduct) return toast.error('Please select a product');

    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('type', fileType);
      formDataToSend.append('branchId', selectedBranchId);
      formDataToSend.append('branchCode', selectedBranchCode);
      formDataToSend.append('physicalPlacement', selectedCabinet && selectedDrawer ? `Cabinet ${availableCabinets.find(c => c.id === selectedCabinet)?.number || selectedCabinet} - Drawer ${selectedDrawer}` : 'Temporary Location');
      formDataToSend.append('receivedBy', formData.receivedBy || 'System User');
      formDataToSend.append('deliveredBy', formData.deliveredBy || 'System User');
      formDataToSend.append('plateNumber', formData.plateNumber || '');
      formDataToSend.append('sumInsured', formData.sumInsured || '');
      formDataToSend.append('periodOfPolicy', buildPolicyPeriod());
      formDataToSend.append('dateOfAccident', formData.dateOfAccident || '');

      let title = fileType === 'Claim File' 
        ? ['Claim File', formData.claimNumber, formData.insuredName].filter(Boolean).join(' - ') 
        : formData.title || `${fileType} - ${new Date().toLocaleDateString()}`;
      formDataToSend.append('title', title);
      
      formDataToSend.append('dateAdded', formData.dateAdded);
      formDataToSend.append('receiverRemark', formData.receiverRemark || '');

      if (selectedProduct) {
        formDataToSend.append('productId', selectedProduct);
        formDataToSend.append('productCustomFields', JSON.stringify(productCustomValues));
      }
      if (selectedCabinet) formDataToSend.append('cabinetId', selectedCabinet);
      if (selectedDrawer) formDataToSend.append('drawerNumber', selectedDrawer);
      formDataToSend.append('insuredName', formData.insuredName || '');
      formDataToSend.append('policyNumber', formData.policyNumber || '');
      formDataToSend.append('claimNumber', formData.claimNumber || '');
      formDataToSend.append('estimatedLoss', formData.estimatedLoss || '');

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput?.files?.[0]) formDataToSend.append('file', fileInput.files[0]);

      const response = await ingestDocument(formDataToSend);
      const generatedRef = response?.archive_reference_number || response?.archiveReferenceNumber;
      
      if (generatedRef) {
        setGeneratedReference(generatedRef);
        setShowReference(true);
        toast.success('Document ingested successfully!');
      }

      setFormData({ insuredName: '', policyNumber: '', claimNumber: '', dateAdded: new Date().toISOString().split('T')[0], receivedBy: '', deliveredBy: '', receiverRemark: '', estimatedLoss: '', title: '', sumInsured: '', dateOfAccident: '', plateNumber: '' });
      setPolicyFromDate(''); setPolicyToDate(''); setSelectedCabinet(''); setSelectedDrawer(''); setSelectedProduct(''); setProductCustomValues({});
      if (fileInput) fileInput.value = '';
<<<<<<< HEAD
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to ingest document');
=======
    } catch (error: unknown) {
      const errorMessage = getApiErrorDetails(error).message || 'Failed to ingest document';
      toast.error(errorMessage);
>>>>>>> 9b2a11fc6243168849ef3bdc80d020b09aa41860
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <AnimatePresence>
        {showReference && generatedReference && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-6">
            <div className="bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 rounded-2xl border-2 border-blue-300 dark:border-green-800 p-6 shadow-lg flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Document Ingested!</p>
                </div>
                <p className="text-2xl font-mono font-black text-blue-900 dark:text-green-200">{generatedReference}</p>
              </div>
              <button onClick={() => copyToClipboard(generatedReference)} className="p-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-blue-300 hover:bg-green-100 dark:hover:bg-green-900 transition-colors">
                {copied ? <CheckCheck className="w-6 h-6 text-green-600" /> : <Copy className="w-6 h-6 text-green-600" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect label="Document Type" value={fileType} onChange={(e) => setFileType(e.target.value as typeof FILE_TYPES[number])} required>
            {FILE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </FormSelect>
          <FormSelect label="Branch (Source)" icon={Building2} value={selectedBranchId} onChange={(e) => {
            const branch = branches?.find(b => b.id === e.target.value);
            setSelectedBranchId(e.target.value);
            setSelectedBranchCode(branch?.code || '');
          }} required>
            <option value="">Select a branch...</option>
            {branches?.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
          </FormSelect>
        </div>

        {selectedBranchId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect label="Select File Box" icon={Archive} value={selectedCabinet} onChange={(e) => setSelectedCabinet(e.target.value)}>
              <option value="">Choose File Box...</option>
              {availableCabinets?.map(cabinet => <option key={cabinet.id} value={cabinet.id}>File Box {cabinet.number}</option>)}
            </FormSelect>
            {selectedCabinet && (
              <FormSelect label="Select Drawer" icon={Grid} value={selectedDrawer} onChange={(e) => setSelectedDrawer(e.target.value)}>
                <option value="">Choose drawer...</option>
                {availableDrawers?.map(drawer => <option key={drawer} value={drawer}>Drawer {drawer}</option>)}
              </FormSelect>
            )}
          </div>
        )}

        <div className="h-px bg-slate-100 dark:bg-slate-800" />

        <AnimatePresence mode="wait">
          <motion.div key={fileType} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormSelect label="Product Name" icon={Package} value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} required={fileType === 'Claim File'}>
              <option value="">Select Product...</option>
              {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </FormSelect>

            <FormInput label="Insured Name" icon={User} name="insuredName" placeholder="Full name of insured" value={formData.insuredName} onChange={handleInputChange} required />
            <FormInput label="Claim Number" icon={FileText} name="claimNumber" placeholder="CLM-2026-001" value={formData.claimNumber} onChange={handleInputChange} required />
            <FormInput label="Policy Number" icon={Hash} name="policyNumber" placeholder="POL-123-456" value={formData.policyNumber} onChange={handleInputChange} required />

            {selectedProductFields.map(field => (
              <FormInput key={field.key} label={field.label} icon={Package} name={`product_${field.key}`} type={field.type || 'text'} placeholder={field.placeholder} value={productCustomValues[field.key] || ''} onChange={(e) => setProductCustomValues(values => ({ ...values, [field.key]: e.target.value }))} required={field.required} />
            ))}

            <FormInput label="Sum Insured" icon={ShieldCheck} name="sumInsured" type="number" placeholder="e.g. 5000000" value={formData.sumInsured} onChange={handleInputChange} />
            <FormInput label="Estimated Loss" icon={ShieldCheck} name="estimatedLoss" type="number" placeholder="e.g. 5000000" value={formData.estimatedLoss} onChange={handleInputChange} />

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                <Calendar className="w-3 h-3" /> Period of Policy
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</span>
                  <input type="date" value={policyFromDate} onChange={(e) => setPolicyFromDate(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-slate-800 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</span>
                  <input type="date" value={policyToDate} min={policyFromDate || undefined} onChange={(e) => setPolicyToDate(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-slate-800 dark:text-slate-100" />
                </div>
              </div>
            </div>

            <FormInput label="Date of Accident" icon={Calendar} name="dateOfAccident" type="date" value={formData.dateOfAccident} onChange={handleInputChange} />
            <FormInput label="Date Added" icon={Calendar} name="dateAdded" type="date" value={formData.dateAdded} onChange={handleInputChange} required />
            <FormInput label="Received By" icon={User} name="receivedBy" placeholder="Recipient name" value={formData.receivedBy} onChange={handleInputChange} required />
            <FormInput label="Delivered By" icon={User} name="deliveredBy" placeholder="Sender name" value={formData.deliveredBy} onChange={handleInputChange} required />

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                <MessageSquare className="w-3 h-3" /> Receiver Remarks
              </label>
              <textarea name="receiverRemark" rows={3} placeholder="Any specific observations or notes..." value={formData.receiverRemark} onChange={handleInputChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none font-medium text-slate-800 dark:text-slate-100" />
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-end gap-4 pt-4">
          <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-blue-600 text-white rounded-xl font-black shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50">
            {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <>Complete Ingestion <ArrowRight className="w-5 h-5" /></>}
          </button>
        </div>
      </form>
    </div>
  );
};

/* =========================================================================
   MODE 2: MODIFY
   ========================================================================= */
const ModifyMode: React.FC = () => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State (Mirrors AddMode)
  const [fileType, setFileType] = useState<string>('Claim File');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedBranchCode, setSelectedBranchCode] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [productCustomValues, setProductCustomValues] = useState<Record<string, string>>({});
  const [selectedCabinet, setSelectedCabinet] = useState<string>('');
  const [selectedDrawer, setSelectedDrawer] = useState<string>('');
  const [availableCabinets, setAvailableCabinets] = useState<Cabinet[]>([]);
  const [availableDrawers, setAvailableDrawers] = useState<string[]>([]);
  const [policyFromDate, setPolicyFromDate] = useState('');
  const [policyToDate, setPolicyToDate] = useState('');
  
  const [formData, setFormData] = useState({
    insuredName: '', policyNumber: '', claimNumber: '', estimatedLoss: '',
    dateAdded: '', receivedBy: '', deliveredBy: '', receiverRemark: '', title: '',
    sumInsured: '', dateOfAccident: '', plateNumber: '',
  });

  const { branches, products, fetchBranches, fetchProducts } = useArchive();

  useEffect(() => { fetchBranches(); fetchProducts(); }, []);

  const selectedProductName = products?.find(p => p.id === selectedProduct)?.name;
  const selectedProductFields = getProductCustomFields(selectedProductName);

  useEffect(() => {
    if (selectedCabinet && selectedBranchId) {
      const cabinet = availableCabinets.find(c => c.id === selectedCabinet);
      if (cabinet && cabinet.drawer_assignments) {
        setAvailableDrawers(cabinet.drawer_assignments.filter(da => da.branchId === selectedBranchId).map(da => da.drawer));
      } else setAvailableDrawers([]);
    } else setAvailableDrawers([]);
  }, [selectedCabinet, selectedBranchId, availableCabinets]);

  const fetchCabinetsByBranch = async (branchId: string) => {
    try {
      const response = await registrationApi.getCabinets(branchId);
      setAvailableCabinets((response.data || []).filter((c: Cabinet) => c.drawer_assignments?.some(da => da.branchId === branchId)));
    } catch (error) { console.error(error); }
  };

  // Helper to parse "DD/MM/YYYY - DD/MM/YYYY" back to input[type=date] values
  const parsePolicyPeriod = (period: string) => {
    if (!period) return { from: '', to: '' };
    const parts = period.split(' - ');
    const parse = (s: string) => {
      if (!s) return '';
      const [d, m, y] = s.split('/');
      return (y && m && d) ? `${y}-${m}-${d}` : '';
    };
    return { from: parse(parts[0]), to: parts[1] ? parse(parts[1]) : '' };
  };

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await documentApi.getDocuments({ search, limit: 10 });
        setResults(res.data.documents);
      } catch { /* ignore */ } finally { setIsSearching(false); }
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleSelect = async (doc: any) => {
    setSelectedDoc(doc);
    setSearch('');
    
    // Set Basic State
    setFileType(doc.type || 'Claim File');
    setSelectedBranchId(doc.branch_id || '');
    setSelectedBranchCode(doc.branch_code || '');
    setSelectedProduct(doc.product_id || '');
    setSelectedCabinet(doc.cabinet_id || '');
    setSelectedDrawer(doc.drawer_number || '');
    setProductCustomValues(doc.product_custom_fields || {});
    
    // Parse Dates
    const dates = parsePolicyPeriod(doc.period_of_policy);
    setPolicyFromDate(dates.from);
    setPolicyToDate(dates.to);

    // Set Form Data
    setFormData({
      title: doc.title || '',
      claimNumber: doc.claim_number || '',
      policyNumber: doc.policy_number || '',
      insuredName: doc.insured_name || '',
      sumInsured: doc.sum_insured || '',
      estimatedLoss: doc.estimated_loss || '',
      dateOfAccident: doc.date_of_accident ? doc.date_of_accident.split('T')[0] : '',
      dateAdded: doc.date_added ? doc.date_added.split('T')[0] : '',
      receivedBy: doc.received_by || '',
      deliveredBy: doc.delivered_by || '',
      receiverRemark: doc.receiver_remark || '',
      plateNumber: doc.plate_number || '',
    });

    // Fetch cabinets for dropdown
    if (doc.branch_id) fetchCabinetsByBranch(doc.branch_id);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const formatDateToDisplay = (isoDate: string): string => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  };

  const buildPolicyPeriod = (): string => {
    if (!policyFromDate && !policyToDate) return '';
    if (policyFromDate && policyToDate) return `${formatDateToDisplay(policyFromDate)} - ${formatDateToDisplay(policyToDate)}`;
    return formatDateToDisplay(policyFromDate || policyToDate);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    
    setIsSaving(true);
    try {
      // Calculate which fields were modified
      const currentPeriod = buildPolicyPeriod();
      const fieldsModified: string[] = [];

      if (formData.title !== selectedDoc.title) fieldsModified.push('title');
      if (formData.claimNumber !== (selectedDoc.claim_number || '')) fieldsModified.push('claim_number');
      if (formData.policyNumber !== (selectedDoc.policy_number || '')) fieldsModified.push('policy_number');
      if (formData.insuredName !== (selectedDoc.insured_name || '')) fieldsModified.push('insured_name');
      if (String(formData.sumInsured) !== String(selectedDoc.sum_insured || '')) fieldsModified.push('sum_insured');
      if (String(formData.estimatedLoss) !== String(selectedDoc.estimated_loss || '')) fieldsModified.push('estimated_loss');
      if (formData.dateOfAccident !== (selectedDoc.date_of_accident ? selectedDoc.date_of_accident.split('T')[0] : '')) fieldsModified.push('date_of_accident');
      if (formData.dateAdded !== (selectedDoc.date_added ? selectedDoc.date_added.split('T')[0] : '')) fieldsModified.push('date_added');
      if (formData.receivedBy !== (selectedDoc.received_by || '')) fieldsModified.push('received_by');
      if (formData.deliveredBy !== (selectedDoc.delivered_by || '')) fieldsModified.push('delivered_by');
      if (formData.receiverRemark !== (selectedDoc.receiver_remark || '')) fieldsModified.push('receiver_remark');
      if (formData.plateNumber !== (selectedDoc.plate_number || '')) fieldsModified.push('plate_number');
      if (fileType !== selectedDoc.type) fieldsModified.push('type');
      if (selectedBranchId !== selectedDoc.branch_id) fieldsModified.push('branch_id');
      if (selectedProduct !== selectedDoc.product_id) fieldsModified.push('product_id');
      if (selectedCabinet !== (selectedDoc.cabinet_id || '')) fieldsModified.push('cabinet_id');
      if (selectedDrawer !== (selectedDoc.drawer_number || '')) fieldsModified.push('drawer_number');
      if (currentPeriod !== (selectedDoc.period_of_policy || '')) fieldsModified.push('period_of_policy');
      
      // Deep check for custom fields
      if (JSON.stringify(productCustomValues) !== JSON.stringify(selectedDoc.product_custom_fields || {})) {
        fieldsModified.push('product_custom_fields');
      }

      const payload = {
        ...formData,
        type: fileType,
        branchId: selectedBranchId,
        productId: selectedProduct,
        cabinetId: selectedCabinet || null,
        drawerNumber: selectedDrawer || null,
        periodOfPolicy: currentPeriod,
        productCustomFields: productCustomValues,
        fieldsModified: fieldsModified.length > 0 ? fieldsModified : ['No changes detected'],
        physicalPlacement: selectedCabinet && selectedDrawer 
            ? `Cabinet ${availableCabinets.find(c => c.id === selectedCabinet)?.number || selectedCabinet} - Drawer ${selectedDrawer}`
            : selectedDoc.physical_placement
      };

      await documentApi.updateDocument(selectedDoc.id, payload);
      toast.success('Document updated successfully');
      setSelectedDoc(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update document');
    } finally {
      setIsSaving(false);
    }
  };

  if (selectedDoc) {
    return (
      <SectionCard title={`Modify: ${selectedDoc.archive_reference_number}`} icon={Edit3}>
        <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect label="Document Type" value={fileType} onChange={(e) => setFileType(e.target.value)} required>
              {FILE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </FormSelect>
            <FormSelect label="Branch (Source)" icon={Building2} value={selectedBranchId} onChange={(e) => {
              const branch = branches?.find(b => b.id === e.target.value);
              setSelectedBranchId(e.target.value);
              setSelectedBranchCode(branch?.code || '');
              if (e.target.value) fetchCabinetsByBranch(e.target.value);
            }} required>
              <option value="">Select a branch...</option>
              {branches?.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
            </FormSelect>
          </div>

          {selectedBranchId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect label="Select File Box" icon={Archive} value={selectedCabinet} onChange={(e) => setSelectedCabinet(e.target.value)}>
                <option value="">Choose File Box...</option>
                {availableCabinets?.map(cabinet => <option key={cabinet.id} value={cabinet.id}>File Box {cabinet.number}</option>)}
              </FormSelect>
              {selectedCabinet && (
                <FormSelect label="Select Drawer" icon={Grid} value={selectedDrawer} onChange={(e) => setSelectedDrawer(e.target.value)}>
                  <option value="">Choose drawer...</option>
                  {availableDrawers?.map(drawer => <option key={drawer} value={drawer}>Drawer {drawer}</option>)}
                </FormSelect>
              )}
            </div>
          )}

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormSelect label="Product Name" icon={Package} value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} required={fileType === 'Claim File'}>
              <option value="">Select Product...</option>
              {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </FormSelect>

            <FormInput label="Insured Name" icon={User} name="insuredName" value={formData.insuredName} onChange={handleInputChange} required />
            <FormInput label="Claim Number" icon={FileText} name="claimNumber" value={formData.claimNumber} onChange={handleInputChange} required />
            <FormInput label="Policy Number" icon={Hash} name="policyNumber" value={formData.policyNumber} onChange={handleInputChange} required />

            {selectedProductFields.map(field => (
              <FormInput key={field.key} label={field.label} icon={Package} name={`product_${field.key}`} type={field.type || 'text'} value={productCustomValues[field.key] || ''} onChange={(e) => setProductCustomValues(values => ({ ...values, [field.key]: e.target.value }))} required={field.required} />
            ))}

            <FormInput label="Sum Insured" icon={ShieldCheck} name="sumInsured" type="number" value={formData.sumInsured} onChange={handleInputChange} />
            <FormInput label="Estimated Loss" icon={ShieldCheck} name="estimatedLoss" type="number" value={formData.estimatedLoss} onChange={handleInputChange} />

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                <Calendar className="w-3 h-3" /> Period of Policy
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</span>
                  <input type="date" value={policyFromDate} onChange={(e) => setPolicyFromDate(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none font-medium text-slate-800 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</span>
                  <input type="date" value={policyToDate} min={policyFromDate || undefined} onChange={(e) => setPolicyToDate(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none font-medium text-slate-800 dark:text-slate-100" />
                </div>
              </div>
            </div>

            <FormInput label="Date of Accident" icon={Calendar} name="dateOfAccident" type="date" value={formData.dateOfAccident} onChange={handleInputChange} />
            <FormInput label="Date Added" icon={Calendar} name="dateAdded" type="date" value={formData.dateAdded} onChange={handleInputChange} required />
            <FormInput label="Received By" icon={User} name="receivedBy" value={formData.receivedBy} onChange={handleInputChange} required />
            <FormInput label="Delivered By" icon={User} name="deliveredBy" value={formData.deliveredBy} onChange={handleInputChange} required />
            <FormInput label="Plate Number" icon={Hash} name="plateNumber" value={formData.plateNumber} onChange={handleInputChange} />

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                <MessageSquare className="w-3 h-3" /> Receiver Remarks
              </label>
              <textarea name="receiverRemark" rows={3} value={formData.receiverRemark} onChange={handleInputChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none resize-none font-medium text-slate-800 dark:text-slate-100" />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={() => setSelectedDoc(null)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-8 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
            </button>
          </div>
        </form>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Select a Document to Modify" icon={Search}>
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by archive ref, claim #, or insured name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20"
        />
      </div>
      <div className="mt-6 space-y-2 max-w-xl">
        {isSearching ? <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div> : results.map(doc => (
          <button key={doc.id} onClick={() => handleSelect(doc)} className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-amber-400 hover:bg-amber-50 dark:hover:border-amber-700 dark:hover:bg-amber-950/30 transition-all flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100">{doc.archive_reference_number || doc.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{doc.insured_name} • {doc.type}</p>
            </div>
            <Edit3 className="w-5 h-5 text-amber-500" />
          </button>
        ))}
        {search && !isSearching && results.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No results found.</p>}
      </div>
    </SectionCard>
  );
};

/* =========================================================================
   MODE 3: DELETE
   ========================================================================= */
const DeleteMode: React.FC = () => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await documentApi.getDocuments({ search, limit: 10 });
        setResults(res.data.documents);
      } catch { /* ignore */ } finally { setIsSearching(false); }
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleDelete = async () => {
    if (!selectedDoc) return;
    setIsDeleting(true);
    try {
      await documentApi.deleteDocument(selectedDoc.id);
      toast.success('Document permanently deleted');
      setSelectedDoc(null);
      setShowConfirm(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedDoc) {
    return (
      <SectionCard title="Confirm Deletion" icon={AlertTriangle}>
        <div className="p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl mb-6">
          <h3 className="font-black text-red-800 dark:text-red-400 text-lg mb-2">Warning: This action cannot be undone.</h3>
          <p className="text-red-600 dark:text-red-300 text-sm mb-4">You are about to permanently delete the following document:</p>
          
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-red-100 dark:border-red-900/50 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">{selectedDoc.title}</p>
            <p className="text-sm font-mono text-blue-600 dark:text-blue-400">{selectedDoc.archive_reference_number}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Insured: {selectedDoc.insured_name}</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button onClick={() => setSelectedDoc(null)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl">Cancel</button>
          <button onClick={() => setShowConfirm(true)} className="px-8 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Delete Permanently
          </button>
        </div>

        <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Are you absolutely sure?" size="sm"
          footer={
            <>
              <button onClick={() => setShowConfirm(false)} className="px-4 py-3 font-bold text-slate-500 dark:text-slate-400">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} className="px-4 py-3 bg-red-600 text-white font-bold rounded-xl disabled:opacity-50">
                {isDeleting ? 'Deleting...' : 'Yes, Delete It'}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">This will delete the document and all its version history. This cannot be undone.</p>
        </Modal>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Select a Document to Delete" icon={Trash2}>
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by archive ref, claim #, or insured name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-red-500/20"
        />
      </div>
      <div className="mt-6 space-y-2 max-w-xl">
        {isSearching ? <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-red-500" /></div> : results.map(doc => (
          <button key={doc.id} onClick={() => setSelectedDoc(doc)} className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-red-400 hover:bg-red-50 dark:hover:border-red-700 dark:hover:bg-red-950/30 transition-all flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100">{doc.archive_reference_number || doc.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{doc.insured_name} • {doc.type}</p>
            </div>
            <Trash2 className="w-5 h-5 text-red-400 dark:text-red-500" />
          </button>
        ))}
        {search && !isSearching && results.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No results found.</p>}
      </div>
    </SectionCard>
  );
};