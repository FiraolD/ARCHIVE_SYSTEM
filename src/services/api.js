 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// src/services/api.ts
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
      console.error(`❌ API error ${error.response.status} at ${_optionalChain([error, 'access', _ => _.config, 'optionalAccess', _2 => _2.url])}`, error.response.data);
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================

export const authApi = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
};

// ==================== USERS ====================

export const userApi = {
  getUsers: () => api.get('/users'),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.patch(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// ==================== DOCUMENTS ====================

export const documentApi = {
  getDocuments: (params) => api.get('/documents', { params }),
  getDocument: (id) => api.get(`/documents/${id}`),
  ingestDocument: (formData) =>
    api.post('/documents/ingest', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateStatus: (id, status) =>
    api.patch(`/documents/${id}/status`, { status }),
  updatePlacement: (id, physicalPlacement) =>
    api.patch(`/documents/${id}/placement`, { physicalPlacement }),
  assignToBox: (data) =>
    api.post('/documents/assign-to-box', data),
  searchByCustomField: (key, value) =>
    api.get('/documents/search/custom-field', { params: { key, value } }),
};

// ==================== FILE REQUESTS ====================

export const requestApi = {
  createRequest: (data) => api.post('/requests', data),
  getMyRequests: () => api.get('/requests/my-requests'),
  getPendingRequests: () => api.get('/requests/pending'),
  getAllRequests: (params) => api.get('/requests/all', { params }),
  approveRequest: (id) => api.patch(`/requests/${id}/approve`),
  rejectRequest: (id, data) =>
    api.patch(`/requests/${id}/reject`, data),
  returnDocument: (id) => api.patch(`/requests/${id}/return`),
  returnByRequester: (id) =>
    api.patch(`/requests/${id}/return-by-requester`),
  getByReference: (reference) =>
    api.get(`/requests/reference/${reference}`),
};

// ==================== REGISTRATION ====================

export const registrationApi = {
  // Branches
  getBranches: () => api.get('/registration/branches'),
  createBranch: (data) =>
    api.post('/registration/branches', data),

  // Departments
  getDepartments: () => api.get('/registration/departments'),
  createDepartment: (data) =>
    api.post('/registration/departments', data),

  // Products
  getProducts: () => api.get('/registration/products'),
  createProduct: (data) =>
    api.post('/registration/products', data),
  getProductCustomFields: (productId) =>
    api.get(`/registration/products/${productId}/fields`),

  // Boxes
  getBoxes: () => api.get('/registration/boxes'),
  createBox: (data) =>
    api.post('/registration/boxes', data),

  // Cabinets (called "File Boxes" in some UI)
  getCabinets: (branchId) =>
    api.get(branchId ? `/registration/cabinets?branchId=${branchId}` : '/registration/cabinets'),
  createCabinet: (data) =>
    api.post('/registration/cabinets', data),

  // Drawer assignments
  assignDrawer: (data) =>
    api.post('/registration/assign-drawer', data),
  getDrawerAssignments: () => api.get('/registration/drawer-assignments'),
  getDrawerHistory: (cabinetId, drawerNumber) =>
    api.get('/registration/drawer-history', { params: { cabinetId, drawerNumber } }),

  // Cabinet assignment to branch
  assignCabinet: (data) =>
    api.post('/registration/assign-cabinet', data),

  // Box assignments
  assignBox: (data) =>
    api.post('/registration/assign-box', data),
};

// ==================== NOTIFICATIONS ====================

export const notificationApi = {
  getNotifications: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread/count'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

// ==================== DASHBOARD ====================

export const dashboardApi = {
  getStats: () => api.get('/dashboard'),
};

// ==================== REPORTS ====================

export const reportsApi = {
  getStats: (params) => api.get('/reports/stats', { params }),
  getGeneratedReports: () => api.get('/reports/generated'),
  generateReport: (data) =>
    api.post('/reports/generate', data),
  generateMonthlyReport: (data) =>
    api.post('/reports/generate/monthly', data),
  downloadReport: (id) =>
    api.get(`/reports/download/${id}`, { responseType: 'blob' }),
  deleteReport: (id) => api.delete(`/reports/${id}`),
};

// ==================== ADMIN ====================

export const adminApi = {
  executeQuery: (sql, allowWrite = false) =>
    api.post('/admin/query', { sql, allowWrite }),
};

// ==================== AUDIT ====================

export const auditApi = {
  getLogs: (params) => api.get('/audit/logs', { params }),
  getUserLogs: (userId) => api.get(`/audit/logs/user/${userId}`),
  getDocumentLogs: (documentId) => api.get(`/audit/logs/document/${documentId}`),
  getStats: () => api.get('/audit/stats'),
};
export const boxApi = {
  list:   (params) => api.get('/boxes', { params }),
  get:    (id)                    => api.get(`/boxes/${id}`),
  updateStatus: (id, status, note) =>
    api.patch(`/boxes/${id}/status`, { status, note }),
  removeDocument: (boxId, documentId) =>
    api.delete(`/boxes/${boxId}/documents/${documentId}`),
};
export default api;