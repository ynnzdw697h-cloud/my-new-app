import { useState } from 'react';
import { Package, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeliveries } from '../../hooks/useDeliveries';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useTenantId } from '../../context/TenantContext';
import ScanStep from './ScanStep';

const STATUS_LABEL = {
  pending:   'ממתין',
  reviewing: 'בבדיקה',
  approved:  'אושר',
  disputed:  'בסכסוך',
};
const STATUS_COLOR = {
  pending:   '#F59E0B',
  reviewing: '#3B82F6',
  approved:  '#10B981',
  disputed:  '#EF4444',
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function CheckerHub({ user, onOpenDelivery }) {
  const tenantId                    = useTenantId();
  const [deliveries, setDeliveries] = useDeliveries();
  const [showScan, setShowScan]     = useState(false);

  const today     = todayISO();
  const todayList = deliveries.filter(d => d.deliveryDate === today);
  const totalVal  = todayList.reduce((s, d) => s + (d.invoiceTotal || 0), 0);

  const counts = { approved: 0, disputed: 0, reviewing: 0, pending: 0 };
  todayList.forEach(d => { if (counts[d.status] !== undefined) counts[d.status]++; });

  async function handleDeliverySaved(deliveryDoc) {
    // Write full doc
    await setDoc(doc(db, 'tenants', tenantId, 'kitchen', deliveryDoc.id), deliveryDoc);
    // Update index
    const entry = {
      id: deliveryDoc.id,
      supplierName: deliveryDoc.supplierName,
      supplierId: deliveryDoc.supplierId,
      deliveryDate: deliveryDoc.deliveryDate,
      createdAt: deliveryDoc.createdAt,
      status: deliveryDoc.status,
      invoiceNumber: deliveryDoc.invoiceNumber,
      invoiceTotal: deliveryDoc.invoiceTotal,
      disputedTotal: deliveryDoc.disputedTotal,
      itemCount: deliveryDoc.items.length,
    };
    setDeliveries(prev => {
      const without = prev.filter(d => d.id !== entry.id);
      return [entry, ...without];
    });
    setShowScan(false);
    onOpenDelivery(deliveryDoc.id);
  }

  return (
    <div className="px-4 py-5 space-y-4 max-w-xl mx-auto" dir="rtl">

      {/* Hero */}
      <div
        className="relative rounded-3xl overflow-hidden p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(255,255,255,0.02) 70%, #16161e 100%)',
          border: '1px solid rgba(16,185,129,0.25)',
          boxShadow: '0 8px 40px rgba(16,185,129,0.18)',
        }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20 pointer-events-none"
          style={{ background: '#10B981', filter: 'blur(55px)' }} />
        <p className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="text-2xl font-black text-white mb-1">קבלת סחורה</h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          היום קיבלת <span style={{ color: '#10B981', fontWeight: 700 }}>{todayList.length}</span> משלוחים
          {totalVal > 0 && <> — <span style={{ color: '#10B981', fontWeight: 700 }}>₪{totalVal.toLocaleString('he-IL', { minimumFractionDigits: 0 })}</span> סה״כ</>}
        </p>

        {/* Status chips */}
        {todayList.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {Object.entries(counts).filter(([, n]) => n > 0).map(([s, n]) => (
              <span key={s} className="text-xs font-bold rounded-full px-3 py-1"
                style={{ background: STATUS_COLOR[s] + '22', color: STATUS_COLOR[s], border: `1px solid ${STATUS_COLOR[s]}44` }}>
                {STATUS_LABEL[s]} {n}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Delivery list */}
      {deliveries.length === 0 ? (
        <div className="rounded-3xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex justify-center mb-3">
            <Package size={40} style={{ color: 'rgba(255,255,255,0.15)' }} strokeWidth={1.25} />
          </div>
          <p className="text-white font-bold">אין משלוחים עדיין</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>לחץ + כדי לסרוק חשבונית</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((d, index) => {
            const isToday = d.deliveryDate === today;
            return (
              <motion.button
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.2) }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpenDelivery(d.id)}
                className="w-full rounded-3xl p-5 text-right"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <Truck size={18} style={{ color: '#10B981' }} strokeWidth={1.5} />
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{d.supplierName}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {d.invoiceNumber ? `חשבונית ${d.invoiceNumber}` : 'ללא מספר'} · {d.itemCount} פריטים
                        {!isToday && ` · ${d.deliveryDate}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-left flex flex-col items-end gap-1">
                    <span className="text-xs font-bold rounded-full px-3 py-1"
                      style={{ background: STATUS_COLOR[d.status] + '22', color: STATUS_COLOR[d.status] }}>
                      {STATUS_LABEL[d.status]}
                    </span>
                    {d.invoiceTotal > 0 && (
                      <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        ₪{d.invoiceTotal.toLocaleString('he-IL', { minimumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setShowScan(true)}
        className="fixed bottom-28 left-5 z-20 flex items-center gap-2 rounded-2xl px-5 py-3.5 font-bold text-white text-sm"
        style={{ background: '#10B981', boxShadow: '0 4px 24px rgba(16,185,129,0.5)' }}
      >
        <span className="text-lg">+</span>
        סרוק חשבונית
      </motion.button>

      {/* Scan modal */}
      <AnimatePresence>
        {showScan && (
          <ScanStep
            user={user}
            onSaved={handleDeliverySaved}
            onCancel={() => setShowScan(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
