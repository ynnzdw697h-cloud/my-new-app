import { useState, useEffect, useRef } from 'react';
import { Fish, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
  const [swipedId, setSwipedId]     = useState(null);
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
    setSwipedId(null);
  }

  function resetAll() {
    persist(itemsRef.current.map(i => ({ ...i, qty: 0 })));
    setConfirmReset(false);
  }

  return (
    <div className="p-5 md:p-6 space-y-5 max-w-lg mx-auto" dir="rtl">

      {/* Header */}
      <div>
        <h2 className="text-h1 text-text-primary flex items-center gap-2">
          <Fish size={20} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.4)' }} />
          חיות — ספירת סוף יום
        </h2>
        <p className="text-body text-text-tertiary mt-1">משותף לכל הטבחים · מתעדכן בזמן אמת</p>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="relative rounded-2xl overflow-hidden">
            {/* Swipe-to-delete background */}
            {!item.fixed && (
              <div
                className="absolute inset-y-0 left-0 flex items-center justify-center rounded-2xl"
                style={{ width: 80, background: 'var(--danger)', zIndex: 0 }}
              >
                <button
                  onClick={() => setConfirmDeleteId(item.id)}
                  className="w-full h-full flex items-center justify-center"
                  aria-label="מחק פריט"
                >
                  <Trash2 size={20} strokeWidth={1.5} style={{ color: '#0E0E0E' }} />
                </button>
              </div>
            )}

            {/* Foreground row */}
            <motion.div
              drag={item.fixed ? false : 'x'}
              dragConstraints={{ left: 0, right: 80 }}
              dragElastic={0.05}
              animate={{ x: swipedId === item.id ? 80 : 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 40) setSwipedId(item.id);
                else setSwipedId(null);
              }}
              onClick={() => { if (swipedId === item.id) setSwipedId(null); }}
              style={{ touchAction: 'pan-y', position: 'relative', zIndex: 1 }}
              className="px-5 py-4 flex items-center gap-4"
              style2={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px' }}
            >
              <div
                className="flex items-center gap-4 w-full rounded-2xl px-5 py-4"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <span className="flex-1 text-body font-bold text-text-primary">{item.name}</span>

                {/* ± stepper inline */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); changeQty(item.id, -1); }}
                    disabled={item.qty === 0}
                    aria-label="הפחת"
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-text-primary text-2xl font-light
                               transition-all duration-100 active:scale-90 press
                               disabled:opacity-30 disabled:pointer-events-none"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                  >
                    −
                  </button>
                  <span className="text-display font-black text-text-primary tabular-nums w-12 text-center">
                    {item.qty}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); changeQty(item.id, +1); }}
                    aria-label="הוסף"
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-accent text-2xl font-light
                               transition-all duration-100 active:scale-90 press"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                  >
                    +
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      {/* Add item */}
      {showAdd ? (
        <div className="flex gap-2.5">
          <Input
            className="flex-1"
            placeholder="שם הפריט..."
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            autoFocus
          />
          <Button variant="secondary" onClick={addItem}>הוסף</Button>
          <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setAddInput(''); }} ariaLabel="סגור">✕</Button>
        </div>
      ) : (
        <Button variant="secondary" fullWidth icon={Plus} onClick={() => setShowAdd(true)}>
          הוסף פריט
        </Button>
      )}

      {/* Reset */}
      <Button variant="danger" fullWidth icon={RotateCcw} onClick={() => setConfirmReset(true)}>
        איפוס כל הכמויות
      </Button>

      {/* Delete confirm sheet */}
      <Sheet
        open={!!confirmDeleteId}
        onClose={() => { setConfirmDeleteId(null); setSwipedId(null); }}
        title="למחוק פריט זה?"
      >
        <div className="flex gap-3">
          <Button variant="danger" fullWidth onClick={() => deleteItem(confirmDeleteId)}>כן, מחק</Button>
          <Button variant="ghost" fullWidth onClick={() => { setConfirmDeleteId(null); setSwipedId(null); }}>ביטול</Button>
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
