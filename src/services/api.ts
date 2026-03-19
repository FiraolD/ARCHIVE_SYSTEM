import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// In api.ts, add to your request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
    data: config.data,
    params: config.params,
    headers: config.headers
  });
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.config?.url}`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);
// Auth API
export const authApi = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  getProfile: () => 
    api.get('/auth/profile'),
};

// User API - ADD THIS SECTION
export const userApi = {
  getUsers: () => 
    api.get('/users'),
  getUser: (id: string) => 
    api.get(`/users/${id}`),
  createUser: (userData: any) => 
    api.post('/users', userData),
  updateUser: (id: string, userData: any) => 
    api.patch(`/users/${id}`, userData),
  deleteUser: (id: string) => 
    api.delete(`/users/${id}`),
};


export const documentApi = {
  getDocuments: (params?: any) => api.get('/documents', { params }),
  getDocument: (id: string) => api.get(`/documents/${id}`),
  ingestDocument: (formData: FormData) => 
    api.post('/documents/ingest', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateStatus: (id: string, status: string) => 
    api.patch(`/documents/${id}/status`, { status }),
  updatePlacement: (id: string, physicalPlacement: string) => 
    api.patch(`/documents/${id}/placement`, { physicalPlacement }),
  
  // This should match the backend route
  assignToBox: (data: { documentId: string; boxId: string }) => 
    api.post('/documents/assign-to-box', data), // Make sure this is POST, not GET
};

// Request API
// In src/services/api.ts

export const requestApi = {
  // Create a new request
  createRequest: (data: any) => api.post('/requests', data),
  
  // Get current user's requests
  getMyRequests: () => api.get('/requests/my-requests'),
  
  // Get all requests (admin only)
  getAllRequests: (params?: any) => api.get('/requests/all', { params }),
  
  // Get pending requests (admin only)
  getPendingRequests: () => api.get('/requests/pending'),
  
  // Approve a request (admin only)
  approveRequest: (id: string) => api.patch(`/requests/${id}/approve`),
  
  // REJECT a request (admin only) - ADD THIS
  rejectRequest: (id: string, data: { reason: string }) => 
    api.patch(`/requests/${id}/reject`, data),
  
  // Return a document (admin only)
  returnDocument: (id: string) => api.patch(`/requests/${id}/return`),
  
  // Get request by reference number
  getRequestByReference: (reference: string) => 
    api.get(`/requests/reference/${reference}`),
};

// Registration API
// In your src/services/api.ts, update the registrationApi section:

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
  createProduct: (data: { name: string }) => 
    api.post('/registration/products', data),
  
  // Boxes
  getBoxes: () => api.get('/registration/boxes'),
  createBox: (data: { branchCode: string; fileType: string }) => 
    api.post('/registration/boxes', data),
  
  // Cabinets
  getCabinets: (branchId?: string) => 
    api.get(branchId ? `/registration/cabinets?branchId=${branchId}` : '/registration/cabinets'),
  createCabinet: (data: { number: string; drawers: string[] }) => 
    api.post('/registration/cabinets', data),
  
  // Drawer Assignments - THIS IS THE KEY PART
  assignDrawer: (data: { cabinetId: string; branchId: string; drawerNumber: string }) => 
    api.post('/registration/assign-drawer', data),
  
  getDrawerAssignments: () => 
    api.get('/registration/drawer-assignments'),
  
  // Box Assignments
  assignBox: (data: { boxId: string; cabinetId: string; drawerNumber: string }) => 
    api.post('/registration/assign-box', data),
};
  export const notificationApi = {
    getNotifications: () => api.get('/notifications'),
    markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  };
export default api;

// To this:
export const dashboardApi = {
  getStats: () => api.get('/dashboard'),  // ✅ Correct - matches backend
};

// Add reports API to your api.ts file

export const reportsApi = {
  // Get report statistics/dashboard data
  getStats: (params?: { period?: '6months' | '1year' | 'all' }) => 
    api.get('/reports/stats', { params }),
  
  // Get list of previously generated reports
  getGeneratedReports: () => 
    api.get('/reports/generated'),
  
  // Generate a new report
  generateReport: (data: { 
    type: 'Monthly Summary' | 'Claims Analysis' | 'Department Usage'; 
    format?: 'PDF' | 'EXCEL' | 'CSV' 
  }) => 
    api.post('/reports/generate', data),
  
  // Download a specific report by ID
  downloadReport: (id: string) => 
    api.get(`/reports/download/${id}`, {
      responseType: 'blob'
    }),
  
  // Delete a report
  deleteReport: (id: string) => 
    api.delete(`/reports/${id}`)
};