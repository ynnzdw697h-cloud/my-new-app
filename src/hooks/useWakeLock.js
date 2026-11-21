import { useEffect, useState, useCallback } from 'react';

// Keeps the phone screen on while `enabled` is true (ADD-01).
// Does nothing on devices/browsers without the Screen Wake Lock API.
// The cook can switch it off; the choice is remembered on this device.
const PREF_KEY = 'recipe_wakelock_off';

function readOff() {
  try { return localStorage.getItem(PREF_KEY) === '1'; } catch (_) { return false; }
}

export function useWakeLock(enabled) {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [off, setOff]       = useState(readOff);
  const [active, setActive] = useState(false);

  const toggle = useCallback(() => {
    setOff(prev => {
      const next = !prev;
      try { localStorage.setItem(PREF_KEY, next ? '1' : '0'); } catch (_) { /* ignore */ }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!supported || !enabled || off) { setActive(false); return undefined; }
    let lock = null;
    let cancelled = false;

    async function acquire() {
      try {
        const l = await navigator.wakeLock.request('screen');
        if (cancelled) { l.release().catch(() => {}); return; }
        lock = l;
        setActive(true);
        l.addEventListener('release', () => { if (lock === l) setActive(false); });
      } catch (_) {
        setActive(false); // e.g. low battery mode: silently skip
      }
    }

    // The lock is dropped when the app goes to the background: ask again on return
    function onVisible() {
      if (document.visibilityState === 'visible' && (!lock || lock.released)) acquire();
    }

    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (lock) lock.release().catch(() => {});
      setActive(false);
    };
  }, [supported, enabled, off]);

  return { supported, active, off, toggle };
}
