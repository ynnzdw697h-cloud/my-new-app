import { createContext, useContext } from 'react';

const TenantContext = createContext(null);

export function TenantProvider({ tenantId, children }) {
  return (
    <TenantContext.Provider value={tenantId}>
      {children}
    </TenantContext.Provider>
  );
}

// Used by hooks and components to get the current tenantId.
// Throws if called outside a TenantProvider — prevents accidental cross-tenant writes.
export function useTenantId() {
  const id = useContext(TenantContext);
  if (!id) throw new Error('useTenantId must be used within a TenantProvider');
  return id;
}
