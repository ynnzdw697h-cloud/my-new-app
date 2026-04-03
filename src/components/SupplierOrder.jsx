import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const SUPPLIER_NAME = 'עלה עלה';
const DOC_ID = 'order_aleh_aleh';

const CATEGORIES = [
  {
    name: 'עגבניות ופירות',
    emoji: '🍅',
    items: ['ליים', 'תפוז', 'לימון', 'עגבניה אשכול', 'מגי', 'שרי תמר אדום', 'שרי עגול אדום', 'שרי צהוב', 'שרי מנומר', 'שושקה', 'תפוא באסטר', 'תפוא ראטה', 'אבוקדו', 'בננה', 'גרני סמית', 'אבטיח', 'מלון'],
  },
  {
    name: 'ירקות',
    emoji: '🥦',
    items: ['זוקיני', 'גזר', 'כרוב לבן', 'בצל סגול', 'בצל לבן', 'כרישה', 'מלון', 'ארטישוק ירושלמי', 'גינגר', 'שאלוט מוארך', 'מלפון', 'מלפון ארומטו', 'מלפון בייבי', 'קישוא מיני', 'ברוקולי', 'שעועית ירוקה', 'חציל', 'סלק', 'צנונית', 'צנונית אבטיח', 'חזרת', 'שום קלוף', 'מנגולד', 'פטל', 'אוכמניות', 'תותים', 'פאקוס', 'תרד', 'סלרי'],
  },
  {
    name: 'עלים ועשבי תיבול',
    emoji: '🌿',
    items: ['כוסברה', 'שמיר', 'זעתר', 'נענע', 'מרווה', 'עירית', 'סימין', 'בזיליקום', 'פסרוחזיליה', 'בצל ירוק', 'גרגיר', 'נקטרינה'],
  },
  {
    name: 'חסות ועלים',
    emoji: '🥬',
    items: ['מיזונה', 'עלי חרדל', 'עלי שומר', 'לאליק', 'חסה קיסר', 'בייבי נאם', 'ריגלה', 'קייל', 'שומר בייבי', 'שעועית ירוקה ירוקה'],
  },
];

function todayLabel() {
  return new Date().toLocaleDateString('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function SupplierOrder() {
  const [quantities, setQuantities] = useState({});
  const [confirmReset, setConfirmReset] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const printRef = useRef(null);
  const quantitiesRef = useRef(quantities);

  useEffect(() => { quantitiesRef.current = quantities; }, [quantities]);

  useEffect(() => {
    const ref = doc(db, 'kitchen', DOC_ID);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const q = snap.data().quantities || {};
        setQuantities(q);
        quantitiesRef.current = q;
      }
    }, err => console.error('[SupplierOrder]', err.code));
    return () => unsub();
  }, []);

  function persist(next) {
    setQuantities(next);
    quantitiesRef.current = next;
    setDoc(doc(db, 'kitchen', DOC_ID), { quantities: next })
      .catch(err => console.error('[SupplierOrder] write failed:', err.code));
  }

  function changeQty(item, delta) {
    const current = quantitiesRef.current[item] || 0;
    const next = Math.max(0, current + delta);
    persist({ ...quantitiesRef.current, [item]: next });
  }

  function resetAll() {
    persist({});
    setConfirmReset(false);
  }

  const totalItems = Object.values(quantities).filter(q => q > 0).length;

  // ── Copy to clipboard ──
  function copyOrder() {
    const q = quantitiesRef.current;
    let text = `🛒 הזמנה — ${SUPPLIER_NAME}\n📅 ${todayLabel()}\n\n`;
    let hasAny = false;

    for (const cat of CATEGORIES) {
      const active = cat.items.filter(item => (q[item] || 0) > 0);
      if (active.length === 0) continue;
      hasAny = true;
      text += `*${cat.name}:*\n`;
      active.forEach(item => { text += `• ${item} — ${q[item]}\n`; });
      text += '\n';
    }

    if (!hasAny) text += 'אין פריטים בהזמנה\n';
    text += `\nסה״כ ${totalItems} פריטים`;

    navigator.clipboard.writeText(text)
      .then(() => { setCopyDone(true); setTimeout(() => setCopyDone(false), 2500); })
      .catch(() => alert('לא ניתן להעתיק — נסה שוב'));
  }

  // ── Download PDF ──
  async function downloadPDF() {
    const el = printRef.current;
    if (!el) return;
    setPdfLoading(true);
    try {
      el.style.display = 'block';
      await new Promise(r => setTimeout(r, 50)); // let browser render

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

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
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

        if (sourceY > 0) pdf.addPage();
        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, sliceH / ratio);
        sourceY += sliceH;
      }

      const dateStr = new Date().toLocaleDateString('he-IL').replace(/\//g, '-');
      pdf.save(`הזמנה-עלה-עלה-${dateStr}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5 pb-32" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <span>🛒</span> הזמנות ספקים
          </h2>
          <p className="text-slate-400 text-sm mt-1">{SUPPLIER_NAME} • {totalItems} פריטים נבחרו</p>
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

      {/* Categories */}
      {CATEGORIES.map(cat => (
        <section key={cat.name} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          {/* Category header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700 bg-slate-750">
            <span className="text-lg">{cat.emoji}</span>
            <h3 className="text-white font-bold text-base">{cat.name}</h3>
            <span className="mr-auto text-slate-500 text-xs">
              {cat.items.filter(item => (quantities[item] || 0) > 0).length} נבחרו
            </span>
          </div>

          {/* Items */}
          <div className="divide-y divide-slate-700/60">
            {cat.items.map(item => {
              const qty = quantities[item] || 0;
              return (
                <div
                  key={item}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors duration-150
                    ${qty > 0 ? 'bg-slate-700/30' : ''}`}
                >
                  {/* Item name */}
                  <span className={`flex-1 text-base font-medium ${qty > 0 ? 'text-white' : 'text-slate-400'}`}>
                    {item}
                  </span>

                  {/* Counter */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => changeQty(item, -1)}
                      disabled={qty === 0}
                      className="w-11 h-11 rounded-xl bg-slate-700 active:bg-slate-600
                                 text-white font-black text-2xl flex items-center justify-center
                                 transition-colors duration-100 disabled:opacity-25 disabled:cursor-not-allowed
                                 select-none touch-manipulation"
                    >
                      −
                    </button>
                    <span className={`w-9 text-center font-black text-xl tabular-nums select-none
                      ${qty > 0 ? 'text-white' : 'text-slate-600'}`}>
                      {qty > 0 ? qty : '·'}
                    </span>
                    <button
                      onClick={() => changeQty(item, +1)}
                      className="w-11 h-11 rounded-xl bg-slate-700 active:bg-slate-600
                                 text-white font-black text-2xl flex items-center justify-center
                                 transition-colors duration-100 select-none touch-manipulation"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Bottom action bar — fixed */}
      <div
        className="fixed bottom-0 inset-x-0 z-20 p-4 bg-slate-900/95 backdrop-blur border-t border-slate-700"
        dir="rtl"
      >
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={copyOrder}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl
                        font-bold text-base transition-all duration-150 touch-manipulation
                        ${copyDone
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-700 text-white hover:bg-slate-600'}`}
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

      {/* Hidden print template for PDF */}
      <div
        ref={printRef}
        style={{
          display: 'none',
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '794px',
          backgroundColor: '#ffffff',
          padding: '48px',
          fontFamily: 'Arial, Helvetica, sans-serif',
          direction: 'rtl',
          color: '#111',
        }}
      >
        {/* Logo + title */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1e293b', paddingBottom: '20px', marginBottom: '28px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>🍽️ וילה אכדיה</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#334155' }}>הזמנה — {SUPPLIER_NAME}</div>
          <div style={{ fontSize: '14px', color: '#64748b', marginTop: '6px' }}>{todayLabel()}</div>
        </div>

        {/* Categories */}
        {CATEGORIES.map(cat => {
          const active = cat.items.filter(item => (quantities[item] || 0) > 0);
          if (active.length === 0) return null;
          return (
            <div key={cat.name} style={{ marginBottom: '24px' }}>
              <div style={{
                fontSize: '15px', fontWeight: 'bold',
                backgroundColor: '#f1f5f9', padding: '8px 14px',
                borderRadius: '6px', marginBottom: '8px',
                borderRight: '4px solid #0f172a',
              }}>
                {cat.emoji} {cat.name}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {active.map((item, i) => (
                    <tr key={item} style={{ backgroundColor: i % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                      <td style={{ padding: '7px 14px', fontSize: '14px', borderBottom: '1px solid #e2e8f0' }}>{item}</td>
                      <td style={{ padding: '7px 14px', fontSize: '14px', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#1e40af' }}>
                        {quantities[item]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Footer */}
        <div style={{ marginTop: '32px', borderTop: '1px solid #cbd5e1', paddingTop: '12px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
          סה״כ {totalItems} פריטים | הודפס מתוך מערכת וילה אכדיה
        </div>
      </div>

    </div>
  );
}
