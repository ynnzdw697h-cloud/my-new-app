import { useState, useRef, useEffect } from 'react';
import { AlertCircle, MessageSquare, Trash2, X, MoreHorizontal, ChevronDown, Check } from 'lucide-react';
import { useFirestoreArray } from '../hooks/useFirestoreArray';
import { Card, Button, Input, EmptyState, Sheet } from './ui';
import { StatusMark, UndoToast } from './PrepCelebrations';
import { useFocusFlash } from '../hooks/useFocusFlash';
import { useServiceDay } from '../hooks/usePrepState';
import { slotOf, addDays } from '../data/shifts';

const MISSING_KEY = 'missing_items';
const NOTES_KEY   = 'shift_notes';
const TOAST_MS    = 5000;

// Shortage path: reported → ordered → arrived. Items saved before this had no status = reported.
export const MISSING_STATUS = {
  reported: { label: 'דווח',  mark: 'stuck',    next: 'ordered', nextLabel: 'הוזמן' },
  ordered:  { label: 'הוזמן', mark: 'progress', next: 'arrived', nextLabel: 'הגיע' },
  arrived:  { label: 'הגיע',  mark: 'done',     next: null },
};
export const missingStatus = item => item.status || 'reported';

// Arrived shortages stay visible for today and yesterday; older ones live in the shift log.
export const isRecentOrOpen = (item, today) =>
  missingStatus(item) !== 'arrived' || slotOf(item.id).day >= addDays(today, -1);

function nowLabel() {
  return new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

// "דווח ע״י דני 10:20 · הוזמן ע״י יוסי 11:05"
function historyLine(item) {
  const parts = [];
  if (item.author) parts.push(`דווח ע״י ${item.author} ${item.time || ''}`.trim());
  (item.history || []).forEach(h => parts.push(`${MISSING_STATUS[h.status]?.label} ע״י ${h.by} ${h.time}`));
  return parts.join(' · ');
}

export default function ShiftNotes({ user, focusId, onFocused }) {
  const today = useServiceDay();
  const [missingItems, setMissingItems] = useFirestoreArray(MISSING_KEY);
  const [shiftNotes,   setShiftNotes]   = useFirestoreArray(NOTES_KEY);

  const [missingInput,    setMissingInput]    = useState('');
  const [showMissingForm, setShowMissingForm] = useState(false);
  const [noteInput,       setNoteInput]       = useState('');
  const [menuFor,         setMenuFor]         = useState(null); // item
  const [showArrived,     setShowArrived]     = useState(false);
  const [toast,           setToast]           = useState(null);
  const toastTimer = useRef(null);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useFocusFlash(focusId, onFocused);

  const openItems    = missingItems.filter(i => missingStatus(i) !== 'arrived');
  const arrivedItems = missingItems.filter(i => missingStatus(i) === 'arrived' && isRecentOrOpen(i, today));
  // Older notes are in the shift log, under their day
  const todayNotes   = shiftNotes.filter(n => slotOf(n.id).day === today);

  function addMissingItem() {
    const text = missingInput.trim();
    if (!text) return;
    setMissingItems(prev => [...prev, { id: Date.now(), text, author: user, time: nowLabel(), status: 'reported' }]);
    setMissingInput('');
    setShowMissingForm(false);
  }

  function deleteMissingItem(id) {
    setMissingItems(prev => prev.filter(item => item.id !== id));
  }

  function setMissingStatus(item, status) {
    const prevStatus = missingStatus(item);
    if (status === prevStatus) return;
    const entry = { status, by: user, time: nowLabel() };
    setMissingItems(prev => prev.map(i => i.id === item.id
      ? { ...i, status, history: [...(i.history || []), entry] }
      : i));
    clearTimeout(toastTimer.current);
    setToast({
      id: Date.now(),
      text: `${item.text} · ${MISSING_STATUS[status].label}`,
      undoable: true,
      undo: () => setMissingItems(prev => prev.map(i => i.id === item.id
        ? { ...i, status: prevStatus, history: (i.history || []).slice(0, -1) }
        : i)),
    });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  function handleUndo() {
    toast?.undo?.();
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  function addNote() {
    const text = noteInput.trim();
    if (!text) return;
    setShiftNotes(prev => [...prev, { id: Date.now(), text, author: user, time: nowLabel() }]);
    setNoteInput('');
  }

  // Delete right away; Undo puts the note back where it was
  function deleteNote(note) {
    let index = -1;
    setShiftNotes(prev => {
      index = prev.findIndex(n => n.id === note.id);
      return prev.filter(n => n.id !== note.id);
    });
    clearTimeout(toastTimer.current);
    setToast({
      id: Date.now(),
      text: 'ההערה נמחקה',
      undoable: true,
      undo: () => setShiftNotes(prev => {
        if (prev.some(n => n.id === note.id)) return prev;
        const next = [...prev];
        next.splice(index < 0 ? next.length : Math.min(index, next.length), 0, note);
        return next;
      }),
    });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  const renderMissing = item => {
    const st = MISSING_STATUS[missingStatus(item)];
    return (
      <div key={item.id} data-focus-id={item.id} className="flex items-center gap-3 pr-5 pl-2 py-2 min-h-[72px]" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <StatusMark status={st.mark} color="#10B981" size={26} />
        <div className="flex-1 min-w-0 py-1">
          <div className={`text-lg font-medium ${st.next ? 'text-text-primary' : 'text-text-secondary'}`}>{item.text}</div>
          <div className="text-sm text-text-secondary">{historyLine(item)}</div>
        </div>
        {st.next && (
          <button
            onClick={() => setMissingStatus(item, st.next)}
            className="flex-shrink-0 min-h-[48px] px-4 rounded-xl text-base font-medium text-text-primary"
            style={{ border: '1px solid var(--border)' }}
          >
            {st.nextLabel}
          </button>
        )}
        <button
          onClick={() => setMenuFor(item)}
          aria-label={`אפשרויות: ${item.text}`}
          className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-text-tertiary"
        >
          <MoreHorizontal size={20} strokeWidth={1.5} />
        </button>
      </div>
    );
  };

  return (
    <div className="p-5 md:p-6 space-y-5 max-w-2xl mx-auto" dir="rtl">

      <p className="text-body text-text-secondary px-1">משותף לכל הפסים · מתעדכן בזמן אמת</p>

      {/* ══ Section 1 — חוסרים ══ */}
      <Card padded={false}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} strokeWidth={1.5} className="text-text-secondary" />
            <h3 className="text-h3 text-text-primary">חוסרים</h3>
            {openItems.length > 0 && (
              <span className="text-base text-text-secondary tabular-nums">{openItems.length === 1 ? 'אחד פתוח' : `${openItems.length} פתוחים`}</span>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowMissingForm(v => !v)}
            ariaLabel="הוסף פריט חסר"
          >
            + דווח חוסר
          </Button>
        </div>

        {/* Add form */}
        {showMissingForm && (
          <div className="px-5 py-4 flex gap-2.5"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <Input
              className="flex-1"
              placeholder="שם הפריט החסר..."
              value={missingInput}
              onChange={e => setMissingInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMissingItem()}
              autoFocus
            />
            <Button variant="primary" onClick={addMissingItem}>הוסף</Button>
            <Button variant="ghost" size="sm"
              onClick={() => { setShowMissingForm(false); setMissingInput(''); }}
              ariaLabel="סגור"><X size={20} strokeWidth={1.5} /></Button>
          </div>
        )}

        {/* Legend */}
        {missingItems.length > 0 && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 px-5 py-2.5 text-sm text-text-secondary" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {Object.values(MISSING_STATUS).map(s => (
              <span key={s.label} className="inline-flex items-center gap-1.5">
                <StatusMark status={s.mark} color="#10B981" size={14} />{s.label}
              </span>
            ))}
          </div>
        )}

        {/* Open items */}
        <div>
          {openItems.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              compact
              title="אין חוסרים פתוחים"
              description="כשיש פריט חסר, דווח עליו כאן"
            />
          ) : (
            openItems.map(renderMissing)
          )}
        </div>

        {/* Arrived — folded */}
        {arrivedItems.length > 0 && (
          <div>
            <button
              onClick={() => setShowArrived(v => !v)}
              aria-expanded={showArrived}
              className="w-full flex items-center gap-2 min-h-[52px] px-5 text-base text-text-secondary"
            >
              <ChevronDown size={18} strokeWidth={1.5} style={{ transform: showArrived ? 'none' : 'rotate(90deg)', transition: 'transform 0.15s' }} />
              הגיעו <span className="tabular-nums">({arrivedItems.length})</span>
            </button>
            {showArrived && arrivedItems.map(renderMissing)}
          </div>
        )}
      </Card>

      {/* Status / delete menu */}
      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.text}>
        <div className="space-y-2">
          {Object.entries(MISSING_STATUS).map(([value, s]) => {
            const current = menuFor && missingStatus(menuFor) === value;
            return (
              <button
                key={value}
                onClick={() => { setMissingStatus(menuFor, value); setMenuFor(null); }}
                className="w-full flex items-center gap-4 min-h-[60px] px-4 rounded-xl text-lg text-text-primary"
                style={{ background: current ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid var(--border)' }}
              >
                <StatusMark status={s.mark} color="#10B981" size={26} />
                <span className="flex-1 text-right">{s.label}</span>
                {current && <Check size={18} strokeWidth={2} className="text-text-secondary" />}
              </button>
            );
          })}
          <button
            onClick={() => { deleteMissingItem(menuFor.id); setMenuFor(null); }}
            className="w-full flex items-center gap-4 min-h-[60px] px-4 rounded-xl text-lg"
            style={{ color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}
          >
            <Trash2 size={22} strokeWidth={1.5} />
            <span className="flex-1 text-right">מחק</span>
          </button>
        </div>
      </Sheet>

      <UndoToast toast={toast} onUndo={handleUndo} />

      {/* ══ Section 2 — הערות משמרת ══ */}
      <Card padded={false}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-2.5"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <MessageSquare size={18} strokeWidth={1.5} className="text-text-secondary" />
          <h3 className="text-h3 text-text-primary">הערות משמרת</h3>
          {todayNotes.length > 0 && (
            <span className="text-base text-text-secondary tabular-nums">{todayNotes.length === 1 ? 'הערה אחת' : `${todayNotes.length} הערות`}</span>
          )}
        </div>

        {/* Input — author and time are added automatically on send */}
        <div className="px-5 py-4 space-y-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <textarea
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.ctrlKey && addNote()}
            placeholder="הערה לצוות הבא"
            aria-label="הערה לצוות הבא"
            rows={3}
            className="w-full px-4 py-3 rounded-2xl resize-none text-lg text-text-primary
                       placeholder:text-text-tertiary outline-none transition-colors duration-150"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}
            onFocus={e => e.target.style.borderColor = '#3B82F6'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <Button variant="secondary" fullWidth onClick={addNote} disabled={!noteInput.trim()}>
            שלח הערה
          </Button>
        </div>

        {/* Notes list, newest first */}
        <div>
          {todayNotes.length === 0 ? (
            <p className="px-5 py-6 text-center text-base text-text-secondary">אין הערות למשמרת הבאה</p>
          ) : (
            [...todayNotes].reverse().map((note, i) => (
              <div
                key={note.id}
                className="px-5 py-4 flex items-start gap-3"
                style={{ borderBottom: i < todayNotes.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-base text-text-secondary mb-1">
                    <span className="text-text-primary font-semibold">{note.author}</span>
                    <span className="tabular-nums"> · {note.time}</span>
                  </div>
                  <p className="text-lg text-text-primary leading-relaxed whitespace-pre-wrap">{note.text}</p>
                </div>
                <button
                  onClick={() => deleteNote(note)}
                  aria-label="מחק הערה"
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-150 active:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)' }}
                >
                  <Trash2 size={18} strokeWidth={1.75} />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

    </div>
  );
}
