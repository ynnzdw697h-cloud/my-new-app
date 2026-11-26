import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';

// The editable step cards (text, timer, note, order). Used by StepEditor and RecipeEditor.

let uid = 0;
export const toRow = s => ({
  k: ++uid,
  text: s.text,
  min: s.seconds ? String(Math.floor(s.seconds / 60)) : '',
  sec: s.seconds ? String(s.seconds % 60) : '',
  note: s.note || '',
});

const inputStyle = { background: 'rgba(255,255,255,0.08)', color: 'var(--text)', border: '1px solid var(--border)' };

export function stepsFromRows(rows) {
  return rows
    .filter(r => r.text.trim())
    .map(r => {
      const secs = (parseInt(r.min, 10) || 0) * 60 + (parseInt(r.sec, 10) || 0);
      return { text: r.text.trim(), seconds: secs > 0 ? secs : null, note: r.note.trim() };
    });
}

export default function StepRows({ rows, setRows, color }) {
  const update = (k, patch) => setRows(rs => rs.map(r => (r.k === k ? { ...r, ...patch } : r)));
  const move = (i, d) => setRows(rs => {
    const j = i + d;
    if (j < 0 || j >= rs.length) return rs;
    const n = [...rs]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  return (
    <>
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
    </>
  );
}
