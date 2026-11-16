import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc, runTransaction, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useTenantId } from '../context/TenantContext';
import { CATALOG_DOC, SEEDS, seedToItems, orderLogDocId } from '../data/supplierCatalog';

/**
 * Supplier catalog for ALL suppliers, stored in one Firestore doc:
 *   tenants/{tenantId}/kitchen/supplier_catalog → { data: [items], seeded: { aleh_aleh: true } }
 * Seeds a supplier's initial items exactly once (transaction-guarded).
 * Returns [allItems, setAllItems, loaded].
 */
export function useSupplierCatalog(supplierId) {
  const tenantId = useTenantId();
  const lsKey    = `fs_cache_${tenantId}_${CATALOG_DOC}`;

  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(lsKey)) || []; } catch { return []; }
  });
  const [loaded, setLoaded] = useState(false);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    if (!tenantId) return;
    const ref = doc(db, 'tenants', tenantId, 'kitchen', CATALOG_DOC);

    // One-time seed for this supplier
    if (supplierId && SEEDS[supplierId]) {
      runTransaction(db, async tx => {
        const snap = await tx.get(ref);
        const cur  = snap.exists() ? snap.data() : {};
        if (cur.seeded?.[supplierId]) return;
        const seeded = seedToItems(supplierId, SEEDS[supplierId], tenantId);
        tx.set(ref, {
          data:   [...(cur.data || []), ...seeded],
          seeded: { ...(cur.seeded || {}), [supplierId]: true },
        }, { merge: true });
      }).catch(err => console.error('[Catalog] seed failed:', err.code, err.message));
    }

    const unsub = onSnapshot(ref, snap => {
      const arr = snap.exists() ? (snap.data().data || []) : [];
      setItems(arr);
      itemsRef.current = arr;
      setLoaded(true);
      try { localStorage.setItem(lsKey, JSON.stringify(arr)); } catch {}
    }, err => console.error('[Catalog] error:', err.code, err.message));
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, supplierId]);

  const update = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(itemsRef.current) : updater;
    setItems(next);
    itemsRef.current = next;
    try { localStorage.setItem(lsKey, JSON.stringify(next)); } catch {}
    setDoc(doc(db, 'tenants', tenantId, 'kitchen', CATALOG_DOC), { data: next }, { merge: true })
      .catch(err => console.error('[Catalog] write FAILED:', err.code, err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return [items, update, loaded];
}

/** Appends an order to this month's log doc. Returns a promise. */
export function appendOrderLog(tenantId, entry) {
  const ref = doc(db, 'tenants', tenantId, 'kitchen', orderLogDocId());
  return setDoc(ref, { data: arrayUnion(entry) }, { merge: true });
}
