// src/config/productCustomFields.ts

export type ProductCustomField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
  placeholder?: string;
  required?: boolean;
};

/**
 * Product-specific ingestion fields keyed by product CODE.
 * Add or change entries here to configure the fields shown for a product;
 * no database or UI component change is needed.
 */
export const PRODUCT_CUSTOM_FIELDS: Record<string, ProductCustomField[]> = {
  // Keyed by product CODE (matches products.code in your DB)
  'MTCM': [
    { key: 'vehicleMake', label: 'Vehicle Make', placeholder: 'Make', required: true },
    { key: 'vehicleYear', label: 'Vehicle Year', type: 'number', placeholder: 'e.g. 2026' },
    { key: 'coverType', label: 'Cover Type', placeholder: 'e.g. Comprehensive' },
    { key: 'plateNumber', label: 'Plate Number', placeholder: 'e.g. ABC1234' },
    { key: 'engineNumber', label: 'Engine Number', placeholder: 'Engine number' },
  ],
  'MTPV': [
    { key: 'vehicleMake', label: 'Vehicle Make', placeholder: 'Make', required: true },
    { key: 'vehicleYear', label: 'Vehicle Year', type: 'number', placeholder: 'e.g. 2026' },
    { key: 'coverType', label: 'Cover Type', placeholder: 'e.g. Comprehensive' },
    { key: 'plateNumber', label: 'Plate Number', placeholder: 'e.g. ABC1234' },
    { key: 'engineNumber', label: 'Engine Number', placeholder: 'Engine number' },
  ],
  'GT': [
    { key: 'sumAssured', label: 'Sum Assured', type: 'number', placeholder: 'e.g. 1000000', required: true },
    { key: 'beneficiaryName', label: 'Beneficiary Name', placeholder: 'Full beneficiary name', required: true },
    { key: 'beneficiaryRelationship', label: 'Beneficiary Relationship', placeholder: 'e.g. Spouse' },
  ],
  'GM': [
    { key: 'memberNumber', label: 'Member Number', placeholder: 'Membership number', required: true },
    { key: 'providerName', label: 'Preferred Provider', placeholder: 'Provider or hospital' },
    { key: 'coverageStartDate', label: 'Coverage Start Date', type: 'date' },
  ],
  'FRGN': [
    { key: 'titleDeedNumber', label: 'Title Deed Number', placeholder: 'Title Deed number', required: true },
    { key: 'propertyLocation', label: 'Property Location', placeholder: 'Location of the property' },
    { key: 'propertyType', label: 'Property Type', placeholder: 'e.g. Residential, Commercial' },
  ],
};

/**
 * Get custom fields by product code OR product name.
 * Falls back to empty array if no config exists.
 */
export const getProductCustomFields = (
  identifier?: string
): ProductCustomField[] => {
  if (!identifier) return [];
  
  // First try exact match on code
  if (PRODUCT_CUSTOM_FIELDS[identifier]) {
    return PRODUCT_CUSTOM_FIELDS[identifier];
  }
  
  // Try normalized (uppercase, no spaces)
  const normalized = identifier.replace(/\s+/g, '').toUpperCase();
  if (PRODUCT_CUSTOM_FIELDS[normalized]) {
    return PRODUCT_CUSTOM_FIELDS[normalized];
  }
  
  return [];
};