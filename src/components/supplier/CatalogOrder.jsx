import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronRight, RotateCcw, Copy, Check, Send, Settings2, Eye,
  Apple, Citrus, Leaf, Salad, Carrot, Sprout,
} from 'lucide-react';
import { Card, Button } from '../ui';
import { UndoToast } from '../PrepCelebrations';
import { useTenantId } from '../../context/TenantContext';
import { useSupplierCatalog, appendOrderLog } from '../../hooks/useSupplierCatalog';
import { SESSION_KEY } from '../../data/chefs';
import {
  UNITS, defaultQty, parseQty, roundQty, formatQty, itemHint,
  tomorrowISO, buildOrderMessage, groupByCategory,
} from '../../data/supplierCatalog';
import CatalogManager from './CatalogManager';

// Display-only icons for category headers (neutral, like the rest of the supplier screen)
const CATEGORY_ICONS = {
  'פירות וירקות':        Apple,
  'בצלים, פירות ושונות': Citrus,
  'עשבי תיבול':          Leaf,
  'עלים וירוקים':        Salad,
  'שורשים ומיוחדים':     Carrot,
};

function sessionUser() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY))?.user || null; } catch { return null; }
}

/**
 * Catalog-driven order screen for one supplier (items come from Firestore).
 * Order draft is in-memory only: every time the screen opens it starts from defaults.
 */
export default function CatalogOrder({ supplier, icon, onBack }) {
  const tenantId = useTenantId();
  const [allItems, setAllItems, loaded] = useSupplierCatalog(supplier.id);

  const [tab,          setTab]          = useState('order'); // 'order' | 'manage'
  const [draft,        setDraft]        = useState({});      // { [itemId]: number | string }
  const [unitDraft,    setUnitDraft]    = useState({});      // { [itemId]: unit } — this order only
  const [deliveryDate, setDeliveryDate] = useState(tomorrowISO);
  const [notes,        setNotes]        = useState('');
  const [onlySelected, setOnlySelected] = useState(false);
  const [copyDone,     setCopyDone]     = useState(false);
  const [toast,        setToast]        = useState(null); // { id, text, undoable, undo }
  const toastTimer    = useRef(null);
  const lastLoggedRef = useRef(null);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const supplierItems = useMemo(
    () => allItems.filter(i => i.supplier === supplier.id),
    [allItems, supplier.id]
  );
  const activeItems = useMemo(() => supplierItems.filter(i => i.active), [supplierItems]);

  function qtyOf(item) {
    return item.id in draft ? parseQty(draft[item.id]) : defaultQty(item);
  }
  function rawOf(item) {
    if (item.id in draft) return String(draft[item.id]);
    const d = defaultQty(item);
    return d > 0 ? formatQty(d) : '';
  }

  function unitOf(item) {
    return unitDraft[item.id] || item.unit;
  }

  // Tap the unit chip: ק״ג → נספ״ק → יח׳ (+ צרור if that's the item's own unit). This order only.
  function toggleUnit(item) {
    const cycle = [...new Set(['kg', 'pack', 'unit', item.unit])];
    const next  = cycle[(cycle.indexOf(unitOf(item)) + 1) % cycle.length];
    setUnitDraft(prev => {
      const n = { ...prev };
      if (next === item.unit) delete n[item.id]; else n[item.id] = next;
      return n;
    });
  }

  function step(item, dir) {
    const u = unitOf(item);
    const s = (u === item.unit && item.step) || UNITS[u]?.defaultStep || 1;
    setDraft(prev => {
      const cur = item.id in prev ? parseQty(prev[item.id]) : defaultQty(item);
      return { ...prev, [item.id]: Math.max(0, roundQty(cur + dir * s)) };
    });
  }

  function typeQty(item, value) {
    const v = value.replace(',', '.');
    if (!/^\d*\.?\d*$/.test(v)) return;
    setDraft(prev => ({ ...prev, [item.id]: v }));
  }

  // Reset right away; "ביטול" in the toast restores everything (same pattern as the rest of the app)
  function resetAll() {
    const prev = { draft, unitDraft, notes, deliveryDate };
    setDraft({});
    setUnitDraft({});
    setNotes('');
    setDeliveryDate(tomorrowISO());
    lastLoggedRef.current = null;
    clearTimeout(toastTimer.current);
    setToast({
      id: Date.now(),
      text: 'ההזמנה חזרה לברירת מחדל',
      undoable: true,
      undo: () => { setDraft(prev.draft); setUnitDraft(prev.unitDraft); setNotes(prev.notes); setDeliveryDate(prev.deliveryDate); },
    });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  function handleUndo() {
    toast?.undo?.();
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  const lines = activeItems
    .map(item => ({ item: { ...item, unit: unitOf(item) }, qty: qtyOf(item) }))
    .filter(l => l.qty > 0);

  const isDefault = Object.keys(draft).length === 0 && Object.keys(unitDraft).length === 0 && !notes && deliveryDate === tomorrowISO();

  const message = buildOrderMessage({
    title:        supplier.orderTitle || 'הזמנה',
    supplierName: supplier.name,
    deliveryDate,
    lines,
    notes,
  });

  // Log once per distinct message (copy + WhatsApp of the same order = one entry)
  function logOrder(action) {
    if (lines.length === 0 || lastLoggedRef.current === message) return;
    lastLoggedRef.current = message;
    appendOrderLog(tenantId, {
      id:            `ord_${Date.now()}`,
      tenant_id:     tenantId,
      supplier:      supplier.id,
      delivery_date: deliveryDate,
      created_at:    new Date().toISOString(),
      created_by:    sessionUser(),
      action,
      notes:         notes.trim() || null,
      items:         lines.map(({ item, qty }) => ({
        item_id: item.id, name: item.name, qty: roundQty(qty), unit: item.unit,
      })),
    }).catch(err => console.error('[OrderLog] write failed:', err.code, err.message));
  }

  function copyOrder() {
    navigator.clipboard.writeText(message)
      .then(() => {
        logOrder('copy');
        setCopyDone(true);
        setTimeout(() => setCopyDone(false), 2000);
      })
      .catch(() => alert('לא ניתן להעתיק — נסה שוב'));
  }

  function sendWhatsApp() {
    logOrder('whatsapp');
    const phone = (supplier.whatsapp || '').replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  const categories = groupByCategory(
    onlySelected ? activeItems.filter(i => qtyOf(i) > 0) : activeItems
  );

  return (
    <div className="p-5 md:p-6 space-y-4 pb-36" dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={tab === 'manage' ? () => setTab('order') : () => { setToast(null); onBack(); }}
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-150 active:bg-white/10"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            aria-label={tab === 'manage' ? 'חזרה להזמנה' : 'חזרה לרשימת ספקים'}
          >
            <ChevronRight size={20} strokeWidth={1.75} style={{ color: 'rgba(255,255,255,0.75)' }} />
          </button>
          <div>
            <h2 className="text-h2 text-text-primary flex items-center gap-2">
              {icon}
              {tab === 'manage' ? `ניהול פריטים · ${supplier.name}` : supplier.name}
            </h2>
            <p className="text-meta text-text-tertiary">
              {tab === 'order'
                ? (lines.length > 0 ? `${lines.length} פריטים נבחרו` : 'אין פריטים עדיין')
                : `${supplierItems.length} פריטים בקטלוג`}
            </p>
          </div>
        </div>
        {tab === 'order' && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" icon={Settings2} onClick={() => setTab('manage')}>
              ניהול פריטים
            </Button>
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetAll} disabled={isDefault}>
              אפס לברירת מחדל
            </Button>
          </div>
        )}
      </div>

      {tab === 'manage' ? (
        <CatalogManager supplierId={supplier.id} allItems={allItems} setAllItems={setAllItems} />
      ) : (
        <>
          {/* ── Delivery date + filter ── */}
          <Card>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex-1 min-w-[180px] flex flex-col gap-1.5">
                <span className="text-base text-text-secondary px-1">תאריך אספקה</span>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full h-14 px-4 rounded-xl bg-bg-inset text-text-primary text-lg border border-border outline-none focus:border-white/40"
                  style={{ colorScheme: 'dark' }}
                />
              </label>
              <button
                onClick={() => setOnlySelected(v => !v)}
                aria-pressed={onlySelected}
                className="h-14 px-4 rounded-xl flex items-center gap-2 text-base font-semibold transition-colors duration-150"
                style={{
                  background: onlySelected ? 'rgba(255,255,255,0.08)' : 'var(--bg-inset)',
                  border: `1px solid ${onlySelected ? 'rgba(255,255,255,0.3)' : 'var(--border)'}`,
                  color: onlySelected ? '#fff' : 'var(--text-2)',
                }}
              >
                <Eye size={18} strokeWidth={1.75} />
                הצג רק מה שנבחר
              </button>
            </div>
          </Card>

          {!loaded && activeItems.length === 0 && (
            <p className="text-lg text-text-secondary text-center py-8">טוען פריטים…</p>
          )}
          {onlySelected && lines.length === 0 && (
            <p className="text-lg text-text-secondary text-center py-8">עוד לא נבחרו פריטים</p>
          )}

          {/* ── Categories ── */}
          {categories.map(cat => {
            const selected = cat.items.filter(i => qtyOf(i) > 0).length;
            const CatIcon  = CATEGORY_ICONS[cat.name] || Sprout;
            return (
              <Card key={cat.name} padded={false}>
                <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <CatIcon size={18} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.62)', flexShrink: 0 }} />
                  <h3 className="text-h3 text-text-primary flex-1">{cat.name}</h3>
                  {selected > 0 && (
                    <span className="text-base text-text-secondary tabular-nums">{selected} נבחרו</span>
                  )}
                </div>
                {cat.items.map((item, i) => (
                  <OrderRow
                    key={item.id}
                    item={item}
                    qty={qtyOf(item)}
                    raw={rawOf(item)}
                    unit={unitOf(item)}
                    onToggleUnit={() => toggleUnit(item)}
                    isLast={i === cat.items.length - 1}
                    onMinus={() => step(item, -1)}
                    onPlus={() => step(item, +1)}
                    onType={v => typeQty(item, v)}
                  />
                ))}
              </Card>
            );
          })}

          {/* ── Notes ── */}
          <Card>
            <label className="flex flex-col gap-1.5">
              <span className="text-base text-text-secondary px-1">הערות להזמנה</span>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="למשל: להגיע לפני 9:00"
                className="w-full px-4 py-3 rounded-xl bg-bg-inset text-text-primary text-lg border border-border outline-none focus:border-white/40 placeholder:text-text-tertiary resize-none"
              />
            </label>
          </Card>

          {/* ── Message preview ── */}
          <Card>
            <p className="text-base text-text-secondary mb-2">ההודעה שתישלח</p>
            <pre
              className="whitespace-pre-wrap text-lg text-text-primary rounded-xl p-4 font-[inherit]"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}
              data-testid="order-message"
            >
              {message}
            </pre>
          </Card>

          <UndoToast toast={toast} onUndo={handleUndo} position="bottom-[calc(170px+env(safe-area-inset-bottom))] md:bottom-28" />

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
                variant="secondary"
                fullWidth
                icon={copyDone ? Check : Copy}
                onClick={copyOrder}
                disabled={lines.length === 0}
              >
                {copyDone ? 'הועתק' : 'העתק הזמנה'}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                icon={Send}
                onClick={sendWhatsApp}
                disabled={lines.length === 0}
              >
                שלח בוואטסאפ
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Same look as ItemRow in SupplierOrder.jsx: name · unit chip · − qty +
// Unit chip toggles the unit for this order; the item's saved unit is set in "ניהול פריטים"
function OrderRow({ item, qty, raw, unit, onToggleUnit, isLast, onMinus, onPlus, onType }) {
  const active = qty > 0;
  const hint   = itemHint(item);
  const isKg   = unit === 'kg';
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 min-h-[64px] transition-colors duration-150"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        background: active ? 'rgba(255,255,255,0.03)' : 'transparent',
      }}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-lg font-medium ${active ? 'text-text-primary' : 'text-text-secondary'}`}>
          {item.name}
        </p>
        {hint && <p className="text-base text-text-tertiary">{hint}</p>}
      </div>

      {/* Unit toggle */}
      <button
        onClick={onToggleUnit}
        aria-label={`יחידה: ${UNITS[unit]?.label || unit}`}
        className="flex-shrink-0 w-14 h-12 rounded-xl text-base font-semibold transition-colors duration-150 touch-manipulation select-none"
        style={{
          background: isKg ? 'rgba(255,255,255,0.12)' : 'var(--bg-inset)',
          border: `1px solid ${isKg ? 'rgba(255,255,255,0.3)' : 'var(--border)'}`,
          color: isKg ? '#fff' : 'var(--text-2)',
        }}
      >
        {UNITS[unit]?.label || unit}
      </button>

      {/* Counter */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onMinus}
          disabled={qty === 0}
          aria-label={`הפחת ${item.name}`}
          className="w-12 h-12 rounded-xl flex items-center justify-center font-medium text-2xl
                     text-text-primary transition-colors duration-150 disabled:opacity-25
                     disabled:cursor-not-allowed select-none touch-manipulation active:bg-white/10"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}
        >
          −
        </button>
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          placeholder="·"
          onChange={e => onType(e.target.value)}
          onFocus={e => e.target.select()}
          aria-label={`כמות ${item.name}`}
          className={`w-12 text-center font-bold text-xl tabular-nums bg-transparent outline-none rounded-lg
                      placeholder:text-text-tertiary focus:bg-white/[0.06] ${active ? 'text-text-primary' : 'text-text-tertiary'}`}
        />
        <button
          onClick={onPlus}
          aria-label={`הוסף ${item.name}`}
          className="w-12 h-12 rounded-xl flex items-center justify-center font-medium text-2xl
                     text-text-primary transition-colors duration-150 select-none touch-manipulation active:bg-white/10"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}
        >
          +
        </button>
      </div>
    </div>
  );
}
