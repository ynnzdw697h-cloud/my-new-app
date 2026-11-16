import { useState, useMemo, useRef } from 'react';
import { ChevronRight, RotateCcw, Copy, Send, Settings2, ShoppingCart, Eye } from 'lucide-react';
import { Card, Button, Sheet } from '../ui';
import { useTenantId } from '../../context/TenantContext';
import { useSupplierCatalog, appendOrderLog } from '../../hooks/useSupplierCatalog';
import { SESSION_KEY } from '../../data/chefs';
import {
  UNITS, defaultQty, parseQty, roundQty, formatQty, itemHint,
  tomorrowISO, buildOrderMessage, groupByCategory,
} from '../../data/supplierCatalog';
import CatalogManager from './CatalogManager';

function sessionUser() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY))?.user || null; } catch { return null; }
}

/**
 * Catalog-driven order screen for one supplier (items come from Firestore).
 * Order draft is in-memory only: every time the screen opens it starts from defaults.
 */
export default function CatalogOrder({ supplier, onBack }) {
  const tenantId = useTenantId();
  const [allItems, setAllItems, loaded] = useSupplierCatalog(supplier.id);

  const [tab,          setTab]          = useState('order'); // 'order' | 'manage'
  const [draft,        setDraft]        = useState({});      // { [itemId]: number | string }
  const [deliveryDate, setDeliveryDate] = useState(tomorrowISO);
  const [notes,        setNotes]        = useState('');
  const [onlySelected, setOnlySelected] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [copyDone,     setCopyDone]     = useState(false);
  const lastLoggedRef = useRef(null);

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

  function step(item, dir) {
    const s = item.step || UNITS[item.unit]?.defaultStep || 1;
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

  function resetAll() {
    setDraft({});
    setNotes('');
    setDeliveryDate(tomorrowISO());
    setConfirmReset(false);
    lastLoggedRef.current = null;
  }

  const lines = activeItems
    .map(item => ({ item, qty: qtyOf(item) }))
    .filter(l => l.qty > 0);

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
    <div className="p-5 md:p-6 space-y-4 pb-36 max-w-3xl mx-auto" dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            aria-label="חזרה לרשימת ספקים"
          >
            <ChevronRight size={18} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.55)' }} />
          </button>
          <div>
            <h2 className="text-h2 text-text-primary">{supplier.name}</h2>
            <p className="text-meta text-text-tertiary">
              {tab === 'order'
                ? (lines.length > 0 ? `${lines.length} פריטים בהזמנה` : 'אין פריטים עדיין')
                : `${supplierItems.length} פריטים בקטלוג`}
            </p>
          </div>
        </div>
        {tab === 'order' && (
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setConfirmReset(true)}>
            אפס לברירת מחדל
          </Button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
        {[
          { id: 'order',  label: 'הזמנה',        Icon: ShoppingCart },
          { id: 'manage', label: 'ניהול פריטים', Icon: Settings2 },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="h-12 rounded-xl flex items-center justify-center gap-2 text-label font-semibold transition-all"
            style={tab === t.id
              ? { background: 'rgba(212,237,49,0.14)', color: '#d4ed31' }
              : { color: 'var(--text-tertiary)' }}
          >
            <t.Icon size={16} strokeWidth={1.75} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'manage' ? (
        <CatalogManager supplierId={supplier.id} allItems={allItems} setAllItems={setAllItems} />
      ) : (
        <>
          {/* ── Delivery date + filter ── */}
          <Card>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex-1 min-w-[180px] flex flex-col gap-1.5">
                <span className="text-label text-text-secondary px-1">תאריך אספקה</span>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full h-14 px-4 rounded-2xl bg-bg-inset text-text-primary text-body border border-border outline-none focus:border-accent"
                  style={{ colorScheme: 'dark' }}
                />
              </label>
              <button
                onClick={() => setOnlySelected(v => !v)}
                className="h-14 px-4 rounded-2xl flex items-center gap-2 text-label font-semibold transition-all"
                style={{
                  background: onlySelected ? 'rgba(212,237,49,0.14)' : 'var(--bg-inset)',
                  border: `1px solid ${onlySelected ? 'rgba(212,237,49,0.45)' : 'var(--border)'}`,
                  color: onlySelected ? '#d4ed31' : 'var(--text-secondary)',
                }}
                aria-pressed={onlySelected}
              >
                <Eye size={16} strokeWidth={1.75} />
                הצג רק מה שנבחר
              </button>
            </div>
          </Card>

          {!loaded && activeItems.length === 0 && (
            <p className="text-body text-text-tertiary text-center py-8">טוען פריטים…</p>
          )}
          {onlySelected && lines.length === 0 && (
            <p className="text-body text-text-tertiary text-center py-8">עוד לא נבחרו פריטים</p>
          )}

          {/* ── Categories ── */}
          {categories.map(cat => {
            const selected = cat.items.filter(i => qtyOf(i) > 0).length;
            return (
              <Card key={cat.name} padded={false}>
                <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <h3 className="text-h3 text-text-primary flex-1">{cat.name}</h3>
                  {selected > 0 && (
                    <span className="text-label font-bold px-2.5 py-1 rounded-xl"
                      style={{ background: 'rgba(212,237,49,0.12)', color: '#d4ed31' }}>
                      {selected}
                    </span>
                  )}
                </div>
                {cat.items.map((item, i) => (
                  <OrderRow
                    key={item.id}
                    item={item}
                    qty={qtyOf(item)}
                    raw={rawOf(item)}
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
              <span className="text-label text-text-secondary px-1">הערות להזמנה</span>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="למשל: להגיע לפני 9:00"
                className="w-full px-4 py-3 rounded-2xl bg-bg-inset text-text-primary text-body border border-border outline-none focus:border-accent placeholder:text-text-tertiary resize-none"
              />
            </label>
          </Card>

          {/* ── Message preview ── */}
          <Card>
            <p className="text-label text-text-secondary mb-2">ההודעה שתישלח</p>
            <pre
              className="whitespace-pre-wrap text-body text-text-primary rounded-2xl p-4 font-[inherit]"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}
              data-testid="order-message"
            >
              {message}
            </pre>
          </Card>

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
                disabled={lines.length === 0}
              >
                {copyDone ? 'הועתק!' : 'העתק הזמנה'}
              </Button>
              <Button
                variant="primary"
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

      {/* ── Reset confirmation ── */}
      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="לאפס לברירת מחדל?">
        <p className="text-body text-text-secondary mb-6">
          כל הכמויות וההערות יימחקו. פריטים קבועים יחזרו לכמות הקבועה שלהם, והתאריך יחזור למחר.
        </p>
        <div className="flex gap-3">
          <Button variant="danger" fullWidth onClick={resetAll}>כן, אפס</Button>
          <Button variant="ghost" fullWidth onClick={() => setConfirmReset(false)}>ביטול</Button>
        </div>
      </Sheet>
    </div>
  );
}

function OrderRow({ item, qty, raw, isLast, onMinus, onPlus, onType }) {
  const active = qty > 0;
  const hint   = itemHint(item);
  return (
    <div
      className="flex items-center gap-2 px-4 py-3 transition-colors duration-150"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        background: active ? 'rgba(212,237,49,0.07)' : 'transparent',
        boxShadow: active ? 'inset -3px 0 0 #d4ed31' : 'none',
      }}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-body ${active ? 'text-text-primary font-bold' : 'text-text-secondary font-medium'}`}>
          {item.name}
        </p>
        {hint && <p className="text-meta text-text-tertiary mt-0.5">{hint}</p>}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onMinus}
          disabled={qty === 0}
          aria-label={`הפחת ${item.name}`}
          className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-2xl text-text-primary disabled:opacity-25 select-none touch-manipulation active:scale-90"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}
        >
          −
        </button>
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          placeholder="0"
          onChange={e => onType(e.target.value)}
          onFocus={e => e.target.select()}
          aria-label={`כמות ${item.name}`}
          className={`w-14 h-11 rounded-xl text-center font-black text-lg tabular-nums outline-none bg-transparent border focus:border-accent ${active ? 'text-text-primary border-border' : 'text-text-tertiary border-transparent'}`}
        />
        <button
          onClick={onPlus}
          aria-label={`הוסף ${item.name}`}
          className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-2xl text-text-primary select-none touch-manipulation active:scale-90"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}
        >
          +
        </button>
        <span className="w-11 text-meta text-text-tertiary text-center">{UNITS[item.unit]?.label || item.unit}</span>
      </div>
    </div>
  );
}
