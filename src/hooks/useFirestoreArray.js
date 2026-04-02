import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'kitchen';

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
  const valueRef = useRef(value);
  const unsubRef = useRef(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!docId) return;

    setValue(readCache());

    const ref = doc(db, COLLECTION, docId);
    console.log('[Firestore] subscribing to', docId);

    unsubRef.current = onSnapshot(ref, snap => {
      console.log('[Firestore] snapshot received for', docId, 'exists:', snap.exists());
      if (snap.exists()) {
        const arr = snap.data().data || [];
        setValue(arr);
        localStorage.setItem(lsKey, JSON.stringify(arr));
      }
    }, err => {
      console.error('[Firestore] error on', docId, err.code, err.message);
    });

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  const set = useCallback((updater) => {
    const prev = valueRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;

    setValue(next);
    valueRef.current = next;
    localStorage.setItem(lsKey, JSON.stringify(next));

    console.log('[Firestore] writing to', docId, next);
    setDoc(doc(db, COLLECTION, docId), { data: next })
      .then(() => console.log('[Firestore] write OK:', docId))
      .catch(err => console.error('[Firestore] write FAILED:', docId, err.code, err.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  return [value, set];
}
