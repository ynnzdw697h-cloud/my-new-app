import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Subscribes to a single full delivery document.
// Returns { delivery, loading, error, updateDelivery(patch) }
export function useDelivery(deliveryId) {
  const [delivery, setDelivery] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (!deliveryId) { setLoading(false); return; }
    setLoading(true);
    setDelivery(null);
    setError(null);
    const ref = doc(db, 'kitchen', deliveryId);
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
  }, [deliveryId]);

  async function updateDelivery(patch) {
    if (!deliveryId) return;
    await setDoc(doc(db, 'kitchen', deliveryId), patch, { merge: true });
  }

  return { delivery, loading, error, updateDelivery };
}
