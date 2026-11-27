import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

/**
 * Whether the signed-in Firebase user has the server-issued `admin` claim.
 * 'loading' | true | false
 *
 * Manager-only screens must check this BEFORE listening to tenantsAdmin/ docs:
 * a listener that Firestore refuses can break the SDK's connection for the whole app.
 */
export function useAdminClaim() {
  const [state, setState] = useState('loading');
  useEffect(() => onAuthStateChanged(auth, async user => {
    if (!user) { setState(false); return; }
    try {
      const { claims } = await user.getIdTokenResult();
      setState(claims.admin === true);
    } catch (_) {
      setState(false);
    }
  }), []);
  return state;
}
