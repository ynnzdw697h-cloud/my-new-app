import { useState, useEffect, useRef } from 'react';
import { useFirestoreSet } from '../hooks/useFirestoreSet';
import { motion } from 'framer-motion';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTenantId } from '../context/TenantContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SUPPLIERS } from '../data/suppliers';
import { Card, Button, Input, Sheet } from './ui';
import { ChevronRight, Plus, RotateCcw, Copy, FileDown, Clock, Trash2, Carrot, Fish, Package, Truck } from 'lucide-react';

/* ─── Swipe-right-to-reveal delete (RTL) ─── */
function SwipeableItemRow({ rowKey, swipedKey, setSwipedKey, onDeleteRequest, children }) {
  if (!onDeleteRequest) return <>{children}</>;
  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 flex items-center justify-center"
        style={{ width: 72, zIndex: 0, background: 'var(--sem-danger, #ef4444)' }}
      >
        <button
          onClick={onDeleteRequest}
          className="w-full h-full text-white font-bold text-lg"
          aria-label="מחק פריט"
        >
          <Trash2 size={18} className="mx-auto" strokeWidth={2} />
        </button>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 72 }}
        dragElastic={0.05}
        animate={{ x: swipedKey === rowKey ? 72 : 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 36) setSwipedKey(rowKey);
          else setSwipedKey(null);
        }}
        onClick={() => { if (swipedKey === rowKey) setSwipedKey(null); }}
        style={{ touchAction: 'pan-y', position: 'relative', zIndex: 1, background: 'var(--bg-surface)' }}
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
  const [customItems,   setCustomItems]   = useState([]);
  const [oneTimeItems,  setOneTimeItems]  = useState([]);
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
  const printRef  = useRef(null);
  const qRef      = useRef(quantities);
  const customRef = useRef(customItems);
  const oneTimeRef = useRef(oneTimeItems);

  useEffect(() => { qRef.current = quantities; },    [quantities]);
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
      <div className="p-5 md:p-6 space-y-4 max-w-2xl mx-auto" dir="rtl">
        <p className="text-body text-text-secondary px-1">בחר ספק להזמנה</p>

        <div className="space-y-3">
          {SUPPLIERS.map(supplier => (
            <Card
              key={supplier.id}
              padded={false}
              tappable
              onClick={() => setSelectedSupplier(supplier)}
            >
              <div className="flex items-center justify-between px-5 py-5">
                <div className="flex items-center gap-4">
                  <SupplierIcon supplier={supplier} />
                  <div>
                    <p className="text-h3 text-text-primary font-bold">{supplier.name}</p>
                    <p className="text-meta text-text-tertiary mt-0.5">{supplier.type}</p>
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  strokeWidth={1.5}
                  style={{ color: 'rgba(255,255,255,0.5)', transform: 'rotate(180deg)' }}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // ── ORDER PAGE ──
  // ═══════════════════════════════════════════════════════
  return (
    <div className="p-5 md:p-6 space-y-4 pb-36" dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedSupplier(null); setOneTimeItems([]); setShowAddForm(false); }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            aria-label="חזרה לרשימת ספקים"
          >
            <ChevronRight size={18} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.55)' }} />
          </button>
          <div>
            <h2 className="text-h2 text-text-primary flex items-center gap-2">
              <SupplierIcon supplier={selectedSupplier} size="sm" />
              {selectedSupplier.name}
            </h2>
            <p className="text-meta text-text-tertiary">
              {totalItems > 0 ? `${totalItems} פריטים נבחרו` : 'אין פריטים עדיין'}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          icon={RotateCcw}
          onClick={() => setConfirmReset(true)}
        >
          איפוס
        </Button>
      </div>

      {/* ── Permanent categories ── */}
      {allCategories.map(cat => {
        const selectedInCat = cat.items.filter(item => getQty(quantities, item) > 0).length;
        return (
          <Card key={cat.name} padded={false}>
            <div
              className="flex items-center gap-2.5 px-5 py-3.5"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-lg">{cat.emoji}</span>
              <h3 className="text-h3 text-text-primary flex-1">{cat.name}</h3>
              {selectedInCat > 0 && (
                <span className="text-label font-bold px-2.5 py-1 rounded-xl"
                  style={{ background: 'rgba(212,237,49,0.12)', color: '#d4ed31' }}>
                  {selectedInCat}
                </span>
              )}
            </div>
            <div>
              {cat.items.map((item, i) => {
                const qty    = getQty(quantities, item);
                const unit   = getUnit(quantities, item);
                const active = qty > 0;
                const customEntry = customRef.current.find(c => c.name === item);
                const deleteFn = () => setConfirmDel({
                  key: item,
                  label: item,
                  onConfirm: () => {
                    if (customEntry) {
                      removeCustomItem(customEntry.id);
                    } else {
                      setHiddenItems(prev => { const next = new Set(prev); next.add(item); return next; });
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
                      isLast={i === cat.items.length - 1}
                      onMinus={() => changeQty(item, -1)}
                      onPlus={() => changeQty(item, +1)}
                      onToggleUnit={() => toggleUnit(item)}
                    />
                  </SwipeableItemRow>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* ── One-time items ── */}
      {oneTimeItems.length > 0 && (
        <Card padded={false}>
          <div
            className="flex items-center gap-2.5 px-5 py-3.5"
            style={{
              borderBottom: '1px solid var(--border)',
              background: 'rgba(251,191,36,0.06)',
            }}
          >
            <Clock size={16} strokeWidth={1.5} style={{ color: '#fbbf24' }} />
            <h3 className="text-h3 flex-1" style={{ color: '#fbbf24' }}>הזמנה חד פעמית</h3>
            <span className="text-meta text-text-tertiary">יימחקו לאחר שליחה</span>
          </div>
          <div>
            {oneTimeItems.map((item, i) => {
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
                    isLast={i === oneTimeItems.length - 1}
                    onMinus={() => changeQty(item.name, -1)}
                    onPlus={() => changeQty(item.name, +1)}
                    onToggleUnit={() => toggleUnit(item.name)}
                  />
                </SwipeableItemRow>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Add item button ── */}
      <button
        onClick={openAddForm}
        className="w-full py-4 rounded-3xl text-label font-semibold transition-all duration-150 active:scale-[0.98]"
        style={{
          border: '1px dashed rgba(255,255,255,0.18)',
          color: 'rgba(255,255,255,0.62)',
        }}
      >
        <Plus size={16} className="inline ml-2" strokeWidth={2} />
        הוסף מוצר
      </button>

      {/* ── Add item sheet ── */}
      <Sheet
        open={showAddForm}
        onClose={() => { setShowAddForm(false); setAddName(''); }}
        title="הוספת מוצר"
      >
        <div className="space-y-4">
          <Input
            autoFocus
            placeholder="שם המוצר..."
            value={addName}
            onChange={e => setAddName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
          />

          <select
            value={addCategory}
            onChange={e => setAddCategory(e.target.value)}
            className="w-full px-4 py-3.5 rounded-2xl text-body text-text-primary outline-none transition-all duration-200"
            style={{
              background: 'var(--bg-inset)',
              border: '1px solid var(--border)',
            }}
          >
            {getCategoryOptions().map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          {/* Permanent toggle */}
          <button
            onClick={() => setAddPermanent(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-150 text-right"
            style={{
              background: addPermanent ? 'rgba(96,165,250,0.1)' : 'var(--bg-inset)',
              border: `1px solid ${addPermanent ? 'rgba(96,165,250,0.4)' : 'var(--border)'}`,
            }}
          >
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-150"
              style={{
                background: addPermanent ? '#60a5fa' : 'transparent',
                border: `2px solid ${addPermanent ? '#60a5fa' : 'rgba(255,255,255,0.3)'}`,
              }}
            >
              {addPermanent && (
                <svg className="w-3 h-3 text-[#0E0E0E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="text-right flex-1">
              <p className="text-label text-text-primary font-medium">הוסף לרשימה הקבועה</p>
              <p className="text-meta text-text-tertiary">
                {addPermanent ? 'יישמר לכל הזמנות הבאות' : 'חד פעמי — יימחק לאחר שליחת ההזמנה'}
              </p>
            </div>
          </button>

          <div className="flex gap-3 pt-1">
            <Button
              variant="primary"
              fullWidth
              onClick={addItem}
              disabled={!addName.trim()}
            >
              הוסף
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => { setShowAddForm(false); setAddName(''); }}
            >
              ביטול
            </Button>
          </div>
        </div>
      </Sheet>

      {/* ── Reset confirmation sheet ── */}
      <Sheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="לאפס את כל ההזמנה?"
      >
        <p className="text-body text-text-secondary mb-6">
          כל הכמויות יתאפסו לאפס. לא ניתן לבטל פעולה זו.
        </p>
        <div className="flex gap-3">
          <Button variant="danger" fullWidth onClick={resetAll}>כן, אפס הכל</Button>
          <Button variant="ghost" fullWidth onClick={() => setConfirmReset(false)}>ביטול</Button>
        </div>
      </Sheet>

      {/* ── Delete confirmation sheet ── */}
      <Sheet
        open={!!confirmDel}
        onClose={() => { setConfirmDel(null); setSwipedKey(null); }}
        title="למחוק מוצר זה?"
      >
        {confirmDel && (
          <>
            <p className="text-body text-text-secondary mb-1">המוצר יוסר מהרשימה:</p>
            <p className="text-h3 text-text-primary mb-6 font-bold">{confirmDel.label}</p>
            <div className="flex gap-3">
              <Button variant="danger" fullWidth onClick={confirmDel.onConfirm}>כן, מחק</Button>
              <Button variant="ghost" fullWidth onClick={() => { setConfirmDel(null); setSwipedKey(null); }}>ביטול</Button>
            </div>
          </>
        )}
      </Sheet>

      {/* ── Bottom action bar ── */}
      <div
        className="fixed inset-x-0 z-20 p-4 bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-0 md:right-72"
        style={{
          background: 'rgba(12,12,12,0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
        dir="rtl"
      >
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            variant={copyDone ? 'primary' : 'secondary'}
            fullWidth
            icon={Copy}
            onClick={copyOrder}
          >
            {copyDone ? 'הועתק!' : 'העתק הזמנה'}
          </Button>
          <Button
            variant="primary"
            fullWidth
            icon={FileDown}
            onClick={downloadPDF}
            disabled={pdfLoading || totalItems === 0}
          >
            {pdfLoading ? 'מייצר...' : 'הורד PDF'}
          </Button>
        </div>
      </div>

      {/* ── Hidden PDF print template ── */}
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

// ── Item row ──
function ItemRow({ item, qty, unit, active, isLast, onMinus, onPlus, onToggleUnit }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-3 transition-colors duration-150"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        background: active ? 'rgba(255,255,255,0.03)' : 'transparent',
      }}
    >
      <span className={`flex-1 text-body font-medium ${active ? 'text-text-primary' : 'text-text-tertiary'}`}>
        {item}
      </span>

      {/* Unit toggle */}
      <button
        onClick={onToggleUnit}
        className="flex-shrink-0 w-12 h-9 rounded-xl text-meta font-bold transition-all duration-150 touch-manipulation select-none"
        style={{
          background: unit === 'ק"ג' ? 'rgba(251,191,36,0.15)' : 'var(--bg-inset)',
          border: `1px solid ${unit === 'ק"ג' ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
          color: unit === 'ק"ג' ? '#fbbf24' : 'var(--text-tertiary)',
        }}
      >
        {unit}
      </button>

      {/* Counter */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onMinus}
          disabled={qty === 0}
          className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-2xl
                     text-text-primary transition-colors duration-100 disabled:opacity-25
                     disabled:cursor-not-allowed select-none touch-manipulation active:scale-90"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}
        >
          −
        </button>
        <span
          className={`w-8 text-center font-black text-xl tabular-nums select-none ${active ? 'text-text-primary' : 'text-text-tertiary'}`}
        >
          {active ? qty : '·'}
        </span>
        <button
          onClick={onPlus}
          className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-2xl
                     text-text-primary transition-colors duration-100 select-none touch-manipulation active:scale-90"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ─── Supplier icon tile (vector icon instead of emoji) ─── */
const SUPPLIER_ICONS = {
  aleh_aleh: { Icon: Carrot,  color: '#22C55E' },
  dagim:     { Icon: Fish,    color: '#38BDF8' },
  yavesh:    { Icon: Package, color: '#F59E0B' },
};

function SupplierIcon({ supplier, size = 'md' }) {
  const { Icon, color } = SUPPLIER_ICONS[supplier.id] || { Icon: Truck, color: '#A78BFA' };
  const box = size === 'sm' ? 'w-9 h-9 rounded-xl' : 'w-14 h-14 rounded-2xl';
  return (
    <span className={`${box} flex items-center justify-center flex-shrink-0`} style={{ background: color + '1F' }} aria-hidden="true">
      <Icon size={size === 'sm' ? 18 : 26} strokeWidth={1.75} style={{ color }} />
    </span>
  );
}
