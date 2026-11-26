import { useState } from 'react';
import { X } from 'lucide-react';
import StepRows, { toRow, stepsFromRows } from './StepRows';

// Edit a recipe's steps: text, optional timer (minutes / seconds) and a note (e.g. "מהירות 7").
// Nothing is saved until the cook presses "שמור".

export default function StepEditor({ title, steps, color, hasEdited, onSave, onReset, onClose }) {
  const [rows, setRows]     = useState(() => (steps.length ? steps.map(toRow) : [toRow({ text: '', seconds: null })]));
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState(null);

  async function run(fn) {
    setBusy(true); setError(null);
    try { await fn(); onClose(); } catch (e) { console.error(e); setError('לא נשמר. בדוק חיבור ונסה שוב'); } finally { setBusy(false); }
  }

  function save() {
    const out = stepsFromRows(rows);
    if (out.length === 0) { setError('צריך לפחות שלב אחד'); return; }
    run(() => onSave(out));
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" dir="rtl" style={{ background: 'var(--bg)' }} role="dialog" aria-label="עריכת שלבים">
      <div className="h-14 flex items-center gap-2 px-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button type="button" onClick={onClose} aria-label="סגור בלי לשמור" className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ color: 'var(--text)' }}><X size={26} /></button>
        <div className="flex-1 min-w-0">
          <p className="text-base truncate" style={{ color: 'var(--text-2)' }}>{title}</p>
          <p className="text-lg font-semibold leading-tight" style={{ color: 'var(--text)' }}>עריכת שלבי הכנה</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <StepRows rows={rows} setRows={setRows} color={color} />

        {hasEdited && (
          <button type="button" disabled={busy} onClick={() => run(onReset)} className="w-full min-h-[48px] rounded-xl text-lg font-semibold" style={{ color: 'var(--text-2)' }}>
            חזרה לשלבים המקוריים
          </button>
        )}
      </div>

      <div className="px-4 pt-3 flex-shrink-0 space-y-2" style={{ borderTop: '1px solid var(--border)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        {error && <p className="text-base font-semibold" style={{ color: 'var(--danger)' }}>{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 min-h-[56px] rounded-xl text-lg font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text)' }}>ביטול</button>
          <button type="button" onClick={save} disabled={busy} className="flex-[2] min-h-[56px] rounded-xl text-lg font-semibold disabled:opacity-50" style={{ background: color, color: '#fff' }}>{busy ? 'שומר...' : 'שמור'}</button>
        </div>
      </div>
    </div>
  );
}
