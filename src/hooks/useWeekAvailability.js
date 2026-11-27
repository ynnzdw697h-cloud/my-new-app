import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useTenantId } from '../context/TenantContext';
import { SCHEDULE_CHEFS, PUBLIC_DOCS } from '../data/schedule';

/**
 * Every cook's submitted shifts for one week, live.
 * Returns { availability: { chefId: { shifts, wanted, note, submittedAt } }, loaded }.
 * Cooks who have not submitted are missing from `availability`.
 */
export function useWeekAvailability(week) {
  const tenantId = useTenantId();
  const [state, setState] = useState({ availability: {}, loaded: false });

  useEffect(() => {
    if (!tenantId || !week) return undefined;
    const got = {};
    const seen = new Set();
    setState({ availability: {}, loaded: false });
    const unsubs = SCHEDULE_CHEFS.map(chef => onSnapshot(
      doc(db, 'tenants', tenantId, 'kitchen', PUBLIC_DOCS.availability(week, chef.id)),
      snap => {
        const data = snap.exists() ? snap.data().data : null;
        if (data?.submittedAt) got[chef.id] = data; else delete got[chef.id];
        seen.add(chef.id);
        setState({ availability: { ...got }, loaded: seen.size === SCHEDULE_CHEFS.length });
      },
      err => {
        console.error('[Firestore] availability', chef.id, err.code);
        seen.add(chef.id);
        setState({ availability: { ...got }, loaded: seen.size === SCHEDULE_CHEFS.length });
      },
    ));
    return () => unsubs.forEach(u => u());
  }, [tenantId, week]);

  return state;
}
