export const APP_CONFIG = {
  NAME: 'INSUREARCH',
  VERSION: '1.1.0',
  API_BASE_URL: import.meta.env.VITE_API_URL || '',
  UPLOAD: {
    MAX_SIZE_MB: 10,
    ALLOWED_TYPES: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    ALLOWED_EXTENSIONS: '.pdf,.doc,.docx,.jpg,.png'
  },
  DEFAULT_PAGINATION: {
    PAGE_SIZE: 10
  }
};

export const UI_LABELS = {
  SEARCH_PLACEHOLDER: 'Search documents, policies, or clients...',
  EMPTY_STATE_DOCS: 'No documents found.',
  UPLOAD_DRAG_DROP: 'Drag and drop files here',
  UPLOAD_SUBTEXT: 'PDF, DOCX, JPG or PNG (max. 10MB)',
  UPLOAD_BUTTON: 'Select Files',
  PROCESS_ARCHIVE_BUTTON: 'Process and Archive',
  SIDEBAR: {
    ARCHIVE: 'Document Archive',
    REGISTRATION: 'Registration',
    STATUS_UPDATE: 'Status Update',
    UPLOAD: 'Add/Ingest Files',
    FILE_REQUEST: 'File Request',
    AUDIT: 'Audit Trail'
  }
};

export const FILE_TYPES = [
  'Claim File',
  'Circular',
  'Policy',
  'Billing',
  'Correspondence'
] ;

export const FILE_STATUSES = [
  'Active',
  'Checked-out',
  'Settled Claims'
] ;