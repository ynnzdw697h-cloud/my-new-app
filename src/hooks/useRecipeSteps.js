import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, deleteField } from 'firebase/firestore';
import { useTenantId } from '../context/TenantContext';
import { STEP_OVERRIDES } from '../data/stepOverrides';
import { normalizeStep } from '../data/cookSteps';

// Edited steps (with timers) are stored in ONE document: recipe_steps { [id]: [step, ...] }.
// Saving writes only that recipe's field (merge), so other recipes' steps are never touched.
// Order of precedence: edited in the app > data/stepOverrides.js > the recipe's original text steps.
export function useRecipeSteps() {
  const tenantId            = useTenantId();
  const [edited, setEdited] = useState({});

  useEffect(() => {
    if (!tenantId) return undefined;
    return onSnapshot(
      doc(db, 'tenants', tenantId, 'kitchen', 'recipe_steps'),
      snap => setEdited(snap.exists() ? snap.data() : {}),
      err => console.warn('[recipe_steps]', err.code)
    );
  }, [tenantId]);

  const key = id => String(id).replace(/\./g, '_');

  const stepsFor = useCallback((id, original = []) => {
    const k = key(id);
    const src = Array.isArray(edited[k]) ? edited[k] : (STEP_OVERRIDES[id] || STEP_OVERRIDES[k] || original);
    return { steps: src.map(normalizeStep), hasEdited: Array.isArray(edited[k]) };
  }, [edited]);

  const saveSteps = useCallback(async (id, steps) => {
    const k = key(id);
    await setDoc(doc(db, 'tenants', tenantId, 'kitchen', 'recipe_steps'), { [k]: steps }, { merge: true });
    setEdited(prev => ({ ...prev, [k]: steps }));
  }, [tenantId]);

  const resetSteps = useCallback(async id => {
    const k = key(id);
    await setDoc(doc(db, 'tenants', tenantId, 'kitchen', 'recipe_steps'), { [k]: deleteField() }, { merge: true });
    setEdited(prev => { const n = { ...prev }; delete n[k]; return n; });
  }, [tenantId]);

  return { stepsFor, saveSteps, resetSteps };
}
