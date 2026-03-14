export const APP_CONFIG = {
  COMPANY_NAME: 'INSUREARCH',
  PREMIUM_PROTECTION_NAME: 'INSURE-GUARD',
  API_URL: import.meta.env.VITE_API_URL || 'https://localhost:7000',
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  DEFAULT_RETENTION_PERIOD: '7 Years',
  SUPPORT_EMAIL: 'support@insurearch.example.com',
};

export const DOCUMENT_CATEGORIES = [
  'Policy Documentation',
  'Claim Evidence',
  'Billing Records',
  'Correspondence',
];

export const RETENTION_CLASSES = [
  { label: 'Standard (7 Years)', value: '7_YEARS' },
  { label: 'Extended (10 Years)', value: '10_YEARS' },
  { label: 'Permanent', value: 'PERMANENT' },
];

export const STATUS_OPTIONS = ['Active', 'Archived', 'Pending', 'Draft'];
export const TYPE_OPTIONS = ['Policy', 'Claim', 'Billing', 'Correspondence'];