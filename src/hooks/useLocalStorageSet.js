import { useState, useEffect, useRef } from 'react';

/**
 * Like useState(new Set()), but persists to localStorage.
 * Re-loads automatically when `key` changes (e.g. station switch).
 */
export function useLocalStorageSet(key) {
  const [state, setState] = useState(() => readFromStorage(key));

  // Re-load when the key changes (station switch)
  const prevKey = useRef(key);
  useEffect(() => {
    if (prevKey.current !== key) {
      prevKey.current = key;
      setState(readFromStorage(key));
    }
  }, [key]);

  function set(updater) {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(key, JSON.stringify([...next]));
      } catch {
        // localStorage unavailable — fail silently
      }
      return next;
    });
  }

  return [state, set];
}

function readFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}
