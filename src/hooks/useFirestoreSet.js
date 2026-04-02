import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'kitchen';

/**
 * Drop-in replacement for useLocalStorageSet.
 * Stores a Set of IDs in Firestore (collection: "kitchen", doc: docId, field: "data").
 * Uses localStorage as an instant-display cache and offline fallback.
 */
export function useFirestoreSet(docId) {
  const lsKey = `fs_cache_${docId}`;

  function readCache() {
    try {
      const raw = localStorage.getItem(lsKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  const [value, setValue] = useState(readCache);
  const unsubRef = useRef(null);

  useEffect(() => {
    if (!docId) return;

    // Reload cache when docId changes
    setValue(readCache());

    // Subscribe to Firestore
    const ref = doc(db, COLLECTION, docId);
    unsubRef.current = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const arr = snap.data().data || [];
        const set = new Set(arr);
        setValue(set);
        localStorage.setItem(lsKey, JSON.stringify(arr));
      } else {
        setValue(new Set());
        localStorage.removeItem(lsKey);
      }
    }, err => {
      console.error('[useFirestoreSet] Firestore error:', docId, err.code, err.message);
    });

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  function set(updater) {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const arr = [...next];
      localStorage.setItem(lsKey, JSON.stringify(arr));
      setDoc(doc(db, COLLECTION, docId), { data: arr }, { merge: false });
      return next;
    });
  }

  return [value, set];
}
