export type Role = 'Admin' | 'Manager' | 'Agent' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: Role;
  avatar: string;
  createdAt?: string;
  lastLogin?: string;
  // snake_case aliases returned directly by the backend API
  created_at?: string;
  last_login?: string;
}

export interface DocumentVersion {
  id: string;
  version: number;
  updatedAt: string;
  updatedBy: string;
  changes: string;
}


export type FileType = 'Claim File' | 'Circular' | 'Policy' | 'Billing' | 'Correspondence';
export type FileStatus = 'Active' | 'Checked-out' | 'Settled Claims' | 'Returned';

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
  plate_number?: string;        // <-- ADD (backend returns snake_case)
  branch_id?: string;           // <-- ADD
  department_id?: string;       // <-- ADD
  product_id?: string;  
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
  sum_insured?: number;
  period_of_policy?: string;
  date_of_accident?: string;

  // Product custom fields (JSONB)
  product_custom_fields?: Record<string, unknown>;
  // snake_case aliases returned directly by the backend API
  archive_reference_number?: string;
  physical_placement?: string;
  claim_number?: string;
  policy_number?: string;
  insured_name?: string;
  estimated_loss?: string;
  branch_name?: string;
  department_name?: string;
  product_name?: string;
  cabinet_number?: string;
  drawer_number?: string;
  date_added?: string;
  received_by?: string;
  delivered_by?: string;
  receiver_remark?: string;
  created_at?: string;
  updated_at?: string;
  owner_name?: string;
  file_size?: number;
  file_path?: string;
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
  branchId?: string;
  branchName?: string;
  // snake_case aliases returned directly by the backend API
  branch_id?: string;
  branch_name?: string;
  drawer_assignments?: Array<{
    drawer: string;
    branchId: string;
    branchName?: string;
    branchCode?: string;
  }>;
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
  status: 'Pending' | 'Approved' | 'Returned' | 'Rejected' | 'Overdue';
  claimNumber?: string;
  policyNumber?: string;
  insuredName?: string;
  // snake_case aliases returned directly by the backend API
  request_reference?: string;
  document_title?: string;
  archive_reference_number?: string;
  requester_name?: string;
  requester_email?: string;
  requester_department_name?: string;
  request_date?: string;
  expected_return_date?: string;
  actual_return_date?: string;
  rejection_reason?: string;
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

export interface FacetBucket {
  value: string | number;
  count: number;
  id?: string | null;
  code?: string;
}

export interface Facets {
  by_type: FacetBucket[];
  by_status: FacetBucket[];
  by_branch: FacetBucket[];
  by_accident_year: FacetBucket[];
  ranges: {
    sum_insured_min: number | null;
    sum_insured_max: number | null;
    estimated_loss_min: number | null;
    estimated_loss_max: number | null;
    accident_min: string | null;
    accident_max: string | null;
  };
}

export interface DocumentFilters {
  search?: string;
  type?: string;
  status?: string;
  branch_id?: string;
  department_id?: string;
  product_id?: string;
  claim_number?: string;
  insured_name?: string;
  plate_number?: string;
  date_of_accident_from?: string;
  date_of_accident_to?: string;
  sum_insured_min?: number;
  sum_insured_max?: number;
  estimated_loss_min?: number;
  estimated_loss_max?: number;
  legacy?: 'true' | 'false';
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}