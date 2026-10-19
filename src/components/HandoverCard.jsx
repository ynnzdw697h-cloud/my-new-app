import { useState } from 'react';
import { useFirestoreArray } from '../hooks/useFirestoreArray';
import { useServiceDay } from '../hooks/usePrepState';
import { missingStatus } from './ShiftNotes';
import { LOG_DOCS, getCurrentShift, slotOf, previousSlot, nowLabel } from '../data/shifts';

const MAX_ROWS = 5;

// Dashboard card: what the previous shift left, with a "read it" button.
export default function HandoverCard({ user }) {
  const day   = useServiceDay();
  const shift = getCurrentShift();
  const prev  = previousSlot(day, shift);
  const inPrev = ms => { const s = slotOf(ms); return s.day === prev.day && s.shift === prev.shift; };

  const [shiftNotes]            = useFirestoreArray('shift_notes');
  const [missingItems]          = useFirestoreArray('missing_items');
  const [faults]                = useFirestoreArray(LOG_DOCS.faults);
  const [reads, setReads]       = useFirestoreArray(LOG_DOCS.handoverReads(prev.day, prev.shift));
  const [justRead, setJustRead] = useState(null); // time label

  const title = `מה השאירה משמרת ה${prev.shift}`;

  // After tapping: one muted line with Undo
  if (justRead) {
    return (
      <div className="flex items-center justify-between px-1 min-h-[48px]">
        <span className="text-sm text-text-secondary">קראת את {title} · <span className="tabular-nums">{justRead}</span></span>
        <button
          onClick={() => { setReads(p => p.filter(r => r.name !== user)); setJustRead(null); }}
          className="min-h-[48px] px-3 text-sm text-text-secondary underline underline-offset-4"
        >
          ביטול
        </button>
      </div>
    );
  }

  const prevFaults = faults.filter(f => f.status === 'open' || (f.day === prev.day && f.shift === prev.shift));
  const prevMissing = missingItems.filter(i => inPrev(i.id) && missingStatus(i) !== 'arrived');
  const prevNotes  = shiftNotes.filter(n => inPrev(n.id));
  const openMissing  = missingItems.filter(i => missingStatus(i) !== 'arrived').length;

  // Open shortages alone don't make a handover; they're on the dashboard already.
  const nothing = !prevFaults.length && !prevMissing.length && !prevNotes.length;
  if (nothing || reads.some(r => r.name === user)) return null;

  const rows = [
    ...prevFaults.map(f => ({ key: `f${f.id}`, text: f.text, tag: f.status === 'open' ? 'תקלה פתוחה' : null })),
    ...prevMissing.map(i => ({ key: `m${i.id}`, text: `חסר: ${i.text}`, meta: `${i.author} · ${i.time}` })),
    ...prevNotes.map(n => ({ key: `n${n.id}`, text: n.text, meta: `${n.author} · ${n.time}` })),
  ].slice(0, MAX_ROWS);

  function markRead() {
    const time = nowLabel();
    setReads(p => (p.some(r => r.name === user) ? p : [...p, { name: user, time }]));
    setJustRead(time);
  }

  return (
    <section className="space-y-2" dir="rtl">
      <h3 className="text-sm font-medium text-text-secondary px-1">{title}</h3>
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
        {rows.map(row => (
          <div key={row.key} className="px-4 py-3 min-h-[56px] flex flex-col justify-center" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <span className="flex-1 min-w-0 text-lg text-text-primary">{row.text}</span>
              {row.tag && <span className="flex-shrink-0 text-sm" style={{ color: '#F87171' }}>{row.tag}</span>}
            </div>
            {row.meta && <div className="text-sm text-text-secondary">{row.meta}</div>}
          </div>
        ))}
        {openMissing > 0 && (
          <p className="px-4 py-3 text-sm text-text-secondary" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            חוסרים: {openMissing === 1 ? 'אחד פתוח' : `${openMissing} פתוחים`}
          </p>
        )}
        <div className="p-3">
          <button
            onClick={markRead}
            className="w-full min-h-[56px] rounded-xl text-lg font-medium text-text-primary transition-colors duration-150"
            style={{ border: '1px solid var(--border)' }}
          >
            קראתי
          </button>
        </div>
      </div>
    </section>
  );
}
