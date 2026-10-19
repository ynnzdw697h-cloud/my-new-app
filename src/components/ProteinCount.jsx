import { useState, useEffect, useRef } from 'react';
import { Plus, Minus, RotateCcw, Trash2, Pencil, Check, X } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTenantId } from '../context/TenantContext';
import { Button, Input } from './ui';
import { UndoToast } from './PrepCelebrations';
import { useHaptic } from '../hooks/useHaptic';

const DOC_ID   = 'protein_count';
const TOAST_MS = 5000;

const FIXED_ITEMS = [
  { id: 'tartar_plate',    name: 'טרטר צלחת',    fixed: true },
  { id: 'tartar_chirashi', name: "טרטר צ'יראשי", fixed: true },
  { id: 'sea_bass',        name: 'פילה בר ים',   fixed: true },
];

function buildDefaults() {
  return FIXED_ITEMS.map(i => ({ ...i, qty: 0 }));
}

function readCache(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function saveCache(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

export default function ProteinCount() {
  const tenantId = useTenantId();
  const lsKey    = `fs_cache_${tenantId}_${DOC_ID}`;
  const [items, setItems]           = useState(readCache(lsKey) || buildDefaults());
  const [addInput, setAddInput]     = useState('');
  const [showAdd, setShowAdd]       = useState(false);
  const [editing, setEditing]       = useState(false);
  const [toast, setToast]           = useState(null); // { id, text, undoable, undo }
  const itemsRef   = useRef(items);
  const toastTimer = useRef(null);
  const vibrate    = useHaptic();

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    const ref   = doc(db, 'tenants', tenantId, 'kitchen', DOC_ID);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data     = snap.data().data || [];
        const fixedIds = new Set(FIXED_ITEMS.map(f => f.id));
        const fixedFromDb = FIXED_ITEMS.map(f => {
          const found = data.find(d => d.id === f.id);
          return { ...f, qty: found ? found.qty : 0 };
        });
        const merged = [...fixedFromDb, ...data.filter(d => !fixedIds.has(d.id))];
        setItems(merged);
        saveCache(lsKey, merged);
      }
    }, err => console.error('[ProteinCount]', err.code));
    return () => unsub();
  }, [tenantId, lsKey]);

  function persist(next) {
    setItems(next);
    itemsRef.current = next;
    saveCache(lsKey, next);
    setDoc(doc(db, 'tenants', tenantId, 'kitchen', DOC_ID), { data: next })
      .catch(err => console.error('[ProteinCount] write failed:', err.code));
  }

  function changeQty(id, delta) {
    vibrate();
    persist(itemsRef.current.map(item =>
      item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item
    ));
  }

  function addItem() {
    const name = addInput.trim();
    if (!name) return;
    persist([...itemsRef.current, { id: `custom_${Date.now()}`, name, qty: 0, fixed: false }]);
    setAddInput('');
    setShowAdd(false);
  }

  // Reversible actions run immediately, with Undo for 5 seconds instead of a confirm dialog
  function showUndo(text, undo) {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, undoable: true, undo });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  function handleUndo() {
    toast?.undo?.();
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  function deleteItem(item) {
    const index = itemsRef.current.findIndex(i => i.id === item.id);
    persist(itemsRef.current.filter(i => i.id !== item.id));
    showUndo(`${item.name} נמחק`, () => {
      if (itemsRef.current.some(i => i.id === item.id)) return;
      const next = [...itemsRef.current];
      next.splice(Math.min(index, next.length), 0, item);
      persist(next);
    });
  }

  function resetAll() {
    const before = Object.fromEntries(itemsRef.current.map(i => [i.id, i.qty]));
    persist(itemsRef.current.map(i => ({ ...i, qty: 0 })));
    showUndo('כל הכמויות אופסו', () => {
      persist(itemsRef.current.map(i => (i.id in before ? { ...i, qty: before[i.id] } : i)));
    });
  }

  const total = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div className="p-5 md:p-6 space-y-5 max-w-lg mx-auto" dir="rtl">

      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-body text-text-secondary">משותף לכל הצוות · בזמן אמת</p>
        {items.some(i => !i.fixed) && (
          <button
            onClick={() => setEditing(v => !v)}
            aria-pressed={editing}
            className="flex items-center gap-1.5 px-4 min-h-[48px] rounded-xl text-base font-semibold flex-shrink-0 transition-colors duration-150"
            style={{
              background: editing ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {editing ? <Check size={16} strokeWidth={2.5} aria-hidden="true" /> : <Pencil size={16} strokeWidth={2} aria-hidden="true" />}
            {editing ? 'סיום' : 'עריכה'}
          </button>
        )}
      </div>

      {/* Items — one list, like the checklist */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
        {items.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-3 pr-5 pl-3 py-2 min-h-[72px]"
            style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}
          >
            <span className={`flex-1 min-w-0 text-lg font-medium ${item.qty > 0 ? 'text-text-primary' : 'text-text-secondary'}`}>{item.name}</span>

            {editing && !item.fixed ? (
              <button
                onClick={() => deleteItem(item)}
                aria-label={`מחק ${item.name}`}
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-150"
                style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}
              >
                <Trash2 size={20} strokeWidth={2} />
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => changeQty(item.id, -1)}
                  disabled={item.qty === 0}
                  aria-label={`הפחת ${item.name}`}
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-text-primary
                             transition-colors duration-150 active:bg-white/10
                             disabled:opacity-30 disabled:pointer-events-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  <Minus size={22} strokeWidth={2} />
                </button>
                <span className="text-2xl font-bold text-text-primary tabular-nums w-12 text-center" aria-live="polite">
                  {item.qty}
                </span>
                <button
                  onClick={() => changeQty(item.id, +1)}
                  aria-label={`הוסף ${item.name}`}
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-text-primary
                             transition-colors duration-150 active:bg-white/10"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  <Plus size={22} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add item */}
      {showAdd ? (
        <div className="flex gap-2.5 items-end">
          <Input
            className="flex-1"
            label="פריט חדש"
            placeholder="לדוגמה: פילה סלמון"
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            autoFocus
          />
          <Button variant="secondary" onClick={addItem} disabled={!addInput.trim()}>הוסף</Button>
          <Button variant="ghost" icon={X} onClick={() => { setShowAdd(false); setAddInput(''); }} ariaLabel="סגור" />
        </div>
      ) : (
        <Button variant="secondary" fullWidth icon={Plus} onClick={() => setShowAdd(true)}>
          הוסף פריט
        </Button>
      )}

      {/* Reset — subtle; Undo brings the numbers back */}
      <div className="flex justify-center pt-4">
        <button
          onClick={resetAll}
          disabled={total === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-base font-medium text-text-tertiary min-h-[48px] disabled:opacity-40"
        >
          <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
          איפוס כל הכמויות
        </button>
      </div>

      <UndoToast toast={toast} onUndo={handleUndo} />

    </div>
  );
}
