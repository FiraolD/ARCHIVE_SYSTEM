// src/context/ArchiveContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import {
  Branch,
  Department,
  Product,
  Box,
  Cabinet,
  FileRequest,
  Notification,
  Document,
  User,
  Facets,
  DocumentFilters,
  Pagination,
} from '../types';
import {
  authApi,
  documentApi,
  requestApi,
  registrationApi,
  notificationApi,
} from '../services/api';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface ArchiveContextType {
  user: User | null;
  token: string | null;
  documents: Document[];
  branches: Branch[];
  departments: Department[];
  products: Product[];
  boxes: Box[];
  cabinets: Cabinet[];
  fileRequests: FileRequest[];
  notifications: Notification[];
  isLoading: boolean;

  filters: DocumentFilters;
  facets: Facets | null;
  pagination: Pagination | null;
  setFilters: (next: DocumentFilters) => void;
  applyFilters: (next: DocumentFilters) => Promise<void>;

  login: (email: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string | undefined, newPassword: string) => Promise<void>;
  logout: () => void;

  fetchDocuments: (params?: DocumentFilters) => Promise<void>;
  fetchDocument: (id: string) => Promise<Document>;
  ingestDocument: (formData: FormData) => Promise<any>;
  updateDocumentStatus: (id: string, status: string) => Promise<void>;
  updatePhysicalPlacement: (id: string, placement: string) => Promise<void>;

  fetchBranches: () => Promise<void>;
  addBranch: (branch: Omit<Branch, 'id'>) => Promise<void>;
  fetchDepartments: () => Promise<void>;
  addDepartment: (dept: Omit<Department, 'id'>) => Promise<void>;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  fetchBoxes: () => Promise<void>;
  addBox: (box: any) => Promise<void>;
  fetchCabinets: () => Promise<void>;
  addCabinet: (cabinet: { number: string; drawers: string[] }) => Promise<void>;
  assignCabinet: (assignment: any) => Promise<void>;
  assignBox: (assignment: any) => Promise<void>;

  fetchMyRequests: () => Promise<void>;
  fetchAllRequests: (params?: any) => Promise<void>;
  addFileRequest: (request: any) => Promise<void>;
  approveRequest: (id: string) => Promise<void>;
  returnDocument: (id: string) => Promise<void>;

  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  generateBoxIdentifier: (branchCode: string) => string;
}

const ArchiveContext = createContext<ArchiveContextType | undefined>(undefined);

const DEFAULT_FILTERS: DocumentFilters = {
  page: 1,
  limit: 20,
  sort_by: 'date_added',
  sort_order: 'DESC',
};

// ============================================================================
// PROVIDER
// ============================================================================

export const ArchiveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [documents, setDocuments] = useState<Document[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [fileRequests, setFileRequests] = useState<FileRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [filters, setFiltersState] = useState<DocumentFilters>(DEFAULT_FILTERS);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const socketRef = useRef<Socket | null>(null);

  const setFilters = useCallback((next: DocumentFilters) => {
    setFiltersState(next);
  }, []);

  // ---------------------------------------------------------------------------
  // Unified fetch: documents + pagination + facets
  // ---------------------------------------------------------------------------
  const fetchDocumentsAndFacets = useCallback(
    async (params: DocumentFilters) => {
      try {
        setIsLoading(true);
        const response = await documentApi.getDocuments(params);
        setDocuments(response.data.documents || []);
        setPagination(response.data.pagination ?? null);
        setFacets(response.data.facets ?? null);
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to fetch documents');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const applyFilters = useCallback(
    async (next: DocumentFilters) => {
      setFiltersState(next);
      await fetchDocumentsAndFacets(next);
    },
    [fetchDocumentsAndFacets]
  );

  useEffect(() => {
    if (!user || user.must_change_password) return;
    const t = setTimeout(() => {
      fetchDocumentsAndFacets(filters);
    }, 200);
    return () => clearTimeout(t);
  }, [filters, user, fetchDocumentsAndFacets]);

  // ---------------------------------------------------------------------------
  // Auth bootstrap
  // ---------------------------------------------------------------------------
  const fetchUserProfile = useCallback(async (): Promise<User | null> => {
    try {
      const response = await authApi.getProfile();
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (token) {
      void fetchUserProfile().then((profile) => {
        if (profile && !profile.must_change_password) {
          notificationApi.getNotifications()
            .then(res => setNotifications(res.data))
            .catch(console.error);
        }
      });
    }
  }, [token, fetchUserProfile]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authApi.login(email, password);
      const { user: userData, token: newToken } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      toast.success(`Welcome back, ${userData.name}!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string | undefined, newPassword: string) => {
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setUser((currentUser) => currentUser
        ? { ...currentUser, must_change_password: false }
        : currentUser);
      toast.success('Password changed successfully');
    } catch (error: unknown) {
      const message = axios.isAxiosError<{ error?: string }>(error)
        ? error.response?.data?.error
        : undefined;
      toast.error(message || 'Failed to change password');
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setDocuments([]);
    setNotifications([]);
    setFileRequests([]);
    setFiltersState(DEFAULT_FILTERS);
    setFacets(null);
    setPagination(null);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    toast.info('Logged out successfully');
  }, []);

  // ---------------------------------------------------------------------------
  // Socket
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!token || !user) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token }
    });
    socketRef.current = socket;
    socket.on('connect', () => console.log('⚡ Socket connected'));
    socket.on('new_notification', (newNotif: Notification) => {
      setNotifications((prev) => [newNotif, ...prev]);
      toast.info(newNotif.title, { description: newNotif.message, duration: 5000 });
    });
    return () => { socket.disconnect(); };
  }, [token, user]);

  // ---------------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------------
  const fetchDocuments = useCallback(async (params?: DocumentFilters) => {
    await fetchDocumentsAndFacets(params ?? filters);
  }, [fetchDocumentsAndFacets, filters]);

  const fetchDocument = useCallback(async (id: string) => {
    try {
      const response = await documentApi.getDocument(id);
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch document');
      throw error;
    }
  }, []);

  const ingestDocument = useCallback(async (formData: FormData) => {
    try {
      setIsLoading(true);
      const response = await documentApi.ingestDocument(formData);
      setDocuments((prev) => [response.data, ...prev]);
      toast.success('Document ingested successfully');
      fetchDocumentsAndFacets(filters).catch(() => {});
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to ingest document');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchDocumentsAndFacets, filters]);

  const updateDocumentStatus = useCallback(async (id: string, status: string) => {
    try {
      setIsLoading(true);
      const response = await documentApi.updateStatus(id, status);
      setDocuments((prev) => prev.map((d) => (d.id === id ? response.data : d)));
      toast.success(`Status updated to ${status}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePhysicalPlacement = useCallback(async (id: string, placement: string) => {
    try {
      setIsLoading(true);
      const response = await documentApi.updatePlacement(id, placement);
      setDocuments((prev) => prev.map((d) => (d.id === id ? response.data : d)));
      toast.success('Physical placement updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update placement');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------
  const fetchBranches = useCallback(async () => {
    try {
      const response = await registrationApi.getBranches();
      setBranches(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch branches');
    }
  }, []);

  const addBranch = useCallback(async (branch: Omit<Branch, 'id'>) => {
    try {
      setIsLoading(true);
      const response = await registrationApi.createBranch(branch);
      setBranches((prev) => [...prev, response.data]);
      toast.success('Branch added successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add branch');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await registrationApi.getDepartments();
      setDepartments(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch departments');
    }
  }, []);

  const addDepartment = useCallback(async (dept: Omit<Department, 'id'>) => {
    try {
      setIsLoading(true);
      const response = await registrationApi.createDepartment(dept);
      setDepartments((prev) => [...prev, response.data]);
      toast.success('Department added successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add department');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await registrationApi.getProducts();
      setProducts(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch products');
    }
  }, []);

  const addProduct = useCallback(async (product: Omit<Product, 'id'>) => {
    try {
      setIsLoading(true);
      const response = await registrationApi.createProduct(product);
      setProducts((prev) => [...prev, response.data]);
      toast.success('Product added successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add product');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchBoxes = useCallback(async () => {
    try {
      const response = await registrationApi.getBoxes();
      setBoxes(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch boxes');
    }
  }, []);

  const addBox = useCallback(async (box: any) => {
    try {
      setIsLoading(true);
      const response = await registrationApi.createBox(box);
      setBoxes((prev) => [...prev, response.data]);
      toast.success('Box added successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add box');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCabinets = useCallback(async () => {
    try {
      const response = await registrationApi.getCabinets();
      setCabinets(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch cabinets');
    }
  }, []);

  const addCabinet = useCallback(async (cabinet: { number: string; drawers: string[] }) => {
    try {
      setIsLoading(true);
      const response = await registrationApi.createCabinet(cabinet);
      setCabinets((prev) => [...prev, response.data]);
      toast.success('Cabinet added successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add cabinet');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const assignCabinet = useCallback(async (assignment: any) => {
    try {
      setIsLoading(true);
      await registrationApi.assignCabinet(assignment);
      toast.success('Cabinet assigned successfully');
      await fetchCabinets();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign cabinet');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCabinets]);

  const assignBox = useCallback(async (assignment: any) => {
    try {
      setIsLoading(true);
      await registrationApi.assignBox(assignment);
      toast.success('Box assigned successfully');
      await fetchBoxes();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign box');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchBoxes]);

  // ---------------------------------------------------------------------------
  // File Requests
  // ---------------------------------------------------------------------------
  const fetchMyRequests = useCallback(async () => {
    try {
      const response = await requestApi.getMyRequests();
      setFileRequests(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch requests');
    }
  }, []);

  const fetchAllRequests = useCallback(async (params?: any) => {
    try {
      const response = await requestApi.getAllRequests(params);
      setFileRequests(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch requests');
    }
  }, []);

  const addFileRequest = useCallback(async (request: any) => {
    try {
      setIsLoading(true);
      const response = await requestApi.createRequest(request);
      setFileRequests((prev) => [response.data, ...prev]);
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === request.documentId ? { ...doc, status: 'Checked-out' } : doc
        )
      );
      toast.success('File request submitted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit request');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approveRequest = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      await requestApi.approveRequest(id);
      setFileRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status: 'Approved' } : req))
      );
      toast.success('Request approved');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve request');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const returnDocument = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      await requestApi.returnDocument(id);
      setFileRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status: 'Returned' } : req))
      );
      toast.success('Document returned');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to return document');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationApi.getNotifications();
      setNotifications(response.data);
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error: any) {
      toast.error('Failed to mark notifications as read');
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const generateBoxIdentifier = useCallback((branchCode: string): string => {
    const year = new Date().getFullYear().toString().slice(-2);
    const existingInBranchAndYear = boxes.filter(
      (b) => b.branchCode === branchCode && b.year === year
    );
    const nextSequence = existingInBranchAndYear.length + 1;
    const formattedSequence = nextSequence.toString().padStart(4, '0');
    return `AI/${branchCode}/${formattedSequence}/${year}`;
  }, [boxes]);

  // ---------------------------------------------------------------------------
  // Initial data load
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;
    fetchBranches();
    fetchDepartments();
    fetchProducts();
    fetchBoxes();
    fetchCabinets();
    if (user.role === 'Admin') {
      fetchAllRequests();
    } else {
      fetchMyRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ============================================================================
  // MEMOIZED CONTEXT VALUE
  // ============================================================================
  const contextValue = useMemo(() => ({
    user,
    token,
    documents,
    branches,
    departments,
    products,
    boxes,
    cabinets,
    fileRequests,
    notifications,
    isLoading,
    filters,
    facets,
    pagination,
    setFilters,
    applyFilters,
    login,
    changePassword,
    logout,
    fetchDocuments,
    fetchDocument,
    ingestDocument,
    updateDocumentStatus,
    updatePhysicalPlacement,
    fetchBranches,
    addBranch,
    fetchDepartments,
    addDepartment,
    fetchProducts,
    addProduct,
    fetchBoxes,
    addBox,
    fetchCabinets,
    addCabinet,
    assignCabinet,
    assignBox,
    fetchMyRequests,
    fetchAllRequests,
    addFileRequest,
    approveRequest,
    returnDocument,
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    generateBoxIdentifier,
  }), [
    user, token, documents, branches, departments, products, boxes, cabinets,
    fileRequests, notifications, isLoading, filters, facets, pagination,
    setFilters, applyFilters, login, changePassword, logout, fetchDocuments,
    fetchDocument, ingestDocument, updateDocumentStatus, updatePhysicalPlacement,
    fetchBranches, addBranch, fetchDepartments, addDepartment, fetchProducts,
    addProduct, fetchBoxes, addBox, fetchCabinets, addCabinet, assignCabinet,
    assignBox, fetchMyRequests, fetchAllRequests, addFileRequest, approveRequest,
    returnDocument, fetchNotifications, markNotificationRead,
    markAllNotificationsRead, generateBoxIdentifier
  ]);

  return (
    <ArchiveContext.Provider value={contextValue}>
      {children}
    </ArchiveContext.Provider>
  );
};

export const useArchive = () => {
  const context = useContext(ArchiveContext);
  if (context === undefined) {
    throw new Error('useArchive must be used within an ArchiveProvider');
  }
  return context;
};