import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTenantId } from '../context/TenantContext';

/**
 * Live Firestore document holding one JSON value under `data`.
 *
 * scope 'public' → tenants/{tenantId}/kitchen/{docId}        (cached in localStorage, like useFirestoreArray)
 * scope 'admin'  → tenantsAdmin/{tenantId}/schedule/{docId}  (manager only, never cached on the device)
 *
 * Returns [value, set, { loaded, error }]. `error` is the Firestore error code, e.g. 'permission-denied'.
 */
export function useFirestoreDoc(docId, fallback, scope = 'public') {
  const tenantId = useTenantId();
  const cacheKey = scope === 'public' ? `fs_cache_${tenantId}_${docId}` : null;
  const fallbackRef = useRef(fallback);

  function readCache() {
    if (!cacheKey) return fallbackRef.current;
    try {
      const raw = localStorage.getItem(cacheKey);
      return raw ? JSON.parse(raw) : fallbackRef.current;
    } catch {
      return fallbackRef.current;
    }
  }

  const [value, setValue]   = useState(readCache);
  const [loaded, setLoaded] = useState(false);
  const [error, setError]   = useState(null);
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const ref = useCallback(() => (scope === 'admin'
    ? doc(db, 'tenantsAdmin', tenantId, 'schedule', docId)
    : doc(db, 'tenants', tenantId, 'kitchen', docId)), [scope, tenantId, docId]);

  useEffect(() => {
    if (!docId || !tenantId) return undefined;
    const initial = readCache();
    setValue(initial);
    valueRef.current = initial;
    setLoaded(false);
    setError(null);
    return onSnapshot(ref(), snap => {
      const next = snap.exists() ? snap.data().data : fallbackRef.current;
      setValue(next);
      valueRef.current = next;
      setLoaded(true);
      if (cacheKey) { try { localStorage.setItem(cacheKey, JSON.stringify(next)); } catch (_) { /* full */ } }
    }, err => {
      console.error('[Firestore] error on', docId, err.code);
      setError(err.code || 'error');
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, tenantId, scope]);

  const set = useCallback((updater) => {
    const prev = valueRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    setValue(next);
    valueRef.current = next;
    if (cacheKey) { try { localStorage.setItem(cacheKey, JSON.stringify(next)); } catch (_) { /* full */ } }
    return setDoc(ref(), { data: next })
      .catch(err => { console.error('[Firestore] write FAILED:', docId, err.code); setError(err.code || 'error'); });
  }, [ref, cacheKey, docId]);

  return [value, set, { loaded, error }];
}
