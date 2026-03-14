import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
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

// Document API
export const documentApi = {
  getDocuments: (params?: any) => 
    api.get('/documents', { params }),
  getDocument: (id: string) => 
    api.get(`/documents/${id}`),
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
};

// Request API
export const requestApi = {
  createRequest: (data: any) => 
    api.post('/requests', data),
  getMyRequests: () => 
    api.get('/requests/my-requests'),
  getAllRequests: (params?: any) => 
    api.get('/requests/all', { params }),
  approveRequest: (id: string) => 
    api.patch(`/requests/${id}/approve`),
  returnDocument: (id: string) => 
    api.patch(`/requests/${id}/return`),
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