import { useState } from 'react';

/**
 * Like useState([]), but persists to localStorage as a JSON array.
 */
export function useLocalStorageArray(key) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  function set(updater) {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  return [state, set];
}
