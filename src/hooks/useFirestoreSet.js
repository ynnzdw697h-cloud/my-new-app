import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'kitchen';

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
        setValue(new Set(arr));
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
    const arr = [...next];

    setValue(next);
    valueRef.current = next;
    localStorage.setItem(lsKey, JSON.stringify(arr));

    console.log('[Firestore] writing to', docId, arr);
    setDoc(doc(db, COLLECTION, docId), { data: arr })
      .then(() => console.log('[Firestore] write OK:', docId))
      .catch(err => console.error('[Firestore] write FAILED:', docId, err.code, err.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  return [value, set];
}
