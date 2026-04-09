import { useState, useEffect, useRef } from 'react';
import { useFirestoreSet } from '../hooks/useFirestoreSet';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTenantId } from '../context/TenantContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SUPPLIERS } from '../data/suppliers';

/* ─── Swipe-right to reveal delete (RTL) ─── */
function SwipeableItemRow({ rowKey, swipedKey, setSwipedKey, onDeleteRequest, children }) {
  if (!onDeleteRequest) return <>{children}</>;
  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 flex items-center justify-center bg-red-600"
        style={{ width: 80, zIndex: 0 }}
      >
        <button
          onClick={onDeleteRequest}
          className="w-full h-full text-white font-bold text-xl"
        >✕</button>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 80 }}
        dragElastic={0.05}
        animate={{ x: swipedKey === rowKey ? 80 : 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 40) setSwipedKey(rowKey);
          else setSwipedKey(null);
        }}
        onClick={() => { if (swipedKey === rowKey) setSwipedKey(null); }}
        style={{ touchAction: 'pan-y', position: 'relative', zIndex: 1, background: '#1e293b' }}
      >
        {children}
      </motion.div>
    </div>
  );
}

const UNITS = ['יח׳', 'ק"ג'];

const BASE_CATEGORIES = {
  aleh_aleh: [
    { name: 'עגבניות ופירות', emoji: '🍅', items: ['ליים', 'תפוז', 'לימון', 'עגבניה אשכול', 'מגי', 'שרי תמר אדום', 'שרי עגול אדום', 'שרי צהוב', 'שרי מנומר', 'שושקה', 'תפוא באסטר', 'תפוא ראטה', 'אבוקדו', 'בננה', 'גרני סמית', 'אבטיח', 'מלון'] },
    { name: 'ירקות', emoji: '🥦', items: ['זוקיני', 'גזר', 'כרוב לבן', 'בצל סגול', 'בצל לבן', 'כרישה', 'מלון', 'ארטישוק ירושלמי', 'גינגר', 'שאלוט מוארך', 'מלפון', 'מלפון ארומטו', 'מלפון בייבי', 'קישוא מיני', 'ברוקולי', 'שעועית ירוקה', 'חציל', 'סלק', 'צנונית', 'צנונית אבטיח', 'חזרת', 'שום קלוף', 'מנגולד', 'פטל', 'אוכמניות', 'תותים', 'פאקוס', 'תרד', 'סלרי'] },
    { name: 'עלים ועשבי תיבול', emoji: '🌿', items: ['כוסברה', 'שמיר', 'זעתר', 'נענע', 'מרווה', 'עירית', 'סימין', 'בזיליקום', 'פסרוחזיליה', 'בצל ירוק', 'גרגיר', 'נקטרינה'] },
    { name: 'חסות ועלים', emoji: '🥬', items: ['מיזונה', 'עלי חרדל', 'עלי שומר', 'לאליק', 'חסה קיסר', 'בייבי נאם', 'ריגלה', 'קייל', 'שומר בייבי', 'שעועית ירוקה ירוקה'] },
  ],
  dagim:  [],
  yavesh: [],
};

function todayLabel() {
  return new Date().toLocaleDateString('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function normalize(raw) {
  const result = {};
  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === 'number') {
      result[key] = { qty: val, unit: 'יח׳' };
    } else if (val && typeof val === 'object') {
      result[key] = { qty: val.qty || 0, unit: val.unit || 'יח׳' };
    }
  }
  return result;
}

function getQty(quantities, item)  { const v = quantities[item]; if (!v) return 0; return typeof v === 'number' ? v : (v.qty || 0); }
function getUnit(quantities, item) { const v = quantities[item]; if (!v || typeof v === 'number') return 'יח׳'; return v.unit || 'יח׳'; }

// ─────────────────────────────────────────────────────────────
export default function SupplierOrder() {
  const tenantId = useTenantId();
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [quantities,    setQuantities]    = useState({});
  const [customItems,   setCustomItems]   = useState([]);   // permanent custom items (Firebase)
  const [oneTimeItems,  setOneTimeItems]  = useState([]);   // one-time items (local only)
  const [confirmReset,  setConfirmReset]  = useState(false);
  const [copyDone,      setCopyDone]      = useState(false);
  const [swipedKey,     setSwipedKey]     = useState(null);
  const [confirmDel,    setConfirmDel]    = useState(null); // { key, label, onConfirm }
  const [hiddenItems,   setHiddenItems]   = useFirestoreSet(
    selectedSupplier ? `hidden_items_${selectedSupplier.id}` : null
  );
  const hiddenRef = useRef(hiddenItems);
  useEffect(() => { hiddenRef.current = hiddenItems; }, [hiddenItems]);
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [showAddForm,   setShowAddForm]   = useState(false);
  const [addName,       setAddName]       = useState('');
  const [addCategory,   setAddCategory]   = useState('');
  const [addPermanent,  setAddPermanent]  = useState(false);
  const printRef = useRef(null);
  const qRef = useRef(quantities);
  const customRef = useRef(customItems);
  const oneTimeRef = useRef(oneTimeItems);

  useEffect(() => { qRef.current = quantities; },   [quantities]);
  useEffect(() => { customRef.current = customItems; }, [customItems]);
  useEffect(() => { oneTimeRef.current = oneTimeItems; }, [oneTimeItems]);

  // ── Subscribe to quantities ──
  useEffect(() => {
    if (!selectedSupplier) return;
    setQuantities({}); qRef.current = {};

    const ref = doc(db, 'tenants', tenantId, 'kitchen', `order_${selectedSupplier.id}`);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const q = normalize(snap.data().quantities || {});
        setQuantities(q); qRef.current = q;
      }
    }, err => console.error('[SupplierOrder]', err.code));
    return () => unsub();
  }, [selectedSupplier, tenantId]);

  // ── Subscribe to custom items ──
  useEffect(() => {
    if (!selectedSupplier) return;
    setCustomItems([]); customRef.current = [];

    const ref = doc(db, 'tenants', tenantId, 'kitchen', `custom_items_${selectedSupplier.id}`);
    const unsub = onSnapshot(ref, snap => {
      const data = snap.exists() ? (snap.data().data || []) : [];
      setCustomItems(data); customRef.current = data;
    }, err => console.error('[SupplierOrder custom]', err.code));
    return () => unsub();
  }, [selectedSupplier, tenantId]);

  function persistQty(next) {
    if (!selectedSupplier) return;
    setQuantities(next); qRef.current = next;
    setDoc(doc(db, 'tenants', tenantId, 'kitchen', `order_${selectedSupplier.id}`), { quantities: next })
      .catch(err => console.error('[SupplierOrder] qty write failed:', err.code));
  }

  function persistCustom(next) {
    if (!selectedSupplier) return;
    setCustomItems(next); customRef.current = next;
    setDoc(doc(db, 'tenants', tenantId, 'kitchen', `custom_items_${selectedSupplier.id}`), { data: next })
      .catch(err => console.error('[SupplierOrder] custom write failed:', err.code));
  }

  // ── Build merged categories (base + custom permanent) ──
  function buildCategories() {
    const base = (BASE_CATEGORIES[selectedSupplier?.id] || []).map(c => ({
      ...c,
      items: c.items.filter(name => !hiddenRef.current.has(name)),
    }));
    for (const item of customRef.current) {
      if (hiddenRef.current.has(item.name)) continue;
      let cat = base.find(c => c.name === item.category);
      if (!cat) { cat = { name: item.category, emoji: '➕', items: [] }; base.push(cat); }
      if (!cat.items.includes(item.name)) cat.items.push(item.name);
    }
    return base.filter(c => c.items.length > 0);
  }

  function getCategoryOptions() {
    const base = BASE_CATEGORIES[selectedSupplier?.id] || [];
    const names = new Set(base.map(c => c.name));
    customRef.current.forEach(i => names.add(i.category));
    if (names.size === 0) names.add('כללי');
    return [...names];
  }

  function changeQty(item, delta) {
    const next = Math.max(0, getQty(qRef.current, item) + delta);
    persistQty({ ...qRef.current, [item]: { qty: next, unit: getUnit(qRef.current, item) } });
  }

  function toggleUnit(item) {
    const cur = getUnit(qRef.current, item);
    const nextUnit = UNITS[(UNITS.indexOf(cur) + 1) % UNITS.length];
    persistQty({ ...qRef.current, [item]: { qty: getQty(qRef.current, item), unit: nextUnit } });
  }

  function resetAll() {
    persistQty({});
    setOneTimeItems([]); oneTimeRef.current = [];
    setConfirmReset(false);
  }

  // ── Add item ──
  function openAddForm() {
    setAddCategory(getCategoryOptions()[0] || 'כללי');
    setAddName('');
    setAddPermanent(false);
    setShowAddForm(true);
  }

  function addItem() {
    const name = addName.trim();
    if (!name) return;
    const category = addCategory || getCategoryOptions()[0] || 'כללי';

    if (addPermanent) {
      persistCustom([...customRef.current, { id: `c_${Date.now()}`, name, category }]);
    } else {
      const next = [{ id: `o_${Date.now()}`, name, category }, ...oneTimeRef.current];
      setOneTimeItems(next); oneTimeRef.current = next;
    }
    setShowAddForm(false);
    setAddName('');
  }

  function removeCustomItem(id) {
    const item = customRef.current.find(i => i.id === id);
    persistCustom(customRef.current.filter(i => i.id !== id));
    if (item) {
      const next = { ...qRef.current };
      delete next[item.name];
      persistQty(next);
    }
  }

  // ── Clear one-time items after order sent ──
  function clearOneTime() {
    if (oneTimeRef.current.length === 0) return;
    const next = { ...qRef.current };
    for (const item of oneTimeRef.current) delete next[item.name];
    persistQty(next);
    setOneTimeItems([]); oneTimeRef.current = [];
  }

  const allCategories = selectedSupplier ? buildCategories() : [];
  const totalItems = Object.values(quantities).filter(v => (typeof v === 'number' ? v : v?.qty) > 0).length
    + oneTimeItems.filter(i => getQty(quantities, i.name) > 0).length;

  // ── Copy to clipboard ──
  function copyOrder() {
    const q = qRef.current;
    let text = `🛒 הזמנה — ${selectedSupplier.name}\n📅 ${todayLabel()}\n\n`;
    let hasAny = false;

    for (const cat of allCategories) {
      const active = cat.items.filter(item => getQty(q, item) > 0);
      if (!active.length) continue;
      hasAny = true;
      text += `*${cat.name}:*\n`;
      for (const item of active) text += `• ${item} — ${getQty(q, item)} ${getUnit(q, item)}\n`;
      text += '\n';
    }

    const activeOneTime = oneTimeRef.current.filter(i => getQty(q, i.name) > 0);
    if (activeOneTime.length) {
      hasAny = true;
      text += `*הזמנה חד פעמית:*\n`;
      for (const item of activeOneTime) text += `• ${item.name} — ${getQty(q, item.name)} ${getUnit(q, item.name)}\n`;
      text += '\n';
    }

    if (!hasAny) text += 'אין פריטים בהזמנה\n';
    text += `\nסה״כ ${totalItems} פריטים`;

    navigator.clipboard.writeText(text)
      .then(() => {
        setCopyDone(true);
        setTimeout(() => { setCopyDone(false); clearOneTime(); }, 2500);
      })
      .catch(() => alert('לא ניתן להעתיק — נסה שוב'));
  }

  // ── Download PDF ──
  async function downloadPDF() {
    const el = printRef.current;
    if (!el) return;
    setPdfLoading(true);
    try {
      el.style.display = 'block';
      await new Promise(r => setTimeout(r, 50));
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      el.style.display = 'none';

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgW = pageW - margin * 2;
      const ratio = canvas.width / imgW;
      const pageCanvasH = (pageH - margin * 2) * ratio;

      let sourceY = 0;
      while (sourceY < canvas.height) {
        const sliceH = Math.min(pageCanvasH, canvas.height - sourceY);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width; sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        if (sourceY > 0) pdf.addPage();
        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, sliceH / ratio);
        sourceY += sliceH;
      }

      const dateStr = new Date().toLocaleDateString('he-IL').replace(/\//g, '-');
      pdf.save(`הזמנה-${selectedSupplier.name}-${dateStr}.pdf`);
      clearOneTime();
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setPdfLoading(false);
    }
  }

  // ═══════════════════════════════════════════════════════
  // ── SUPPLIER SELECTION SCREEN ──
  // ═══════════════════════════════════════════════════════
  if (!selectedSupplier) {
    return (
      <div className="p-4 md:p-6 space-y-4" dir="rtl">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-1">
            <span>🛒</span> הזמנות ספקים
          </h2>
          <p className="text-slate-400 text-sm">בחר ספק להזמנה</p>
        </div>

        <div className="space-y-3">
          {SUPPLIERS.map(supplier => (
            <button
              key={supplier.id}
              onClick={() => setSelectedSupplier(supplier)}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-6
                         hover:border-slate-500 hover:bg-slate-750 active:bg-slate-700
                         transition-all duration-150 flex items-center gap-5 touch-manipulation text-right"
            >
              <span className="text-5xl flex-shrink-0">{supplier.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-black text-xl">{supplier.name}</div>
                <div className="text-slate-400 text-sm mt-1">{supplier.type}</div>
              </div>
              <span className="text-slate-500 text-2xl flex-shrink-0">←</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // ── ORDER PAGE ──
  // ═══════════════════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 space-y-5 pb-32" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <button
            onClick={() => { setSelectedSupplier(null); setOneTimeItems([]); setShowAddForm(false); }}
            className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700
                       text-slate-400 hover:text-white hover:border-slate-500
                       flex items-center justify-center text-xl transition-all duration-150 flex-shrink-0"
          >
            →
          </button>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>{selectedSupplier.emoji}</span> {selectedSupplier.name}
            </h2>
            <p className="text-slate-400 text-sm">{totalItems} פריטים נבחרו</p>
          </div>
        </div>
        <div>
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 border border-slate-700
                         text-slate-400 hover:text-white hover:border-slate-500 transition-all duration-150"
            >
              🔄 איפוס
            </button>
          ) : (
            <div className="flex gap-2 items-center">
              <span className="text-red-400 text-sm">לאפס הכל?</span>
              <button onClick={resetAll} className="px-3 py-1.5 rounded-lg bg-red-700 text-white text-sm font-bold">כן</button>
              <button onClick={() => setConfirmReset(false)} className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-sm">לא</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Permanent categories ── */}
      {allCategories.map(cat => (
        <section key={cat.name} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
            <span className="text-lg">{cat.emoji}</span>
            <h3 className="text-white font-bold text-base">{cat.name}</h3>
            <span className="mr-auto text-slate-500 text-xs">
              {cat.items.filter(item => getQty(quantities, item) > 0).length} נבחרו
            </span>
          </div>
          <div className="divide-y divide-slate-700/60">
            {cat.items.map(item => {
              const qty      = getQty(quantities, item);
              const unit     = getUnit(quantities, item);
              const active   = qty > 0;
              const customEntry = customRef.current.find(c => c.name === item);
              const deleteFn = () => setConfirmDel({
                key: item,
                label: item,
                onConfirm: () => {
                  if (customEntry) {
                    removeCustomItem(customEntry.id);
                  } else {
                    setHiddenItems(prev => { const next = new Set(prev); next.add(item); return next; });
                    // also clear its qty from the order
                    const next = { ...qRef.current }; delete next[item]; persistQty(next);
                  }
                  setConfirmDel(null);
                },
              });
              return (
                <SwipeableItemRow
                  key={item}
                  rowKey={item}
                  swipedKey={swipedKey}
                  setSwipedKey={setSwipedKey}
                  onDeleteRequest={deleteFn}
                >
                  <ItemRow
                    item={item}
                    qty={qty}
                    unit={unit}
                    active={active}
                    onMinus={() => changeQty(item, -1)}
                    onPlus={() => changeQty(item, +1)}
                    onToggleUnit={() => toggleUnit(item)}
                  />
                </SwipeableItemRow>
              );
            })}
          </div>
        </section>
      ))}

      {/* ── One-time items ── */}
      {oneTimeItems.length > 0 && (
        <section className="bg-slate-800 border border-amber-800/50 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700 bg-amber-900/20">
            <span className="text-lg">⏱</span>
            <h3 className="text-amber-300 font-bold text-base">הזמנה חד פעמית</h3>
            <span className="text-amber-600 text-xs mr-auto">יימחקו לאחר שליחת ההזמנה</span>
          </div>
          <div className="divide-y divide-slate-700/60">
            {oneTimeItems.map(item => {
              const qty    = getQty(quantities, item.name);
              const unit   = getUnit(quantities, item.name);
              const active = qty > 0;
              return (
                <SwipeableItemRow
                  key={item.id}
                  rowKey={item.id}
                  swipedKey={swipedKey}
                  setSwipedKey={setSwipedKey}
                  onDeleteRequest={() => setConfirmDel({
                    key: item.id,
                    label: item.name,
                    onConfirm: () => {
                      setOneTimeItems(prev => prev.filter(i => i.id !== item.id));
                      const next = { ...qRef.current };
                      delete next[item.name];
                      persistQty(next);
                      setConfirmDel(null);
                    },
                  })}
                >
                  <ItemRow
                    item={item.name}
                    qty={qty}
                    unit={unit}
                    active={active}
                    onMinus={() => changeQty(item.name, -1)}
                    onPlus={() => changeQty(item.name, +1)}
                    onToggleUnit={() => toggleUnit(item.name)}
                  />
                </SwipeableItemRow>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Add item ── */}
      {showAddForm ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
          <div className="text-white font-bold mb-1">הוספת מוצר</div>

          {/* Name */}
          <input
            autoFocus
            type="text"
            value={addName}
            onChange={e => setAddName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="שם המוצר..."
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3
                       text-white placeholder-slate-500 text-base
                       focus:outline-none focus:border-blue-500"
          />

          {/* Category dropdown */}
          <select
            value={addCategory}
            onChange={e => setAddCategory(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3
                       text-white text-base focus:outline-none focus:border-blue-500"
          >
            {getCategoryOptions().map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          {/* Permanent checkbox */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setAddPermanent(v => !v)}
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-150 flex-shrink-0
                ${addPermanent ? 'bg-blue-600 border-blue-600' : 'border-slate-500'}`}
            >
              {addPermanent && (
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <div className="text-white text-sm font-medium">הוסף לרשימה הקבועה</div>
              <div className="text-slate-500 text-xs">
                {addPermanent ? 'יישמר ב-Firebase לכל הזמנות הבאות' : 'חד פעמי — יימחק לאחר שליחת ההזמנה'}
              </div>
            </div>
          </label>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={addItem}
              disabled={!addName.trim()}
              className="flex-1 py-3 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-sm
                         transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              הוסף
            </button>
            <button
              onClick={() => { setShowAddForm(false); setAddName(''); }}
              className="px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={openAddForm}
          className="w-full py-4 rounded-2xl border border-dashed border-slate-600
                     text-slate-400 hover:text-white hover:border-slate-400
                     text-sm font-medium transition-all duration-150 touch-manipulation"
        >
          + הוסף מוצר
        </button>
      )}

      {/* ── Delete confirmation ── */}
      <AnimatePresence>
        {confirmDel && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
              onClick={() => { setConfirmDel(null); setSwipedKey(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="fixed z-50 inset-x-5 rounded-3xl p-6 space-y-4"
              style={{ top: '50%', transform: 'translateY(-50%)', background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)' }}
              dir="rtl"
            >
              <p className="text-white font-bold text-base text-center">
                האם אתה בטוח שברצונך למחוק מוצר זה?
              </p>
              <p className="text-center text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {confirmDel.label}
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={confirmDel.onConfirm}
                  className="flex-1 py-3 rounded-2xl font-bold text-sm"
                  style={{ background: '#dc2626', color: '#fff' }}
                >כן, מחק</button>
                <button
                  onClick={() => { setConfirmDel(null); setSwipedKey(null); }}
                  className="flex-1 py-3 rounded-2xl text-sm"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                >ביטול</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Bottom action bar ── */}
      <div className="fixed bottom-0 inset-x-0 z-20 p-4 bg-slate-900/95 backdrop-blur border-t border-slate-700" dir="rtl">
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={copyOrder}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl
                        font-bold text-base transition-all duration-150 touch-manipulation
                        ${copyDone ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
          >
            <span className="text-xl">{copyDone ? '✅' : '📋'}</span>
            {copyDone ? 'הועתק!' : 'העתק הזמנה'}
          </button>
          <button
            onClick={downloadPDF}
            disabled={pdfLoading || totalItems === 0}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl
                       font-bold text-base bg-blue-700 text-white hover:bg-blue-600
                       transition-all duration-150 touch-manipulation
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="text-xl">{pdfLoading ? '⏳' : '📄'}</span>
            {pdfLoading ? 'מייצר...' : 'הורד PDF'}
          </button>
        </div>
      </div>

      {/* ── Hidden print template ── */}
      <div
        ref={printRef}
        style={{
          display: 'none', position: 'fixed', left: '-9999px', top: 0,
          width: '794px', backgroundColor: '#ffffff', padding: '48px',
          fontFamily: 'Arial, Helvetica, sans-serif', direction: 'rtl', color: '#111',
        }}
      >
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1e293b', paddingBottom: '20px', marginBottom: '28px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>🍽️ וילה אכדיה</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#334155' }}>
            הזמנה — {selectedSupplier.name}
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', marginTop: '6px' }}>{todayLabel()}</div>
        </div>

        {[...allCategories, ...(oneTimeItems.length > 0 ? [{ name: 'הזמנה חד פעמית', emoji: '⏱', items: oneTimeItems.map(i => i.name) }] : [])].map(cat => {
          const active = cat.items.filter(item => getQty(quantities, item) > 0);
          if (!active.length) return null;
          return (
            <div key={cat.name} style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '15px', fontWeight: 'bold', backgroundColor: '#f1f5f9', padding: '8px 14px', borderRadius: '6px', marginBottom: '8px', borderRight: '4px solid #0f172a' }}>
                {cat.emoji} {cat.name}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {active.map((item, i) => (
                    <tr key={item} style={{ backgroundColor: i % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                      <td style={{ padding: '7px 14px', fontSize: '14px', borderBottom: '1px solid #e2e8f0' }}>{item}</td>
                      <td style={{ padding: '7px 14px', fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', color: '#1e40af', textAlign: 'left' }}>
                        {getQty(quantities, item)} {getUnit(quantities, item)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        <div style={{ marginTop: '32px', borderTop: '1px solid #cbd5e1', paddingTop: '12px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
          סה״כ {totalItems} פריטים | הודפס מתוך מערכת וילה אכדיה
        </div>
      </div>

    </div>
  );
}

// ── Reusable item row ──
function ItemRow({ item, qty, unit, active, badge, onMinus, onPlus, onToggleUnit }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-3 transition-colors duration-150 ${active ? 'bg-slate-700/30' : ''}`}>
      <span className={`flex-1 text-base font-medium ${active ? 'text-white' : 'text-slate-400'}`}>
        {item}
        {badge && (
          <span className="mr-2 text-xs px-1.5 py-0.5 rounded-md bg-amber-900/60 text-amber-400 font-semibold">
            {badge}
          </span>
        )}
      </span>

      {/* Unit toggle */}
      <button
        onClick={onToggleUnit}
        className={`flex-shrink-0 w-12 h-9 rounded-lg text-xs font-bold border
                    transition-all duration-150 touch-manipulation select-none
                    ${unit === 'ק"ג' ? 'bg-amber-900/60 border-amber-700 text-amber-300' : 'bg-slate-700 border-slate-600 text-slate-400'}`}
      >
        {unit}
      </button>

      {/* Counter */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={onMinus} disabled={qty === 0}
          className="w-11 h-11 rounded-xl bg-slate-700 active:bg-slate-600 text-white font-black text-2xl
                     flex items-center justify-center transition-colors duration-100
                     disabled:opacity-25 disabled:cursor-not-allowed select-none touch-manipulation">
          −
        </button>
        <span className={`w-8 text-center font-black text-xl tabular-nums select-none ${active ? 'text-white' : 'text-slate-600'}`}>
          {active ? qty : '·'}
        </span>
        <button onClick={onPlus}
          className="w-11 h-11 rounded-xl bg-slate-700 active:bg-slate-600 text-white font-black text-2xl
                     flex items-center justify-center transition-colors duration-100 select-none touch-manipulation">
          +
        </button>
      </div>

    </div>
  );
}
