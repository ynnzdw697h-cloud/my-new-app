// Tenant registry — one entry per B2B customer.
// In production, this would be fetched from a tenants Firestore collection.
// For now, hardcoded so the client knows its own tenantId without a DB lookup.
export const TENANTS = {
  'villa-acadia': {
    id:   'villa-acadia',
    name: 'וילה אכדיה',
  },
};

// Client Zero — this is what the deployed app uses.
export const DEFAULT_TENANT_ID = 'villa-acadia';
