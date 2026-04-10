import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDelivery } from '../../hooks/useDelivery';
import { useDeliveries } from '../../hooks/useDeliveries';
import IssueSheet from './IssueSheet';
import RmaGenerator from './RmaGenerator';

const STATUS_LABEL = { pending: 'ממתין', reviewing: 'בבדיקה', approved: 'אושר', disputed: 'בסכסוך' };
const STATUS_COLOR = { pending: '#F59E0B', reviewing: '#3B82F6', approved: '#10B981', disputed: '#EF4444' };
const ISSUE_LABEL  = { quality: 'איכות ירודה', missing_qty: 'כמות חסרה', expired: 'פג תוקף' };

export default function CheckerDetail({ deliveryId, user, onBack }) {
  const { delivery, loading, error, updateDelivery } = useDelivery(deliveryId);
  const [, setDeliveries]  = useDeliveries();
  const [activeItem, setActiveItem] = useState(null); // item being reported
  const [showRma, setShowRma]       = useState(false);
  const [saving, setSaving]         = useState(false);

  function syncIndex(newStatus, newDisputed) {
    setDeliveries(prev => prev.map(d =>
      d.id === deliveryId ? { ...d, status: newStatus, disputedTotal: newDisputed } : d
    ));
  }

  async function updateReceivedQty(itemId, qty) {
    if (!delivery) return;
    const items = delivery.items.map(it => it.id === itemId ? { ...it, receivedQty: qty } : it);
    await updateDelivery({ items });
  }

  async function saveIssue(itemId, issueData) {
    if (!delivery) return;
    const items = delivery.items.map(it =>
      it.id === itemId
        ? { ...it, itemStatus: 'issue', issue: issueData }
        : it
    );
    const hasIssue = items.some(it => it.itemStatus === 'issue');
    const disputed = items.filter(it => it.itemStatus === 'issue').reduce((s, it) => s + (it.lineTotal || 0), 0);
    const status   = hasIssue ? 'disputed' : delivery.status;
    await updateDelivery({ items, status, disputedTotal: disputed });
    syncIndex(status, disputed);
    setActiveItem(null);
  }

  async function clearIssue(itemId) {
    if (!delivery) return;
    const items = delivery.items.map(it =>
      it.id === itemId ? { ...it, itemStatus: 'ok', issue: null } : it
    );
    const hasIssue = items.some(it => it.itemStatus === 'issue');
    const disputed = items.filter(it => it.itemStatus === 'issue').reduce((s, it) => s + (it.lineTotal || 0), 0);
    const status   = hasIssue ? 'disputed' : 'reviewing';
    await updateDelivery({ items, status, disputedTotal: disputed });
    syncIndex(status, disputed);
  }

  async function confirmDelivery(forceApprove = false) {
    if (!delivery) return;
    setSaving(true);
    const hasIssue = delivery.items.some(it => it.itemStatus === 'issue');
    const newStatus = (forceApprove || !hasIssue) ? 'approved' : 'disputed';
    await updateDelivery({ status: newStatus });
    syncIndex(newStatus, delivery.disputedTotal || 0);
    setSaving(false);
  }

  async function handleRmaSent(via) {
    const rma = {
      generatedAt: delivery.rma?.generatedAt || Date.now(),
      generatedBy: user,
      messageText: '',
      sentAt:      Date.now(),
      sentVia:     via,
    };
    await updateDelivery({ rma });
    setShowRma(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-white opacity-40">טוען...</p>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-white opacity-40">שגיאה בטעינת המשלוח</p>
        <button onClick={onBack} className="text-sm font-semibold" style={{ color: '#10B981' }}>← חזרה</button>
      </div>
    );
  }

  const statusColor = STATUS_COLOR[delivery.status] || '#888';
  const hasIssues   = delivery.items.some(it => it.itemStatus === 'issue');

  if (showRma) {
    return (
      <RmaGenerator
        delivery={delivery}
        user={user}
        onClose={() => setShowRma(false)}
        onRmaSent={handleRmaSent}
      />
    );
  }

  return (
    <div className="pb-32" dir="rtl">

      {/* Header card */}
      <div className="mx-4 mt-4 rounded-3xl p-5"
        style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${statusColor}30` }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold rounded-full px-3 py-1"
            style={{ background: statusColor + '22', color: statusColor }}>
            {STATUS_LABEL[delivery.status]}
          </span>
          <div className="text-right">
            <p className="text-white font-black text-lg">{delivery.supplierName}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {delivery.invoiceNumber ? `חשבונית ${delivery.invoiceNumber}` : 'ללא מספר חשבונית'} · {delivery.invoiceDate}
            </p>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {delivery.items.length} פריטים
          </span>
          <span className="text-xl font-black" style={{ color: statusColor }}>
            ₪{(delivery.invoiceTotal || 0).toLocaleString('he-IL', { minimumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="mx-4 mt-4 space-y-2">
        {delivery.items.map(item => {
          const hasIssue = item.itemStatus === 'issue';
          return (
            <motion.div
              key={item.id}
              layout
              className="rounded-2xl p-4"
              style={{
                background: hasIssue ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                border: hasIssue ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="text-right flex-1">
                  <p className="text-white font-bold">{item.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    הוזמן: {item.orderedQty} {item.unit} · ₪{item.unitPrice}/{item.unit}
                  </p>
                </div>
                <span className="text-sm font-black flex-shrink-0"
                  style={{ color: hasIssue ? '#EF4444' : 'rgba(255,255,255,0.5)' }}>
                  ₪{(item.lineTotal || 0).toFixed(0)}
                </span>
              </div>

              {/* Received qty stepper */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>התקבל</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateReceivedQty(item.id, Math.max(0, (item.receivedQty || 0) - 1))}
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-lg"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
                  >−</button>
                  <span className="text-white font-black text-base min-w-[2.5rem] text-center">
                    {item.receivedQty ?? item.orderedQty}
                  </span>
                  <button
                    onClick={() => updateReceivedQty(item.id, (item.receivedQty || 0) + 1)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-lg"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
                  >+</button>
                </div>
              </div>

              {/* Issue area */}
              <AnimatePresence>
                {hasIssue && item.issue && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl p-3 mb-3"
                    style={{ background: 'rgba(239,68,68,0.12)' }}
                  >
                    <p className="text-xs font-bold" style={{ color: '#EF4444' }}>
                      🔴 {ISSUE_LABEL[item.issue.type] || 'בעיה'}
                      {item.issue.note ? ` — ${item.issue.note}` : ''}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="flex gap-2">
                {hasIssue ? (
                  <button
                    onClick={() => clearIssue(item.id)}
                    className="flex-1 rounded-xl py-2 text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
                  >
                    בטל דיווח
                  </button>
                ) : null}
                <button
                  onClick={() => setActiveItem(item)}
                  className="flex-1 rounded-xl py-2 text-xs font-bold"
                  style={{
                    background: hasIssue ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)',
                    color:      hasIssue ? '#EF4444' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {hasIssue ? '✏️ ערוך דיווח' : '⚠ דווח בעיה'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 inset-x-0 p-4 pb-24"
        style={{ background: 'rgba(13,13,13,0.96)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {hasIssues ? (
          <div className="flex gap-3">
            <button
              onClick={() => confirmDelivery(true)}
              disabled={saving}
              className="flex-1 rounded-2xl py-3.5 font-bold text-sm"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
            >
              {saving ? '...' : '✓ אשר בכל זאת'}
            </button>
            <button
              onClick={() => setShowRma(true)}
              className="flex-1 rounded-2xl py-3.5 font-black text-sm text-white"
              style={{ background: '#EF4444', boxShadow: '0 0 20px rgba(239,68,68,0.35)' }}
            >
              צור RMA ←
            </button>
          </div>
        ) : (
          <button
            onClick={confirmDelivery}
            disabled={saving || delivery.status === 'approved'}
            className="w-full rounded-2xl py-4 font-black text-white text-base"
            style={{
              background: delivery.status === 'approved' ? 'rgba(16,185,129,0.3)' : '#10B981',
              boxShadow: delivery.status === 'approved' ? 'none' : '0 0 20px rgba(16,185,129,0.4)',
            }}
          >
            {saving ? '...' : delivery.status === 'approved' ? '✅ משלוח אושר' : '✓ אשר משלוח'}
          </button>
        )}
      </div>

      {/* Issue bottom sheet */}
      {activeItem && (
        <IssueSheet
          item={activeItem}
          user={user}
          onSave={issueData => saveIssue(activeItem.id, issueData)}
          onClose={() => setActiveItem(null)}
        />
      )}
    </div>
  );
}
