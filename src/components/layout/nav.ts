import {
  TrendingUp, Archive, FileSearch, Building2, Layers, Package, Box, Square,
  FolderOpen, RefreshCcw, UploadCloud, Users, CheckCircle2, Grid,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { UI_LABELS } from '../../lib/constants';

export type AppTab =
  | 'file-request' | 'dashboard' | 'documents' | 'user-management' | 'registration'
  | 'status-update' | 'admin-query' | 'upload' | 'request-management' | 'reports';

export interface SubItem { id: string; label: string; icon: LucideIcon; roles?: string[] }
export interface NavItem {
  id: AppTab;
  label: string;
  icon: LucideIcon;
  /** sidebar section heading ('' = no heading) */
  group: string;
  roles?: string[];
  subItems?: SubItem[];
}

/** Same pages, same role rules as before; only grouped for the new sidebar. */
export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp, group: '' },

  { id: 'documents', label: 'Documents', icon: Archive, group: 'Archive' },
  { id: 'file-request', label: UI_LABELS.SIDEBAR.FILE_REQUEST, icon: FileSearch, group: 'Archive' },
  { id: 'status-update', label: UI_LABELS.SIDEBAR.STATUS_UPDATE, icon: RefreshCcw, group: 'Archive', roles: ['Admin', 'File Clerk'] },
  { id: 'upload', label: UI_LABELS.SIDEBAR.UPLOAD, icon: UploadCloud, group: 'Archive', roles: ['Admin', 'File Clerk'] },

  {
    id: 'registration', label: 'Registration', icon: Building2, group: 'Manage', roles: ['Admin', 'File Clerk'],
    subItems: [
      { id: 'branch', label: 'Branch Registration', icon: Building2, roles: ['Admin'] },
      { id: 'department', label: 'Department', icon: Layers, roles: ['Admin'] },
      { id: 'product', label: 'Product', icon: Package, roles: ['Admin'] },
      { id: 'box', label: 'Box Registration', icon: Box, roles: ['Admin', 'File Clerk'] },
      { id: 'cabinet', label: 'File Box', icon: Archive, roles: ['Admin', 'File Clerk'] },
      { id: 'drawer-assignment', label: 'Drawer Assignment', icon: Square, roles: ['Admin', 'File Clerk'] },
      { id: 'add-to-box', label: 'Add File to Box', icon: FolderOpen, roles: ['Admin', 'File Clerk'] },
    ],
  },
  { id: 'request-management', label: 'Request Management', icon: CheckCircle2, group: 'Manage', roles: ['Admin', 'File Clerk'] },

  { id: 'reports', label: 'Reports', icon: Grid, group: 'Insights and admin', roles: ['Admin', 'File Clerk'] },
  { id: 'user-management', label: 'User Management', icon: Users, group: 'Insights and admin', roles: ['Admin'] },
];

export const canSee = (roles: string[] | undefined, role?: string) => !roles || (!!role && roles.includes(role));
