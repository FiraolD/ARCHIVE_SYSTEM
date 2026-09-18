import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - propagate errors without leaking payload data
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);
// Auth API
export const authApi = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  getProfile: () => 
    api.get('/auth/profile'),
};

// User API - ADD THIS SECTION
export const userApi = {
  getUsers: () => 
    api.get('/users'),
  getUser: (id) => 
    api.get(`/users/${id}`),
  createUser: (userData) => 
    api.post('/users', userData),
  updateUser: (id, userData) => 
    api.patch(`/users/${id}`, userData),
  deleteUser: (id) => 
    api.delete(`/users/${id}`),
};


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
  
  // This should match the backend route
  assignToBox: (data) => 
    api.post('/documents/assign-to-box', data), // Make sure this is POST, not GET
};

// Request API
// In src/services/api.ts

export const requestApi = {
  // Create a new request
  createRequest: (data) => api.post('/requests', data),
  
  // Get current user's requests
  getMyRequests: () => api.get('/requests/my-requests'),
  
  // Get all requests (admin only)
  getAllRequests: (params) => api.get('/requests/all', { params }),
  
  // Get pending requests (admin only)
  getPendingRequests: () => api.get('/requests/pending'),

  returnByRequester: (id) => api.patch(`/requests/${id}/return-by-requester`),
  
  // Approve a request (admin only)
  approveRequest: (id) => api.patch(`/requests/${id}/approve`),
  
  // REJECT a request (admin only) - ADD THIS
  rejectRequest: (id, data) => 
    api.patch(`/requests/${id}/reject`, data),
  
  // Return a document (admin only)
  returnDocument: (id) => api.patch(`/requests/${id}/return`),
  
  // Get request by reference number
  getRequestByReference: (reference) => 
    api.get(`/requests/reference/${reference}`),
};

// Registration API
// In your src/services/api.ts, update the registrationApi section:

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
  
  // Boxes
  getBoxes: () => api.get('/registration/boxes'),
  createBox: (data) => 
    api.post('/registration/boxes', data),
  
  // Cabinets
  getCabinets: (branchId) => 
    api.get(branchId ? `/registration/cabinets?branchId=${branchId}` : '/registration/cabinets'),
  createCabinet: (data) => 
    api.post('/registration/cabinets', data),
  
  // Drawer Assignments - THIS IS THE KEY PART
  assignDrawer: (data) => 
    api.post('/registration/assign-drawer', data),
  
  getDrawerAssignments: () => 
    api.get('/registration/drawer-assignments'),
  
  getDrawerHistory: (cabinetId, drawerNumber) => 
    api.get('/registration/drawer-history', { params: { cabinetId, drawerNumber } }),
  
  // Cabinet Assignment - link a cabinet to a branch
  assignCabinet: (data) => 
    api.post('/registration/assign-cabinet', data),
  
  // Box Assignments
  assignBox: (data) => 
    api.post('/registration/assign-box', data),
};
  export const notificationApi = {
    getNotifications: () => api.get('/notifications'),
    markAsRead: (id) => api.patch(`/notifications/${id}/read`),
    markAllAsRead: () => api.patch('/notifications/read-all'),
  };
export default api;

// To this:
export const dashboardApi = {
  getStats: () => api.get('/dashboard'),  // ✅ Correct - matches backend
};

// Add reports API to your api.ts file

export const reportsApi = {
  // Get report statistics/dashboard data
  getStats: (params) => 
    api.get('/reports/stats', { params }),
  
  // Get list of previously generated reports
  getGeneratedReports: () => 
    api.get('/reports/generated'),
  
  // Generate a new report
  generateReport: (data


) => 
    api.post('/reports/generate', data),
  
  // Download a specific report by ID
  downloadReport: (id) => 
    api.get(`/reports/download/${id}`, {
      responseType: 'blob'
    }),
  
  // Delete a report
  deleteReport: (id) => 
    api.delete(`/reports/${id}`)
};