import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { CHEFS } from '../data/chefs';

/**
 * The signed-in cook's id ('ofek', 'keshem', ...), taken from the server-issued login token.
 * Older logins (before the token carried chefId) fall back to the display name.
 * Returns undefined while loading, null when unknown.
 */
export function useChefId(displayName) {
  const [id, setId] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, async user => {
    const fallback = CHEFS.find(c => c.displayName === displayName)?.id || null;
    if (!user) { setId(fallback); return; }
    try {
      const { claims } = await user.getIdTokenResult();
      setId(typeof claims.chefId === 'string' ? claims.chefId : fallback);
    } catch (_) {
      setId(fallback);
    }
  }), [displayName]);
  return id;
}
