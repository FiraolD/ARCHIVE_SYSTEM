// src/services/api.ts
import axios from 'axios';

// ⚠️ Desktop app: backend ALWAYS runs on localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000/api';

console.log('[api.ts] API_URL =', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ==================== INTERCEPTORS ====================

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK') {
      console.error(`❌ Cannot connect to backend at ${API_URL}`);
    } else if (error.response) {
      console.error(`❌ API error ${error.response.status} at ${error.config?.url}`, error.response.data);
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: object) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
};

// ==================== USERS ====================

export const userApi = {
  getUsers: () => api.get('/users'),
  getUser: (id: string) => api.get(`/users/${id}`),
  createUser: (data: object) => api.post('/users', data),
  updateUser: (id: string, data: object) => api.patch(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
};

// ==================== DOCUMENTS ====================

export const documentApi = {
  getDocuments: (params?: Record<string, unknown>) => api.get('/documents', { params }),
  getDocument: (id: string) => api.get(`/documents/${id}`),
  ingestDocument: (formData: FormData) =>
    api.post('/documents/ingest', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateStatus: (id: string, status: string) =>
    api.patch(`/documents/${id}/status`, { status }),
  updatePlacement: (id: string, physicalPlacement: string) =>
    api.patch(`/documents/${id}/placement`, { physicalPlacement }),
  assignToBox: (data: { documentId: string; boxId: string }) =>
    api.post('/documents/assign-to-box', data),
  searchByCustomField: (key: string, value: string) =>
    api.get('/documents/search/custom-field', { params: { key, value } }),
};

// ==================== FILE REQUESTS ====================

export const requestApi = {
  createRequest: (data: object) => api.post('/requests', data),
  getMyRequests: () => api.get('/requests/my-requests'),
  getPendingRequests: () => api.get('/requests/pending'),
  getAllRequests: (params?: Record<string, unknown>) => api.get('/requests/all', { params }),
  approveRequest: (id: string) => api.patch(`/requests/${id}/approve`),
  rejectRequest: (id: string, data: { reason: string }) =>
    api.patch(`/requests/${id}/reject`, data),
  returnDocument: (id: string) => api.patch(`/requests/${id}/return`),
  returnByRequester: (id: string) =>
    api.patch(`/requests/${id}/return-by-requester`),
  getByReference: (reference: string) =>
    api.get(`/requests/reference/${reference}`),
};

// ==================== REGISTRATION ====================

export const registrationApi = {
  // Branches
  getBranches: () => api.get('/registration/branches'),
  createBranch: (data: { name: string; code: string }) =>
    api.post('/registration/branches', data),

  // Departments
  getDepartments: () => api.get('/registration/departments'),
  createDepartment: (data: { name: string; code: string }) =>
    api.post('/registration/departments', data),

  // Products
  getProducts: () => api.get('/registration/products'),
  createProduct: (data: { name: string; code?: string }) =>
    api.post('/registration/products', data),
  getProductCustomFields: (productId: string) =>
    api.get(`/registration/products/${productId}/fields`),

  // Boxes
  getBoxes: () => api.get('/registration/boxes'),
  createBox: (data: { branchCode: string; fileType: string }) =>
    api.post('/registration/boxes', data),

  // Cabinets (called "File Boxes" in some UI)
  getCabinets: (branchId?: string) =>
    api.get(branchId ? `/registration/cabinets?branchId=${branchId}` : '/registration/cabinets'),
  createCabinet: (data: { number: string; drawers: string[] }) =>
    api.post('/registration/cabinets', data),

  // Drawer assignments
  assignDrawer: (data: { cabinetId: string; branchId: string; drawerNumber: string }) =>
    api.post('/registration/assign-drawer', data),
  getDrawerAssignments: () => api.get('/registration/drawer-assignments'),
  getDrawerHistory: (cabinetId: string, drawerNumber: string) =>
    api.get('/registration/drawer-history', { params: { cabinetId, drawerNumber } }),

  // Cabinet assignment to branch
  assignCabinet: (data: { cabinetId: string; branchId: string }) =>
    api.post('/registration/assign-cabinet', data),

  // Box assignments
  assignBox: (data: { boxId: string; cabinetId: string; drawerNumber: string }) =>
    api.post('/registration/assign-box', data),
};

// ==================== NOTIFICATIONS ====================

export const notificationApi = {
  getNotifications: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread/count'),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

// ==================== DASHBOARD ====================

export const dashboardApi = {
  getStats: () => api.get('/dashboard'),
};

// ==================== REPORTS ====================

export const reportsApi = {
  getStats: (params?: Record<string, unknown>) => api.get('/reports/stats', { params }),
  getGeneratedReports: () => api.get('/reports/generated'),
  generateReport: (data: { type: string; format?: string; dateRange?: string }) =>
    api.post('/reports/generate', data),
  generateMonthlyReport: (data: { format?: string; month?: string }) =>
    api.post('/reports/generate/monthly', data),
  downloadReport: (id: string) =>
    api.get(`/reports/download/${id}`, { responseType: 'blob' }),
  deleteReport: (id: string) => api.delete(`/reports/${id}`),
};

// ==================== ADMIN ====================

export const adminApi = {
  executeQuery: (sql: string, allowWrite: boolean = false) =>
    api.post('/admin/query', { sql, allowWrite }),
};

// ==================== AUDIT ====================

export const auditApi = {
  getLogs: (params?: Record<string, unknown>) => api.get('/audit/logs', { params }),
  getUserLogs: (userId: string) => api.get(`/audit/logs/user/${userId}`),
  getDocumentLogs: (documentId: string) => api.get(`/audit/logs/document/${documentId}`),
  getStats: () => api.get('/audit/stats'),
};
export const boxApi = {
  list:   (params?: { search?: string }) => api.get('/boxes', { params }),
  get:    (id: string)                    => api.get(`/boxes/${id}`),
  updateStatus: (id: string, status: string, note?: string) =>
    api.patch(`/boxes/${id}/status`, { status, note }),
  removeDocument: (boxId: string, documentId: string) =>
    api.delete(`/boxes/${boxId}/documents/${documentId}`),
};
export default api;