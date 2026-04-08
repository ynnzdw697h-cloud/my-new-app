import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTenantId } from '../context/TenantContext';

export function useDelivery(deliveryId) {
  const tenantId               = useTenantId();
  const [delivery, setDelivery] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (!deliveryId || !tenantId) { setLoading(false); return; }
    setLoading(true);
    setDelivery(null);
    setError(null);
    const ref  = doc(db, 'tenants', tenantId, 'kitchen', deliveryId);
    const unsub = onSnapshot(ref,
      snap => {
        setLoading(false);
        if (snap.exists()) setDelivery(snap.data());
        else setError('DELIVERY_NOT_FOUND');
      },
      err => {
        setLoading(false);
        setError(err.code || 'UNKNOWN_ERROR');
      }
    );
    return unsub;
  }, [deliveryId, tenantId]);

  async function updateDelivery(patch) {
    if (!deliveryId || !tenantId) return;
    await setDoc(doc(db, 'tenants', tenantId, 'kitchen', deliveryId), patch, { merge: true });
  }

  return { delivery, loading, error, updateDelivery };
}
