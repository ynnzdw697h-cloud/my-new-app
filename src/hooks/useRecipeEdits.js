import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, deleteField } from 'firebase/firestore';
import { useTenantId } from '../context/TenantContext';

// Edited recipe details are stored in ONE document: recipe_edits { [id]: { name, ingredients, ... } }.
// The original recipe (code or custom_recipes) is never changed, so it can always be restored.
// Saving writes only that recipe's field (merge). The editor always sends every editable field.

const key = id => String(id).replace(/\./g, '_');

export function useRecipeEdits() {
  const tenantId          = useTenantId();
  const [edits, setEdits] = useState({});

  useEffect(() => {
    if (!tenantId) return undefined;
    return onSnapshot(
      doc(db, 'tenants', tenantId, 'kitchen', 'recipe_edits'),
      snap => setEdits(snap.exists() ? snap.data() : {}),
      err => console.warn('[recipe_edits]', err.code)
    );
  }, [tenantId]);

  const applyEdit = useCallback(r => {
    const e = edits[key(r.id)];
    return e ? { ...r, ...e } : r;
  }, [edits]);

  const editFor = useCallback(id => edits[key(id)] || null, [edits]);

  // fields = null restores the original recipe
  const saveEdit = useCallback(async (id, fields) => {
    await setDoc(
      doc(db, 'tenants', tenantId, 'kitchen', 'recipe_edits'),
      { [key(id)]: fields || deleteField() },
      { merge: true }
    );
  }, [tenantId]);

  return { applyEdit, editFor, saveEdit };
}
