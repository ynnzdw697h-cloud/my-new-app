import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'kitchen';

/**
 * Drop-in replacement for useLocalStorageArray.
 * Stores an array of objects in Firestore (collection: "kitchen", doc: docId, field: "data").
 * Uses localStorage as an instant-display cache and offline fallback.
 */
export function useFirestoreArray(docId) {
  const lsKey = `fs_cache_${docId}`;

  function readCache() {
    try {
      const raw = localStorage.getItem(lsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  const [value, setValue] = useState(readCache);
  const unsubRef = useRef(null);

  useEffect(() => {
    if (!docId) return;

    setValue(readCache());

    const ref = doc(db, COLLECTION, docId);
    unsubRef.current = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const arr = snap.data().data || [];
        setValue(arr);
        localStorage.setItem(lsKey, JSON.stringify(arr));
      } else {
        setValue([]);
        localStorage.removeItem(lsKey);
      }
    }, err => {
      console.error('[useFirestoreArray] Firestore error:', docId, err.code, err.message);
    });

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  function set(updater) {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(lsKey, JSON.stringify(next));
      setDoc(doc(db, COLLECTION, docId), { data: next }, { merge: false });
      return next;
    });
  }

  return [value, set];
}
