export type Role = 'Admin' | 'Manager' | 'Agent' | 'Viewer';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
}

export interface DocumentVersion {
  id: string;
  version: number;
  updatedAt: string;
  updatedBy: string;
  changes: string;
}


export type FileType = 'Claim File' | 'Circular' | 'Policy' | 'Billing' | 'Correspondence';
export type FileStatus = 'Active' | 'Checked-out' | 'Settled Claims';

export interface Document {
  id: string;
  archiveReferenceNumber: string;
  physicalPlacement: string;
  title: string;
  type: FileType;
  plateNumber?: string;
  vehicleRegistration?: string;
  make?: string;
  model?: string;
  status: FileStatus;
  createdAt: string;
  owner: string;
  size: string;
  versions: DocumentVersion[];
  
  // New fields for Claim File
  insuredName?: string;
  policyNumber?: string;
  claimNumber?: string;
  estimatedLoss?: string;
  branch?: string;
  department?: string;
  productName?: string;
  cabinetNumber?: string;
  drawerNumber?: string;
  
  // New fields for Circular
  date?: string;
  boxNumber?: string;
  
  // Common for Add/Ingest
  dateAdded?: string;
  receivedBy?: string;
  deliveredBy?: string;
  receiverRemark?: string;
  dateModified?: string;
}

export interface RetentionPolicy {
  id: string;
  category: string;
  duration: string;
  description: string;
  legalRequirement: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  details: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Product {
  id: string;
  name: string;
}

export interface Box {
  id: string;
  identifier: string;
  fileType: FileType;
  branchCode?: string;
  sequenceNumber?: number;
  year?: string;
}

export interface Cabinet {
  id: string;
  number: string;
  drawers: string[];
}

export interface CabinetAssignment {
  id: string;
  cabinetId: string;
  branchId: string;
}

export interface BoxFileAssignment {
  id: string;
  boxFile: string;
  branchId: string;
  productName: string;
}

export interface FileRequest {
  id: string;
  documentId: string;
  requestedBy: string;
  requestDate: string;
  expectedReturnDate: string;
  status: 'Pending' | 'Approved' | 'Returned' | 'Overdue';
  claimNumber?: string;
  policyNumber?: string;
  insuredName?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
  relatedId?: string;
  adminOnly?: boolean;
}