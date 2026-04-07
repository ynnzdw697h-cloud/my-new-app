import { useState } from 'react';
import { SUPPLIERS } from '../../data/suppliers';

const ISSUE_LABEL = {
  quality:     'איכות ירודה',
  missing_qty: 'כמות חסרה',
  expired:     'פג תוקף',
};

function buildMessage(delivery) {
  const sup       = SUPPLIERS.find(s => s.id === delivery.supplierId);
  const issues    = (delivery.items || []).filter(it => it.itemStatus === 'issue');
  const disputed  = issues.reduce((s, it) => s + (it.lineTotal || 0), 0);

  const lines = issues.map(it => {
    const base = `• ${it.name} — ${ISSUE_LABEL[it.issue?.type] || 'בעיה'}`;
    return it.issue?.note ? `${base} — ${it.issue.note}` : base;
  }).join('\n');

  return `שלום ${sup?.name || delivery.supplierName},

בתאריך ${delivery.invoiceDate} קיבלנו את המשלוח שלך${delivery.invoiceNumber ? ` (חשבונית ${delivery.invoiceNumber})` : ''}.
נתגלו הבעיות הבאות:

${lines}

סה״כ ערך השנוי במחלוקת: ₪${disputed.toLocaleString('he-IL', { minimumFractionDigits: 0 })}

אנו מבקשים זיכוי/החזר עבור הפריטים לעיל.
תודה,
מסעדת וילה אכדיה`;
}

export default function RmaGenerator({ delivery, user, onClose, onRmaSent }) {
  const [copied, setCopied] = useState(false);
  const message               = buildMessage(delivery);
  const sup                   = SUPPLIERS.find(s => s.id === delivery.supplierId);
  const disputed              = (delivery.items || [])
    .filter(it => it.itemStatus === 'issue')
    .reduce((s, it) => s + (it.lineTotal || 0), 0);

  async function handleCopy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onRmaSent('clipboard');
  }

  function handleWhatsApp() {
    if (!sup?.whatsapp) return;
    const url = `https://wa.me/${sup.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    onRmaSent('whatsapp');
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0d0d0d' }} dir="rtl">
      <div className="flex items-center justify-between p-5 pt-12">
        <button onClick={onClose} className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>← חזרה</button>
        <h2 className="text-white font-black text-lg">הודעת RMA</h2>
        <div style={{ width: 60 }} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-5">

        {/* Summary */}
        <div className="rounded-3xl p-5 flex items-center justify-between"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <div>
            <p className="text-white font-bold">{sup?.name || delivery.supplierName}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {(delivery.items || []).filter(i => i.itemStatus === 'issue').length} פריטים בבעיה
            </p>
          </div>
          <div className="text-left">
            <p className="text-2xl font-black" style={{ color: '#EF4444' }}>
              ₪{disputed.toLocaleString('he-IL', { minimumFractionDigits: 0 })}
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>לזיכוי</p>
          </div>
        </div>

        {/* Message preview */}
        <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-bold mb-3" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>תצוגה מקדימה</p>
          <pre className="text-sm text-white whitespace-pre-wrap leading-relaxed font-sans">{message}</pre>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 rounded-2xl py-4 font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)', color: copied ? '#10B981' : 'white' }}
          >
            {copied ? '✅ הועתק!' : '📋 העתק'}
          </button>
          {sup?.whatsapp ? (
            <button
              onClick={handleWhatsApp}
              className="flex-1 rounded-2xl py-4 font-bold text-sm flex items-center justify-center gap-2 text-white"
              style={{ background: '#25D366', boxShadow: '0 0 20px rgba(37,211,102,0.3)' }}
            >
              💬 שלח ב-WhatsApp
            </button>
          ) : (
            <button
              className="flex-1 rounded-2xl py-4 font-bold text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', cursor: 'not-allowed' }}
              disabled
            >
              💬 אין מספר WA
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
