import { useState } from 'react';
import { X, ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';

// Edit a recipe's steps: text, optional timer (minutes / seconds) and a note (e.g. "מהירות 7").
// Nothing is saved until the cook presses "שמור".

let uid = 0;
const toRow = s => ({
  k: ++uid,
  text: s.text,
  min: s.seconds ? String(Math.floor(s.seconds / 60)) : '',
  sec: s.seconds ? String(s.seconds % 60) : '',
  note: s.note || '',
});

const inputStyle = { background: 'rgba(255,255,255,0.08)', color: 'var(--text)', border: '1px solid var(--border)' };

export default function StepEditor({ title, steps, color, hasEdited, onSave, onReset, onClose }) {
  const [rows, setRows]     = useState(() => (steps.length ? steps.map(toRow) : [toRow({ text: '', seconds: null })]));
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState(null);

  const update = (k, patch) => setRows(rs => rs.map(r => (r.k === k ? { ...r, ...patch } : r)));
  const move = (i, d) => setRows(rs => {
    const j = i + d;
    if (j < 0 || j >= rs.length) return rs;
    const n = [...rs]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  async function run(fn) {
    setBusy(true); setError(null);
    try { await fn(); onClose(); } catch (e) { console.error(e); setError('לא נשמר. בדוק חיבור ונסה שוב'); } finally { setBusy(false); }
  }

  function save() {
    const out = rows
      .filter(r => r.text.trim())
      .map(r => {
        const secs = (parseInt(r.min, 10) || 0) * 60 + (parseInt(r.sec, 10) || 0);
        return { text: r.text.trim(), seconds: secs > 0 ? secs : null, note: r.note.trim() };
      });
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
        {rows.map((r, i) => (
          <div key={r.k} className="rounded-xl p-3 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-base font-semibold flex-shrink-0" style={{ background: color, color: '#fff' }}>{i + 1}</span>
              <span className="flex-1" />
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="הזז למעלה" className="w-12 h-12 rounded-xl flex items-center justify-center disabled:opacity-30" style={{ color: 'var(--text)' }}><ArrowUp size={22} /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="הזז למטה" className="w-12 h-12 rounded-xl flex items-center justify-center disabled:opacity-30" style={{ color: 'var(--text)' }}><ArrowDown size={22} /></button>
              <button type="button" onClick={() => setRows(rs => rs.filter(x => x.k !== r.k))} aria-label="מחק שלב" className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ color: 'var(--danger)' }}><Trash2 size={22} /></button>
            </div>
            <textarea
              value={r.text}
              onChange={e => update(r.k, { text: e.target.value })}
              aria-label={`הוראה לשלב ${i + 1}`}
              placeholder="מה עושים בשלב הזה?"
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-lg focus:outline-none"
              style={inputStyle}
            />
            <div className="flex items-center gap-2">
              <span className="text-base" style={{ color: 'var(--text-2)' }}>טיימר</span>
              <input type="text" inputMode="numeric" value={r.min} onChange={e => update(r.k, { min: e.target.value.replace(/\D/g, '') })} aria-label="דקות" placeholder="0" className="w-16 h-12 rounded-xl text-center text-lg focus:outline-none" style={inputStyle} />
              <span className="text-base" style={{ color: 'var(--text-2)' }}>דק׳</span>
              <input type="text" inputMode="numeric" value={r.sec} onChange={e => update(r.k, { sec: e.target.value.replace(/\D/g, '') })} aria-label="שניות" placeholder="0" className="w-16 h-12 rounded-xl text-center text-lg focus:outline-none" style={inputStyle} />
              <span className="text-base" style={{ color: 'var(--text-2)' }}>שנ׳</span>
            </div>
            <input
              type="text"
              value={r.note}
              onChange={e => update(r.k, { note: e.target.value })}
              aria-label="הערה"
              placeholder="הערה (למשל: מהירות 7)"
              className="w-full h-12 rounded-xl px-4 text-lg focus:outline-none"
              style={inputStyle}
            />
          </div>
        ))}

        <button type="button" onClick={() => setRows(rs => [...rs, toRow({ text: '', seconds: null })])} className="w-full min-h-[56px] rounded-xl flex items-center justify-center gap-2 text-lg font-semibold" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-md)', color: 'var(--text)' }}>
          <Plus size={22} /> הוסף שלב
        </button>

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
