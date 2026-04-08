import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTenantId } from '../context/TenantContext';

export function useFirestoreSet(docId) {
  const tenantId = useTenantId();
  const lsKey    = `fs_cache_${tenantId}_${docId}`;

  function readCache() {
    try {
      const raw = localStorage.getItem(lsKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  const [value, setValue] = useState(readCache);
  const valueRef  = useRef(value);
  const unsubRef  = useRef(null);

  useEffect(() => { valueRef.current = value; }, [value]);

  useEffect(() => {
    if (!docId || !tenantId) return;
    setValue(readCache());
    const ref = doc(db, 'tenants', tenantId, 'kitchen', docId);
    unsubRef.current = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const arr = snap.data().data || [];
        setValue(new Set(arr));
        localStorage.setItem(lsKey, JSON.stringify(arr));
      }
    }, err => {
      console.error('[Firestore] error on', docId, err.code, err.message);
    });
    return () => { if (unsubRef.current) unsubRef.current(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, tenantId]);

  const set = useCallback((updater) => {
    const prev = valueRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    const arr  = [...next];
    setValue(next);
    valueRef.current = next;
    localStorage.setItem(lsKey, JSON.stringify(arr));
    setDoc(doc(db, 'tenants', tenantId, 'kitchen', docId), { data: arr })
      .catch(err => console.error('[Firestore] write FAILED:', docId, err.code, err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, tenantId]);

  return [value, set];
}
