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
  CheckCircle2,
  Loader2,
  Copy,
  CheckCheck
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
  drawer_assignments?: Array<{
    drawer: string;
    branchId: string;
    branchName: string;
    branchCode: string;
  }>;
}

interface Product {
  id: string;
  name: string;
}

export const AddIngestFileForm: React.FC<{ userRole?: string }> = ({ userRole = 'Admin' }) => {
  const [fileType, setFileType] = useState<typeof FILE_TYPES[number]>('Claim File');
  const [selectedBranchCode, setSelectedBranchCode] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedProductCode, setSelectedProductCode] = useState<string>('');
  const [selectedCabinet, setSelectedCabinet] = useState<string>('');
  const [selectedDrawer, setSelectedDrawer] = useState<string>('');
  const [availableCabinets, setAvailableCabinets] = useState<Cabinet[]>([]);
  const [availableDrawers, setAvailableDrawers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedReference, setGeneratedReference] = useState<string>('');
  const [showReference, setShowReference] = useState(false);
  const [copied, setCopied] = useState(false);
  
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

  // Load initial data
  useEffect(() => {
    fetchBranches();
    fetchDepartments();
    fetchProducts();
  }, []);

  // Set default branch when branches load
  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranchId) {
      const defaultBranch = branches[0];
      setSelectedBranchId(defaultBranch.id);
      setSelectedBranchCode(defaultBranch.code);
    }
  }, [branches]);

  // Update product code when product is selected
  useEffect(() => {
    if (selectedProduct && products) {
      const product = products.find(p => p.id === selectedProduct);
      if (product) {
        // Generate full product code (remove spaces, uppercase)
        const productCode = product.name.replace(/\s+/g, '').toUpperCase();
        setSelectedProductCode(productCode);
      }
    }
  }, [selectedProduct, products]);

  // Fetch cabinets assigned to the selected branch
  useEffect(() => {
    if (selectedBranchId) {
      fetchCabinetsByBranch(selectedBranchId);
    } else {
      setAvailableCabinets([]);
      setSelectedCabinet('');
      setSelectedDrawer('');
    }
  }, [selectedBranchId]);

  // When cabinet is selected, filter drawers assigned to the selected branch
  useEffect(() => {
    if (selectedCabinet && selectedBranchId) {
      const cabinet = availableCabinets.find(c => c.id === selectedCabinet);
      if (cabinet && cabinet.drawer_assignments) {
        // Filter drawers assigned to the selected branch
        const branchDrawers = cabinet.drawer_assignments
          .filter(da => da.branchId === selectedBranchId)
          .map(da => da.drawer);
        setAvailableDrawers(branchDrawers);
      } else {
        setAvailableDrawers([]);
      }
    } else {
      setAvailableDrawers([]);
    }
    setSelectedDrawer('');
  }, [selectedCabinet, selectedBranchId, availableCabinets]);

  const fetchCabinetsByBranch = async (branchId: string) => {
    try {
      const response = await registrationApi.getCabinets(branchId);
      // Filter cabinets that have drawers assigned to this branch
      const cabinetsWithBranchDrawers = (response.data || []).filter((cabinet: Cabinet) => 
        cabinet.drawer_assignments?.some(da => da.branchId === branchId)
      );
      setAvailableCabinets(cabinetsWithBranchDrawers);
    } catch (error) {
      console.error('Failed to fetch cabinets:', error);
      setAvailableCabinets([]);
    }
  };

  // This function now only formats a preview - actual generation happens on backend
  const getReferencePreview = (): string => {
    if (!selectedBranchCode || !selectedProductCode) return '';
    const year = new Date().getFullYear().toString().slice(-2);
    return `FL/${selectedBranchCode}/${selectedProductCode}/######/${year}`;
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
      
      // Title
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
      
      // File is optional
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput?.files?.[0]) {
        formDataToSend.append('file', fileInput.files[0]);
      }

      const response = await ingestDocument(formDataToSend);
      
      // Display the generated reference from backend
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
      
      // Clear file input if it exists
      if (fileInput) {
        fileInput.value = '';
      }
      
    } catch (error: any) {
      console.error('Ingest error:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to ingest document';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
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
    setSelectedBranchId(branches?.[0]?.id || '');
    setSelectedBranchCode(branches?.[0]?.code || '');
    setSelectedCabinet('');
    setSelectedDrawer('');
    setSelectedProduct('');
    setSelectedProductCode('');
    setFileType('Claim File');
    setShowReference(false);
    setGeneratedReference('');
  };

  if (userRole !== 'Admin') {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-500 font-medium">Only administrators are authorized to add or ingest files into the archive.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-black tracking-tight mb-2">Ingest New Document</h2>
            <p className="text-slate-400 font-medium">Standardize and archive insurance assets with full traceability.</p>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <FilePlus size={120} />
          </div>
        </div>

        {/* Reference Number Display - Shown after successful ingestion */}
        <AnimatePresence>
          {showReference && generatedReference && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-8 pt-6"
            >
              <div className="bg-green-50 rounded-xl border border-green-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">
                      File Reference Number
                    </p>
                    <p className="text-2xl font-mono font-black text-green-900">
                      {generatedReference}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(generatedReference)}
                    className="p-3 bg-white rounded-xl border border-green-200 hover:bg-green-100 transition-colors group"
                  >
                    {copied ? (
                      <CheckCheck className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-green-600" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  This reference number has been generated and saved to the system.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="space-y-8">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Document Type
                </label>
                <select 
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as typeof FILE_TYPES[number])}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  required
                >
                  {FILE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <Building2 className="w-3 h-3" /> Branch (Source)
                </label>
                <select 
                  value={selectedBranchId}
                  onChange={(e) => {
                    const branch = branches?.find(b => b.id === e.target.value);
                    setSelectedBranchId(e.target.value);
                    setSelectedBranchCode(branch?.code || '');
                  }}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  required
                >
                  <option value="">Select a branch...</option>
                  {branches?.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
            </div>
{selectedBranchCode && selectedProductCode && (
  <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-md">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
        <FileText className="w-4 h-4 text-white" />
      </div>
      <p className="text-sm font-bold text-blue-800 uppercase tracking-wider">
        File Reference Number Preview
      </p>
    </div>
    
    <div className="bg-white p-4 rounded-lg border border-blue-100 mb-3">
      <p className="text-2xl font-mono font-black text-blue-900 break-all text-center">
        FL/{selectedBranchCode}/{selectedProductCode}/<span className="text-green-600">000001</span>/{new Date().getFullYear().toString().slice(-2)}
      </p>
    </div>
    
    <div className="grid grid-cols-2 gap-4 text-xs">
      <div className="p-2 bg-blue-50 rounded">
        <span className="font-bold text-blue-700">Branch Code:</span>
        <span className="ml-2 font-mono">{selectedBranchCode}</span>
      </div>
      <div className="p-2 bg-blue-50 rounded">
        <span className="font-bold text-blue-700">Product Code:</span>
        <span className="ml-2 font-mono">{selectedProductCode}</span>
      </div>
      <div className="p-2 bg-green-50 rounded">
        <span className="font-bold text-green-700">Sequence:</span>
        <span className="ml-2 font-mono">000001 (auto-increments)</span>
      </div>
      <div className="p-2 bg-purple-50 rounded">
        <span className="font-bold text-purple-700">Year:</span>
        <span className="ml-2 font-mono">{new Date().getFullYear().toString().slice(-2)}</span>
      </div>
    </div>
    
    <p className="text-xs text-slate-500 mt-3 text-center italic">
      The sequence number will be automatically generated when you submit the form
    </p>
  </div>
)}

{showReference && generatedReference && (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="mb-6"
  >
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-sm font-bold text-green-700 uppercase tracking-wider">
              Document Ingested Successfully!
            </p>
          </div>
          <p className="text-xs text-green-600 mb-3">Your file reference number is:</p>
          <p className="text-3xl font-mono font-black text-green-900 break-all bg-white p-4 rounded-lg border border-green-200">
            {generatedReference}
          </p>
        </div>
        <button
          onClick={() => copyToClipboard(generatedReference)}
          className="p-4 bg-white rounded-xl border-2 border-green-300 hover:bg-green-100 transition-colors group"
          title="Copy to clipboard"
        >
          {copied ? (
            <CheckCheck className="w-6 h-6 text-green-600" />
          ) : (
            <Copy className="w-6 h-6 text-green-600" />
          )}
        </button>
      </div>
      <div className="mt-4 flex gap-2 text-xs">
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">Branch: {generatedReference.split('/')[1]}</span>
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">Product: {generatedReference.split('/')[2]}</span>
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">Seq: {generatedReference.split('/')[3]}</span>
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">Year: {generatedReference.split('/')[4]}</span>
      </div>
    </div>
  </motion.div>
)}

            {/* Cabinet and Drawer Selection */}
            {selectedBranchId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Archive className="w-3 h-3" /> Select Cabinet
                  </label>
                  <select
                    value={selectedCabinet}
                    onChange={(e) => setSelectedCabinet(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  >
                    <option value="">Choose cabinet...</option>
                    {availableCabinets?.map(cabinet => (
                      <option key={cabinet.id} value={cabinet.id}>
                        Cabinet {cabinet.number}
                      </option>
                    ))}
                  </select>
                  {availableCabinets.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No cabinets with drawers assigned to this branch
                    </p>
                  )}
                </div>

                {selectedCabinet && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <Grid className="w-3 h-3" /> Select Drawer
                    </label>
                    <select
                      value={selectedDrawer}
                      onChange={(e) => setSelectedDrawer(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    >
                      <option value="">Choose drawer...</option>
                      {availableDrawers?.map(drawer => (
                        <option key={drawer} value={drawer}>
                          Drawer {drawer}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="h-px bg-slate-100" />

            {/* Dynamic Fields based on File Type */}
            <AnimatePresence mode="wait">
              <motion.div
                key={fileType}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {fileType === 'Claim File' && (
                  <>
                    <InputField 
                      label="Insured Name" 
                      name="insuredName"
                      icon={User} 
                      placeholder="Full name of insured"
                      value={formData.insuredName}
                      onChange={handleInputChange}
                      required
                    />
                    <InputField 
                      label="Policy Number" 
                      name="policyNumber"
                      icon={Hash} 
                      placeholder="POL-123-456"
                      value={formData.policyNumber}
                      onChange={handleInputChange}
                      required
                    />
                    <InputField 
                      label="Claim Number" 
                      name="claimNumber"
                      icon={FileText} 
                      placeholder="CLM-2024-001"
                      value={formData.claimNumber}
                      onChange={handleInputChange}
                      required
                    />
                    <InputField 
                      label="Estimated Loss" 
                      name="estimatedLoss"
                      icon={ShieldCheck} 
                      placeholder="e.g. 5,000,000 NGN"
                      value={formData.estimatedLoss}
                      onChange={handleInputChange}
                    />
                    
                    <SelectField 
                      label="Department" 
                      name="departmentId"
                      icon={Building2} 
                      options={departments?.map(d => ({ value: d.id, label: d.name })) || []} 
                    />
                    
                    <SelectField 
                      label="Product Name" 
                      name="productId"
                      icon={Package} 
                      options={products?.map(p => ({ value: p.id, label: p.name })) || []}
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                      required
                    />

                    {/* Vehicle Information */}
                    <InputField 
                      label="Plate Number" 
                      name="plateNumber"
                      icon={Hash} 
                      placeholder="ABC-123-XY"
                      value={formData.plateNumber}
                      onChange={handleInputChange}
                    />
                    <InputField 
                      label="Vehicle Registration" 
                      name="vehicleRegistration"
                      icon={FileText} 
                      placeholder="Registration number"
                      value={formData.vehicleRegistration}
                      onChange={handleInputChange}
                    />
                    <InputField 
                      label="Make" 
                      name="make"
                      icon={Building2} 
                      placeholder="e.g. Toyota"
                      value={formData.make}
                      onChange={handleInputChange}
                    />
                    <InputField 
                      label="Model" 
                      name="model"
                      icon={Building2} 
                      placeholder="e.g. Corolla"
                      value={formData.model}
                      onChange={handleInputChange}
                    />
                  </>
                )}

                {fileType === 'Circular' && (
                  <>
                    <InputField 
                      label="Title" 
                      name="title"
                      icon={FileText} 
                      placeholder="Circular Title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                    />
                    <InputField 
                      label="Date" 
                      name="circularDate"
                      icon={Calendar} 
                      type="date" 
                      value={formData.dateAdded}
                      onChange={handleInputChange}
                    />
                  </>
                )}

                {/* Common Fields */}
                <InputField 
                  label="Date Added" 
                  name="dateAdded"
                  icon={Calendar} 
                  type="date" 
                  value={formData.dateAdded}
                  onChange={handleInputChange}
                  required
                />
                <InputField 
                  label="Received By" 
                  name="receivedBy"
                  icon={User} 
                  placeholder="Recipient name"
                  value={formData.receivedBy}
                  onChange={handleInputChange}
                  required
                />
                <InputField 
                  label="Delivered By" 
                  name="deliveredBy"
                  icon={User} 
                  placeholder="Sender name"
                  value={formData.deliveredBy}
                  onChange={handleInputChange}
                  required
                />
                
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <MessageSquare className="w-3 h-3" /> Receiver Remarks
                  </label>
                  <textarea 
                    name="receiverRemark"
                    rows={3}
                    placeholder="Any specific observations or notes..."
                    value={formData.receiverRemark}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none font-medium"
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Physical Location Summary */}
            {selectedCabinet && selectedDrawer && (
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-bold text-green-600 uppercase tracking-wider">
                    Physical Location
                  </span>
                </div>
                <p className="text-sm text-green-800 font-medium">
                  Cabinet {availableCabinets.find(c => c.id === selectedCabinet)?.number} • 
                  Drawer {selectedDrawer}
                </p>
              </div>
            )}

            <div className="h-px bg-slate-100" />

            {/* Document Upload - Optional */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Document Attachment (Optional)
              </label>
              <DocumentUploader />
              <p className="text-xs text-slate-400 mt-1">
                Uploading a soft copy is optional. You can still ingest the file without an attachment.
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4">
              <button 
                type="button"
                onClick={resetForm}
                className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
              >
                Reset
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="px-10 py-4 bg-blue-600 text-white rounded-xl font-black shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Complete Ingestion <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Input Field Component
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
      value={value || ''}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-slate-800"
    />
  </div>
);

// Select Field Component
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
      value={value || ''}
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
);