import { useState } from 'react';
import { motion } from 'framer-motion';
import { SUPPLIERS } from '../../data/suppliers';

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function ReviewStep({ ocrResult, supplierId, invoiceImageBase64, user, onSaved, onBack }) {
  const supplier = SUPPLIERS.find(s => s.id === supplierId) || SUPPLIERS[0];

  const [supplierName, setSupplierName] = useState(ocrResult.supplierName || supplier.name);
  const [invoiceNumber, setInvoiceNumber] = useState(ocrResult.invoiceNumber || '');
  const [invoiceDate, setInvoiceDate]     = useState(ocrResult.invoiceDate   || todayISO());
  const [items, setItems] = useState(
    (ocrResult.items || []).map((it, i) => ({
      id:          `item_${i}`,
      name:        it.name        || '',
      unit:        it.unit        || 'יח׳',
      orderedQty:  Number(it.orderedQty)  || 0,
      receivedQty: Number(it.orderedQty)  || 0,
      unitPrice:   Number(it.unitPrice)   || 0,
      get lineTotal() { return this.orderedQty * this.unitPrice; },
      itemStatus:  'ok',
      issue:       null,
    }))
  );
  const [saving, setSaving] = useState(false);

  function updateItem(idx, field, value) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  function addRow() {
    setItems(prev => [...prev, {
      id: `item_${Date.now()}`, name: '', unit: 'יח׳',
      orderedQty: 0, receivedQty: 0, unitPrice: 0, itemStatus: 'ok', issue: null,
    }]);
  }

  function removeRow(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    const ts  = Date.now();
    const id  = `delivery_${todayISO()}_${supplierId}_${ts}`;
    const itemsWithTotals = items.map(it => ({
      ...it,
      lineTotal: (it.orderedQty * it.unitPrice),
    }));
    const invoiceTotal  = itemsWithTotals.reduce((s, it) => s + it.lineTotal, 0);

    const deliveryDoc = {
      id,
      supplierId,
      supplierName,
      invoiceNumber,
      invoiceDate,
      deliveryDate:       todayISO(),
      createdAt:          ts,
      createdBy:          user,
      status:             'reviewing',
      invoiceImageBase64: invoiceImageBase64 || null,
      ocrRawJson:         ocrResult,
      items:              itemsWithTotals,
      invoiceTotal,
      disputedTotal:      0,
      rma:                null,
    };
    await onSaved(deliveryDoc);
    setSaving(false);
  }

  const total = items.reduce((s, it) => s + (it.orderedQty * it.unitPrice), 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0d0d0d' }} dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between p-5 pt-12">
        <button onClick={onBack} className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>
          ← חזרה
        </button>
        <h2 className="text-white font-black text-lg">בדוק ואשר</h2>
        <div style={{ width: 60 }} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32 space-y-5">

        {/* Header fields */}
        <div className="rounded-3xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Field label="ספק" value={supplierName} onChange={setSupplierName} />
          <Field label="מספר חשבונית" value={invoiceNumber} onChange={setInvoiceNumber} placeholder="לא זוהה" />
          <Field label="תאריך" value={invoiceDate} onChange={setInvoiceDate} type="date" />
        </div>

        {/* Items */}
        <div>
          <p className="text-sm font-bold mb-3 px-1" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>
            פריטים ({items.length})
          </p>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <motion.div
                key={it.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex gap-2 mb-3">
                  <input
                    value={it.name}
                    onChange={e => updateItem(idx, 'name', e.target.value)}
                    placeholder="שם פריט"
                    className="flex-1 rounded-xl px-3 py-2 text-sm text-white font-semibold"
                    style={{ background: 'rgba(255,255,255,0.07)', border: 'none', outline: 'none', textAlign: 'right' }}
                  />
                  <button onClick={() => removeRow(idx)} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontSize: 16 }}>✕</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <NumField label='כמות' value={it.orderedQty} onChange={v => updateItem(idx, 'orderedQty', v)} />
                  <NumField label='מחיר ₪' value={it.unitPrice} onChange={v => updateItem(idx, 'unitPrice', v)} step="0.1" />
                  <div className="rounded-xl px-2 py-1 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>סה״כ</p>
                    <p className="text-sm font-bold text-white">₪{(it.orderedQty * it.unitPrice).toFixed(0)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <button onClick={addRow}
            className="w-full rounded-2xl py-3 mt-3 font-semibold text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}>
            + הוסף שורה
          </button>
        </div>

        {/* Total */}
        {total > 0 && (
          <div className="rounded-2xl px-5 py-3 flex justify-between items-center"
            style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>סה״כ חשבונית</span>
            <span className="font-black text-xl" style={{ color: '#10B981' }}>
              ₪{total.toLocaleString('he-IL', { minimumFractionDigits: 0 })}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 inset-x-0 p-5" style={{ background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(20px)' }}>
        <button
          onClick={handleSave}
          disabled={saving || items.length === 0}
          className="w-full rounded-2xl py-4 font-black text-white text-base"
          style={{
            background: saving || items.length === 0 ? 'rgba(16,185,129,0.4)' : '#10B981',
            boxShadow: '0 0 20px rgba(16,185,129,0.4)',
          }}
        >
          {saving ? 'שומר...' : '✓ שמור משלוח'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="w-full rounded-xl px-4 py-2.5 text-sm text-white font-semibold"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', outline: 'none', textAlign: 'right' }}
      />
    </div>
  );
}

function NumField({ label, value, onChange, step = '1' }) {
  return (
    <div className="rounded-xl px-2 py-1 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
      <input
        type="number"
        value={value}
        step={step}
        min="0"
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full text-center text-sm font-bold text-white"
        style={{ background: 'transparent', border: 'none', outline: 'none' }}
      />
    </div>
  );
}
