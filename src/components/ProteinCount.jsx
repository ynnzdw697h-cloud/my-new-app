import { useState, useEffect, useRef } from 'react';
import { Plus, Minus, RotateCcw, Trash2, Pencil, Check, X } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTenantId } from '../context/TenantContext';
import { Button, Input, Sheet } from './ui';
import { useHaptic } from '../hooks/useHaptic';

const DOC_ID = 'protein_count';

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
  const [confirmReset, setConfirmReset]     = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editing, setEditing]       = useState(false);
  const itemsRef = useRef(items);
  const vibrate  = useHaptic();

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

  function deleteItem(id) {
    persist(itemsRef.current.filter(i => i.id !== id));
    setConfirmDeleteId(null);
  }

  function resetAll() {
    persist(itemsRef.current.map(i => ({ ...i, qty: 0 })));
    setConfirmReset(false);
  }

  return (
    <div className="p-5 md:p-6 space-y-5 max-w-lg mx-auto" dir="rtl">

      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-body text-text-secondary">משותף לכל הצוות · בזמן אמת</p>
        {items.some(i => !i.fixed) && (
          <button
            onClick={() => setEditing(v => !v)}
            aria-pressed={editing}
            className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl text-sm font-bold flex-shrink-0"
            style={editing
              ? { background: 'rgba(255,255,255,0.92)', color: '#121212' }
              : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {editing ? <Check size={16} strokeWidth={2.5} aria-hidden="true" /> : <Pencil size={16} strokeWidth={2} aria-hidden="true" />}
            {editing ? 'סיום' : 'עריכה'}
          </button>
        )}
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl pr-5 pl-3 py-3"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <span className="flex-1 min-w-0 text-lg font-bold text-text-primary">{item.name}</span>

            {editing && !item.fixed ? (
              <button
                onClick={() => setConfirmDeleteId(item.id)}
                aria-label={`מחק ${item.name}`}
                className="w-12 h-12 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
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
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-text-primary
                             transition-all duration-100 active:scale-90 press
                             disabled:opacity-30 disabled:pointer-events-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  <Minus size={22} strokeWidth={2.25} />
                </button>
                <span className="text-display font-black text-text-primary tabular-nums w-12 text-center" aria-live="polite">
                  {item.qty}
                </span>
                <button
                  onClick={() => changeQty(item.id, +1)}
                  aria-label={`הוסף ${item.name}`}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-accent
                             transition-all duration-100 active:scale-90 press"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  <Plus size={22} strokeWidth={2.25} />
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

      {/* Reset — subtle, behind a confirmation */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => setConfirmReset(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-text-tertiary min-h-[44px]"
        >
          <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
          איפוס כל הכמויות
        </button>
      </div>

      {/* Delete confirm sheet */}
      <Sheet
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="למחוק פריט זה?"
      >
        <div className="flex gap-3">
          <Button variant="danger" fullWidth onClick={() => deleteItem(confirmDeleteId)}>כן, מחק</Button>
          <Button variant="ghost" fullWidth onClick={() => setConfirmDeleteId(null)}>ביטול</Button>
        </div>
      </Sheet>

      {/* Reset confirm sheet */}
      <Sheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="לאפס את כל הכמויות?"
      >
        <p className="text-body text-text-secondary mb-6">כל הכמויות יחזרו לאפס.</p>
        <div className="flex gap-3">
          <Button variant="danger" fullWidth onClick={resetAll}>כן, אפס</Button>
          <Button variant="ghost" fullWidth onClick={() => setConfirmReset(false)}>ביטול</Button>
        </div>
      </Sheet>

    </div>
  );
}
