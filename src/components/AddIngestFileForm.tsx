import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FilePlus, User, Calendar, ArrowRight, FileText, ShieldCheck, Building2,
  Hash, MessageSquare, Package, Lock, Archive, Grid, CheckCircle2, Loader2,
  Copy, CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorDetails } from '../utils/apiError';
import { FILE_TYPES } from '../lib/constants';
import { useArchive } from '../context/ArchiveContext';
import { registrationApi } from '../services/api';
import { getProductCustomFields } from '../config/productCustomFields';
import { PageHeader, FormInput, FormSelect } from './ui';

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

export const AddIngestFileForm: React.FC<{ userRole?: string }> = ({ userRole = 'Admin' }) => {
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

  const { branches, products, fetchBranches, fetchDepartments, fetchProducts, ingestDocument } = useArchive();

  useEffect(() => {
    fetchBranches();
    fetchDepartments();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranchId) {
      const defaultBranch = branches[0];
      setSelectedBranchId(defaultBranch.id);
      setSelectedBranchCode(defaultBranch.code);
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
        const branchDrawers = cabinet.drawer_assignments
          .filter(da => da.branchId === selectedBranchId)
          .map(da => da.drawer);
        setAvailableDrawers(branchDrawers);
      } else setAvailableDrawers([]);
    } else setAvailableDrawers([]);
    setSelectedDrawer('');
  }, [selectedCabinet, selectedBranchId, availableCabinets]);

  const fetchCabinetsByBranch = async (branchId: string) => {
    try {
      const response = await registrationApi.getCabinets(branchId);
      const cabinetsWithBranchDrawers = (response.data || []).filter((cabinet: Cabinet) =>
        cabinet.drawer_assignments?.some(da => da.branchId === branchId)
      );
      setAvailableCabinets(cabinetsWithBranchDrawers);
    } catch (error) {
      console.error('Failed to fetch cabinets:', error);
      setAvailableCabinets([]);
    }
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Reference number copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'Admin') { toast.error('Only administrators can ingest files.'); return; }
    if (!selectedBranchId) { toast.error('Please select a branch'); return; }
    if (fileType === 'Claim File' && !selectedProduct) { toast.error('Please select a product for claim file'); return; }

    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('type', fileType);
      formDataToSend.append('branchId', selectedBranchId);
      formDataToSend.append('branchCode', selectedBranchCode);
      formDataToSend.append('physicalPlacement',
        selectedCabinet && selectedDrawer
          ? `Cabinet ${availableCabinets.find(c => c.id === selectedCabinet)?.number || selectedCabinet} - Drawer ${selectedDrawer}`
          : 'Temporary Location'
      );
      formDataToSend.append('receivedBy', formData.receivedBy || 'System User');
      formDataToSend.append('deliveredBy', formData.deliveredBy || 'System User');
      formDataToSend.append('plateNumber', formData.plateNumber || '');
      formDataToSend.append('sumInsured', formData.sumInsured || '');
      formDataToSend.append('periodOfPolicy', buildPolicyPeriod());
      formDataToSend.append('dateOfAccident', formData.dateOfAccident || '');

      let title = '';
      if (fileType === 'Claim File') {
        const parts = ['Claim File'];
        if (formData.claimNumber) parts.push(formData.claimNumber);
        if (formData.insuredName) parts.push(formData.insuredName);
        title = parts.length > 1 ? parts.join(' - ') : `Claim File - ${new Date().toLocaleDateString()}`;
      } else {
        title = formData.title || `${fileType} - ${new Date().toLocaleDateString()}`;
      }
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
        toast.success(
          <div>
            <p className="font-bold">Document ingested successfully!</p>
            <p className="text-xs font-mono mt-1">Ref: {generatedRef}</p>
          </div>
        );
      }

      setFormData({
        insuredName: '', policyNumber: '', claimNumber: '',
        dateAdded: new Date().toISOString().split('T')[0],
        receivedBy: '', deliveredBy: '', receiverRemark: '', estimatedLoss: '',
        title: '', sumInsured: '', dateOfAccident: '', plateNumber: '',
      });
      setPolicyFromDate('');
      setPolicyToDate('');
      setSelectedCabinet('');
      setSelectedDrawer('');
      setSelectedProduct('');
      setProductCustomValues({});
      if (fileInput) fileInput.value = '';
    } catch (error: unknown) {
      const errorMessage = getApiErrorDetails(error).message || 'Failed to ingest document';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      insuredName: '', policyNumber: '', claimNumber: '',
      dateAdded: new Date().toISOString().split('T')[0],
      receivedBy: '', deliveredBy: '', receiverRemark: '', estimatedLoss: '',
      title: '', sumInsured: '', dateOfAccident: '', plateNumber: '',
    });
    setPolicyFromDate('');
    setPolicyToDate('');
    setSelectedBranchId(branches?.[0]?.id || '');
    setSelectedBranchCode(branches?.[0]?.code || '');
    setSelectedCabinet('');
    setSelectedDrawer('');
    setSelectedProduct('');
    setSelectedProductCode('');
    setProductCustomValues({});
    setFileType('Claim File');
    setShowReference(false);
    setGeneratedReference('');
  };

  if (userRole !== 'Admin') {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-950/40 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Only administrators are authorized to add or ingest files into the archive.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Ingest New Document"
        subtitle="Standardize and archive insurance assets with full traceability"
        icon={FilePlus}
      />

      {/* Reference success banner */}
      <AnimatePresence>
        {showReference && generatedReference && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 rounded-2xl border-2 border-blue-300 dark:border-green-800 p-6 shadow-lg">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      Document Ingested Successfully!
                    </p>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">Your file reference number is:</p>
                  <p className="text-2xl md:text-3xl font-mono font-black text-blue-900 dark:text-green-200 break-all bg-white dark:bg-slate-900 p-4 rounded-lg border border-blue-200 dark:border-green-800">
                    {generatedReference}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedReference)}
                  className="p-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-blue-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-950/40 transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <CheckCheck className="w-6 h-6 text-green-600" /> : <Copy className="w-6 h-6 text-green-600" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                label="Document Type"
                value={fileType}
                onChange={(e) => setFileType(e.target.value as typeof FILE_TYPES[number])}
                required
              >
                {FILE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </FormSelect>

              <FormSelect
                label="Branch (Source)"
                icon={Building2}
                value={selectedBranchId}
                onChange={(e) => {
                  const branch = branches?.find(b => b.id === e.target.value);
                  setSelectedBranchId(e.target.value);
                  setSelectedBranchCode(branch?.code || '');
                }}
                required
              >
                <option value="">Select a branch...</option>
                {branches?.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
              </FormSelect>
            </div>

            {selectedBranchId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormSelect
                  label="Select File Box"
                  icon={Archive}
                  value={selectedCabinet}
                  onChange={(e) => setSelectedCabinet(e.target.value)}
                >
                  <option value="">Choose File Box...</option>
                  {availableCabinets?.map(cabinet => (
                    <option key={cabinet.id} value={cabinet.id}>File Box {cabinet.number}</option>
                  ))}
                </FormSelect>
                {selectedCabinet && (
                  <FormSelect
                    label="Select Drawer"
                    icon={Grid}
                    value={selectedDrawer}
                    onChange={(e) => setSelectedDrawer(e.target.value)}
                  >
                    <option value="">Choose drawer...</option>
                    {availableDrawers?.map(drawer => (
                      <option key={drawer} value={drawer}>Drawer {drawer}</option>
                    ))}
                  </FormSelect>
                )}
              </div>
            )}

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <AnimatePresence mode="wait">
              <motion.div
                key={fileType}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <FormSelect
                  label="Product Name"
                  icon={Package}
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  required={fileType === 'Claim File'}
                >
                  <option value="">Select Product...</option>
                  {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </FormSelect>

                <FormInput label="Insured Name" icon={User} name="insuredName" placeholder="Full name of insured" value={formData.insuredName} onChange={handleInputChange} required />
                <FormInput label="Claim Number" icon={FileText} name="claimNumber" placeholder="CLM-2026-001" value={formData.claimNumber} onChange={handleInputChange} required />
                <FormInput label="Policy Number" icon={Hash} name="policyNumber" placeholder="POL-123-456" value={formData.policyNumber} onChange={handleInputChange} required />

                {selectedProductFields.map(field => (
                  <FormInput
                    key={field.key}
                    label={field.label}
                    icon={Package}
                    name={`product_${field.key}`}
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    value={productCustomValues[field.key] || ''}
                    onChange={(e) => setProductCustomValues(values => ({ ...values, [field.key]: e.target.value }))}
                    required={field.required}
                  />
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
                      <input type="date" value={policyFromDate} onChange={(e) => setPolicyFromDate(e.target.value)}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-slate-800 dark:text-slate-100" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</span>
                      <input type="date" value={policyToDate} min={policyFromDate || undefined} onChange={(e) => setPolicyToDate(e.target.value)}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-slate-800 dark:text-slate-100" />
                    </div>
                  </div>
                  {buildPolicyPeriod() && (
                    <div className="mt-3 flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-lg border border-blue-200 dark:border-blue-900">
                      <div>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Policy Period Preview</p>
                        <p className="text-base font-mono font-black text-blue-900 dark:text-blue-200 mt-0.5">{buildPolicyPeriod()}</p>
                      </div>
                      <Calendar className="w-5 h-5 text-blue-400" />
                    </div>
                  )}
                </div>

                <FormInput label="Date of Accident" icon={Calendar} name="dateOfAccident" type="date" value={formData.dateOfAccident} onChange={handleInputChange} />
                <FormInput label="Date Added" icon={Calendar} name="dateAdded" type="date" value={formData.dateAdded} onChange={handleInputChange} required />
                <FormInput label="Received By" icon={User} name="receivedBy" placeholder="Recipient name" value={formData.receivedBy} onChange={handleInputChange} required />
                <FormInput label="Delivered By" icon={User} name="deliveredBy" placeholder="Sender name" value={formData.deliveredBy} onChange={handleInputChange} required />

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    <MessageSquare className="w-3 h-3" /> Receiver Remarks
                  </label>
                  <textarea
                    name="receiverRemark" rows={3} placeholder="Any specific observations or notes..."
                    value={formData.receiverRemark} onChange={handleInputChange}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-end gap-4 pt-4">
              <button type="button" onClick={resetForm}
                className="px-6 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                Reset
              </button>
              <button type="submit" disabled={isSubmitting}
                className="px-10 py-4 bg-blue-600 text-white rounded-xl font-black shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  <>Complete Ingestion <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};