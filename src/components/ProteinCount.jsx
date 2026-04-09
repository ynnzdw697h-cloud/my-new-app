import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTenantId } from '../context/TenantContext';

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
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveCache(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

export default function ProteinCount() {
  const tenantId = useTenantId();
  const lsKey    = `fs_cache_${tenantId}_${DOC_ID}`;
  const cached   = readCache(lsKey);
  const [items, setItems] = useState(cached || buildDefaults());
  const [addInput, setAddInput] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [swipedId, setSwipedId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const itemsRef = useRef(items);
  const swipeTouchRef = useRef({});

  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    const ref  = doc(db, 'tenants', tenantId, 'kitchen', DOC_ID);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data().data || [];
        // Merge: keep fixed items always, add any custom items from Firestore
        const fixedIds = new Set(FIXED_ITEMS.map(f => f.id));
        const fixedFromDb = FIXED_ITEMS.map(f => {
          const found = data.find(d => d.id === f.id);
          return { ...f, qty: found ? found.qty : 0 };
        });
        const customs = data.filter(d => !fixedIds.has(d.id));
        const merged = [...fixedFromDb, ...customs];
        setItems(merged);
        saveCache(lsKey, merged);
      }
    }, err => {
      console.error('[ProteinCount] Firestore error:', err.code, err.message);
    });
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
    const next = itemsRef.current.map(item =>
      item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item
    );
    persist(next);
  }

  function addItem() {
    const name = addInput.trim();
    if (!name) return;
    const next = [...itemsRef.current, { id: `custom_${Date.now()}`, name, qty: 0, fixed: false }];
    persist(next);
    setAddInput('');
    setShowAdd(false);
  }

  function deleteItem(id) {
    persist(itemsRef.current.filter(i => i.id !== id));
    setConfirmDeleteId(null);
    setSwipedId(null);
  }

  function handleTouchStart(id, e) {
    swipeTouchRef.current = { startX: e.touches[0].clientX, id };
  }

  function handleTouchEnd(id, e) {
    const { startX } = swipeTouchRef.current;
    if (startX == null) return;
    const delta = e.changedTouches[0].clientX - startX;
    if (delta < -60) {
      setSwipedId(id);
    } else if (delta > 30 && swipedId === id) {
      setSwipedId(null);
    }
    swipeTouchRef.current = {};
  }

  function resetAll() {
    const next = itemsRef.current.map(i => ({ ...i, qty: 0 }));
    persist(next);
    setConfirmReset(false);
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-lg mx-auto" dir="rtl">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <span>🐟</span> חיות — ספירת סוף יום
        </h2>
        <p className="text-slate-400 text-sm mt-1">משותף לכל הטבחים • מתעדכן בזמן אמת</p>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.map(item => {
          const isOpen = swipedId === item.id;
          return (
            <div key={item.id} className="relative rounded-2xl overflow-hidden">
              {/* Delete reveal layer (behind the row) */}
              {!item.fixed && (
                <div
                  className="absolute inset-y-0 left-0 flex items-center justify-center bg-red-700"
                  style={{ width: 72 }}
                >
                  <button
                    onClick={() => setConfirmDeleteId(item.id)}
                    className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                  >
                    מחק
                  </button>
                </div>
              )}

              {/* Main row — slides left on swipe */}
              <div
                className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 flex items-center gap-4 transition-transform duration-200"
                style={{ transform: isOpen ? 'translateX(-72px)' : 'translateX(0)' }}
                onTouchStart={!item.fixed ? e => handleTouchStart(item.id, e) : undefined}
                onTouchEnd={!item.fixed ? e => handleTouchEnd(item.id, e) : undefined}
                onClick={() => { if (isOpen) setSwipedId(null); }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-base">{item.name}</div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); changeQty(item.id, -1); }}
                    disabled={item.qty === 0}
                    className="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-black text-xl
                               flex items-center justify-center transition-all duration-150
                               disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    −
                  </button>
                  <span className="text-white font-black text-2xl w-10 text-center tabular-nums">
                    {item.qty}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); changeQty(item.id, +1); }}
                    className="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-black text-xl
                               flex items-center justify-center transition-all duration-150"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <>
          <div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={() => setConfirmDeleteId(null)}
          />
          <div
            className="fixed z-50 bottom-1/2 inset-x-5 translate-y-1/2 rounded-3xl p-6 space-y-4"
            style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <p className="text-white font-bold text-base text-center">
              האם אתה בטוח שברצונך למחוק פריט זה?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteItem(confirmDeleteId)}
                className="flex-1 py-3 rounded-2xl bg-red-700 hover:bg-red-600 text-white font-bold text-sm transition-colors"
              >
                כן, מחק
              </button>
              <button
                onClick={() => { setConfirmDeleteId(null); setSwipedId(null); }}
                className="flex-1 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add item */}
      {showAdd ? (
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="שם הפריט..."
            className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5
                       text-white placeholder-slate-500 text-sm
                       focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={addItem}
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-sm transition-colors"
          >
            הוסף
          </button>
          <button
            onClick={() => { setShowAdd(false); setAddInput(''); }}
            className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-400 text-sm transition-colors"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-3 rounded-2xl border border-dashed border-slate-600
                     text-slate-400 hover:text-white hover:border-slate-400
                     text-sm font-medium transition-all duration-150"
        >
          + הוסף פריט
        </button>
      )}

      {/* Reset */}
      <div className="pt-2">
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full py-3 rounded-2xl border border-slate-700 text-slate-400
                       hover:border-red-800 hover:text-red-400 hover:bg-red-900/20
                       text-sm font-medium transition-all duration-150"
          >
            🔄 איפוס כל הכמויות לאפס
          </button>
        ) : (
          <div className="bg-red-900/30 border border-red-800 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <span className="text-red-300 text-sm font-medium">לאפס את כל הכמויות?</span>
            <div className="flex gap-2">
              <button
                onClick={resetAll}
                className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition-colors"
              >
                כן, אפס
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
