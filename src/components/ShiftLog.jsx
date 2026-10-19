import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Wrench, ClipboardList, BookCheck, ChevronDown } from 'lucide-react';
import { useFirestoreArray } from '../hooks/useFirestoreArray';
import { useFirestoreSet } from '../hooks/useFirestoreSet';
import { useServiceDay, computePrepProgress } from '../hooks/usePrepState';
import { Card, Button, Input } from './ui';
import { StatusMark, UndoToast } from './PrepCelebrations';
import { MISSING_STATUS, missingStatus } from './ShiftNotes';
import { STATIONS } from '../data/stations';
import { PREP_TASKS } from '../data/prepTasks';
import { LOG_DOCS, SHIFTS, getCurrentShift, slotOf, addDays, dayLabel, nowLabel } from '../data/shifts';

const MISSING_KEY = 'missing_items';
const NOTES_KEY   = 'shift_notes';
const TOAST_MS    = 5000;
const LRM         = '‎';

// "טווח 0 עד 4°", "‎-18° ומטה", "‎5° ומעלה"
const hasNum = v => v !== null && v !== undefined && v !== '';
function rangeText(min, max) {
  if (hasNum(min) && hasNum(max)) return `טווח ${LRM}${min} עד ${LRM}${max}°`;
  if (hasNum(max)) return `${LRM}${max}° ומטה`;
  return `${LRM}${min}° ומעלה`;
}

// One station's prep progress and temperatures for the viewed day.
function useStationDay(station, day) {
  const [completedTasks] = useFirestoreSet(`prep_tasks_${station}_${day}`);
  const [completedSubs]  = useFirestoreSet(`prep_subs_${station}_${day}`);
  const [customTasks]    = useFirestoreArray(`custom_prep_${station}`);
  const [hiddenIds]      = useFirestoreSet(`hidden_prep_${station}`);
  const [temps]          = useFirestoreArray(LOG_DOCS.temps(station, day));

  const progress = computePrepProgress(station, completedTasks, completedSubs, customTasks, hiddenIds);
  const taskName = id => {
    const t = [...(PREP_TASKS[station] || []), ...customTasks].find(x => x.id === id);
    return (t && (t.task || t.name || t.text)) || 'טמפרטורה';
  };
  return { station, left: progress.total - progress.done, total: progress.total, temps, taskName };
}

export default function ShiftLog({ user }) {
  const today = useServiceDay();
  const [viewDay, setViewDay] = useState(null);
  const day     = viewDay && viewDay < today ? viewDay : today;
  const isToday = day === today;

  const [shiftNotes]                 = useFirestoreArray(NOTES_KEY);
  const [missingItems]               = useFirestoreArray(MISSING_KEY);
  const [faults, setFaults]          = useFirestoreArray(LOG_DOCS.faults);
  const [readsMorning]               = useFirestoreArray(LOG_DOCS.handoverReads(day, SHIFTS[0]));
  const [readsAfternoon]             = useFirestoreArray(LOG_DOCS.handoverReads(day, SHIFTS[1]));
  const cold    = useStationDay('cold', day);
  const hot     = useStationDay('hot', day);
  const checker = useStationDay('checker', day);
  const stationDays = [cold, hot, checker];

  const [faultInput,  setFaultInput]  = useState('');
  const [showFixed,   setShowFixed]   = useState(false);
  const [toast,       setToast]       = useState(null);
  const toastTimer = useRef(null);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function showToast(text, undo) {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, undoable: true, undo });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  function handleUndo() {
    toast?.undo?.();
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  // ── Faults ──
  function addFault() {
    const text = faultInput.trim();
    if (!text) return;
    setFaults(prev => [...prev, { id: Date.now(), text, author: user, time: nowLabel(), day, shift: getCurrentShift(), status: 'open' }]);
    setFaultInput('');
  }

  function fixFault(fault) {
    setFaults(prev => prev.map(f => f.id === fault.id
      ? { ...f, status: 'fixed', fixedBy: user, fixedTime: nowLabel(), fixedDay: today }
      : f));
    showToast(`${fault.text} · טופל`, () => setFaults(prev => prev.map(f => f.id === fault.id
      ? { ...f, status: 'open', fixedBy: null, fixedTime: null, fixedDay: null }
      : f)));
  }

  // ── Derived lists ──
  const dayNotes   = shiftNotes.filter(n => slotOf(n.id).day === day).reverse();
  const dayMissing = missingItems.filter(i => slotOf(i.id).day === day);
  const dayFaults  = faults.filter(f => f.day === day || (f.status === 'open' && f.day < day)).reverse();
  const openFaults = dayFaults.filter(f => f.status === 'open');
  const fixedFaults = dayFaults.filter(f => f.status !== 'open');
  const openMissing = missingItems.filter(i => missingStatus(i) !== 'arrived');
  const badTemps = stationDays.flatMap(s => s.temps.filter(t => t.outOfRange).map(t => ({ ...t, name: s.taskName(t.taskId) })));
  const reads = { [SHIFTS[0]]: readsMorning, [SHIFTS[1]]: readsAfternoon };

  const rowStyle = last => ({ borderBottom: last ? 'none' : '1px solid var(--border-subtle)' });

  const renderFault = (f, last) => {
    const open = f.status === 'open';
    return (
      <div key={f.id} className="flex items-center gap-3 pr-5 pl-2 py-2 min-h-[64px]" style={rowStyle(last)}>
        <StatusMark status={open ? 'stuck' : 'done'} color="#10B981" size={26} />
        <div className="flex-1 min-w-0 py-1">
          <div className={`text-lg font-medium ${open ? 'text-text-primary' : 'text-text-secondary'}`}>{f.text}</div>
          <div className="text-sm text-text-secondary">
            דווח ע״י {f.author} <span className="tabular-nums">{f.time}</span>
            {f.day < day && ` · מ־${dayLabel(f.day)}`}
            {!open && f.fixedBy && ` · טופל ע״י ${f.fixedBy} ${f.fixedTime || ''}`}
          </div>
        </div>
        {open && (
          <button
            onClick={() => fixFault(f)}
            className="flex-shrink-0 min-h-[48px] px-4 rounded-xl text-base font-medium text-text-primary"
            style={{ border: '1px solid var(--border)' }}
          >
            טופל
          </button>
        )}
      </div>
    );
  };

  const addRow = (value, setValue, onAdd, placeholder) => (
    <div className="px-5 py-4 flex gap-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <Input
        className="flex-1"
        placeholder={placeholder}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onAdd()}
      />
      <Button variant="secondary" onClick={onAdd} disabled={!value.trim()}>הוסף</Button>
    </div>
  );

  const header = (Icon, title, count) => (
    <div className="px-5 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <Icon size={18} strokeWidth={1.5} className="text-text-secondary" />
      <h3 className="text-h3 text-text-primary">{title}</h3>
      {count && <span className="text-base text-text-secondary tabular-nums">{count}</span>}
    </div>
  );

  return (
    <div className="p-5 md:p-6 space-y-5 max-w-2xl mx-auto" dir="rtl">

      {/* ══ Day switcher ══ */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setViewDay(addDays(day, -1))}
          aria-label="היום הקודם"
          className="w-12 h-12 flex items-center justify-center rounded-xl text-2xl text-text-primary"
          style={{ border: '1px solid var(--border)' }}
        >
          ›
        </button>
        <div className="text-center">
          <div className="text-lg font-medium text-text-primary">{dayLabel(day)}</div>
          {isToday && <div className="text-sm text-text-secondary">היום</div>}
        </div>
        <button
          onClick={() => setViewDay(addDays(day, 1))}
          disabled={isToday}
          aria-label="היום הבא"
          className="w-12 h-12 flex items-center justify-center rounded-xl text-2xl text-text-primary transition-opacity duration-150"
          style={{ border: '1px solid var(--border)', opacity: isToday ? 0.3 : 1 }}
        >
          ‹
        </button>
      </div>

      {/* ══ Section 1 — הערות משמרת ══ */}
      <Card padded={false}>
        {header(MessageSquare, 'הערות משמרת', dayNotes.length > 0 && (dayNotes.length === 1 ? 'הערה אחת' : `${dayNotes.length} הערות`))}
        {dayNotes.length === 0 ? (
          <p className="px-5 py-6 text-center text-base text-text-secondary">כותבים הערות במסך חוסרים והערות</p>
        ) : (
          dayNotes.map((note, i) => (
            <div key={note.id} className="px-5 py-4" style={rowStyle(i === dayNotes.length - 1)}>
              <div className="text-base text-text-secondary mb-1">
                <span className="text-text-primary font-semibold">{note.author}</span>
                <span className="tabular-nums"> · {note.time}</span>
                <span> · משמרת {slotOf(note.id).shift}</span>
              </div>
              <p className="text-lg text-text-primary leading-relaxed whitespace-pre-wrap">{note.text}</p>
            </div>
          ))
        )}
      </Card>

      {/* ══ Section 3 — תקלות ציוד ══ */}
      <Card padded={false}>
        {header(Wrench, 'תקלות ציוד', openFaults.length > 0 && (openFaults.length === 1 ? 'פתוחה אחת' : `${openFaults.length} פתוחות`))}
        {isToday && addRow(faultInput, setFaultInput, addFault, 'מה התקלה?')}
        {dayFaults.length === 0 ? (
          <p className="px-5 py-6 text-center text-base text-text-secondary">אין תקלות</p>
        ) : (
          openFaults.map((f, i) => renderFault(f, i === openFaults.length - 1 && fixedFaults.length === 0))
        )}
        {fixedFaults.length > 0 && (
          <div style={{ borderTop: openFaults.length ? '1px solid var(--border-subtle)' : 'none' }}>
            <button
              onClick={() => setShowFixed(v => !v)}
              aria-expanded={showFixed}
              className="w-full flex items-center gap-2 min-h-[52px] px-5 text-base text-text-secondary"
            >
              <ChevronDown size={18} strokeWidth={1.5} style={{ transform: showFixed ? 'none' : 'rotate(90deg)', transition: 'transform 0.15s' }} />
              טופלו <span className="tabular-nums">({fixedFaults.length})</span>
            </button>
            {showFixed && fixedFaults.map((f, i) => renderFault(f, i === fixedFaults.length - 1))}
          </div>
        )}
      </Card>

      <UndoToast toast={toast} onUndo={handleUndo} />

      {/* ══ Section 4 — סיכום אוטומטי ══ */}
      <Card padded={false}>
        {header(ClipboardList, 'סיכום אוטומטי')}
        <div className="px-5 py-4 min-h-[56px]" style={rowStyle(false)}>
          <div className="text-lg text-text-primary">
            {openMissing.length === 0 ? 'אין חוסרים פתוחים' : `חוסרים פתוחים: ${openMissing.length}`}
          </div>
          {openMissing.length > 0 && (
            <div className="text-base text-text-secondary">
              {openMissing.map(i => `${i.text} (${MISSING_STATUS[missingStatus(i)].label})`).join(', ')}
            </div>
          )}
          {dayMissing.length > 0 && (
            <div className="text-base text-text-secondary mt-1">
              דווחו {isToday ? 'היום' : 'ביום הזה'}: {dayMissing.map(i => i.text).join(', ')}
            </div>
          )}
        </div>
        {stationDays.map(s => (
          <div key={s.station} className="flex items-center gap-3 px-5 min-h-[56px]" style={rowStyle(false)}>
            <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: STATIONS[s.station].color }} />
            <span className="text-lg text-text-primary">
              {STATIONS[s.station].name}: {s.total === 0 ? 'אין משימות' : s.left > 0 ? `נשארו ${s.left}` : 'מוכן'}
            </span>
          </div>
        ))}
        {badTemps.map((t, i) => (
          <div key={`${t.taskId}-${i}`} className="px-5 py-3 min-h-[56px] flex items-center text-lg" style={{ color: '#F87171', ...rowStyle(i === badTemps.length - 1) }}>
            {t.name}: {LRM}{t.value}° ({rangeText(t.min, t.max)}) · {t.by} {t.time}
          </div>
        ))}
      </Card>

      {/* ══ Section 5 — מי קרא את המסירה ══ */}
      <Card padded={false}>
        {header(BookCheck, 'מי קרא את המסירה')}
        {SHIFTS.map((shift, i) => {
          const names = reads[shift].map(r => r.name);
          return (
            <div key={shift} className="px-5 py-3 min-h-[56px] flex items-center text-lg text-text-primary" style={rowStyle(i === SHIFTS.length - 1)}>
              מה שהשאירה משמרת ה{shift}: {names.length ? `קראו ${names.join(', ')}` : 'עוד לא קראו'}
            </div>
          );
        })}
      </Card>

    </div>
  );
}
