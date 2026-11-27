import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Wand2, CheckCheck, X, AlertTriangle, Send, Eraser, Clock, MessageSquare } from 'lucide-react';
import { Button, Sheet, SkeletonList } from '../ui';
import { UndoToast } from '../PrepCelebrations';
import { useFirestoreDoc } from '../../hooks/useFirestoreDoc';
import {
  SCHEDULE_CHEFS, SCHEDULE_SHIFTS, SCHEDULE_STATIONS, SCHEDULE_STATION_INFO, DAY_NAMES, AVAIL, ADMIN_DOCS, PUBLIC_DOCS,
  weekDays, shortDate, iso, shiftKey, shiftStart, slotStart, defaultStart, fmtTime, STATION_STARTS,
} from '../../data/schedule';
import { allSlots, autoAssign, blockReason, availabilityOf, countFor, scheduleWarnings, publishedSlots, publishedDetails } from '../../utils/scheduler';
import { StationDot } from './parts';

const TOAST_MS = 5000;
const WIDE_QUERY = '(min-width: 1024px)';

// Computer screen: the week is shown as one wide table instead of day cards.
function useIsWide() {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(WIDE_QUERY).matches;
  const [wide, setWide] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(WIDE_QUERY);
    if (!mq) return undefined;
    const on = () => setWide(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return wide;
}
const nameOf = id => SCHEDULE_CHEFS.find(c => c.id === id)?.displayName || id;

// לוח שיבוץ: tap a slot, then pick a cook from the list (colored by what each cook submitted).
// On a computer a cook can also be dragged from the top row, or from slot to slot.
export default function ScheduleBoard({ week, template, profiles, availability, availabilityLoaded }) {
  const [draft, setDraft, draftState] = useFirestoreDoc(ADMIN_DOCS.draft(week), { assignments: {} }, 'admin');
  const [published, setPublished, publishedState] = useFirestoreDoc(PUBLIC_DOCS.published(week), null);
  const [openKey, setOpenKey] = useState(null); // slot whose cook list is open
  const [timeKey, setTimeKey] = useState(null); // shift ("0-morning") whose arrival time is being changed
  const [dragging, setDragging] = useState(null); // chefId being dragged (lights up slots)
  const [toast, setToast] = useState(null);
  const wide = useIsWide();
  const toastTimer = useRef(null);

  const slots = useMemo(() => allSlots(template), [template]);
  // Only slots that still exist in the staffing template (a lowered count leaves old keys behind)
  const assignments = useMemo(() => {
    const all = draft?.assignments || {};
    return Object.fromEntries(slots.filter(s => all[s.key]).map(s => [s.key, all[s.key]]));
  }, [draft, slots]);
  const ctx = useMemo(() => ({ profiles, availability, assignments }), [profiles, availability, assignments]);
  const autoCount = slots.filter(s => assignments[s.key]?.auto).length;

  const showToast = useCallback((text, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, undoable: !!undo, undo });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);
  function handleUndo() {
    toast?.undo?.();
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  const times = useMemo(() => draft?.times || {}, [draft]);
  const save = next => setDraft(prev => ({ ...(prev || {}), assignments: next, updatedAt: new Date().toISOString() }));
  // Arrival time of one shift on one day (empty = back to the usual time)
  function saveTime(key, value) {
    const [d, shift] = key.split('-');
    const next = { ...times };
    if (!value || value === defaultStart(shift)) delete next[key]; else next[key] = value;
    setDraft(prev => ({ ...(prev || {}), times: next, updatedAt: new Date().toISOString() }));
    showToast(`${DAY_NAMES[Number(d)]} ${SCHEDULE_SHIFTS.find(s => s.id === shift).short}: הגעה ב-${fmtTime(next[key] || defaultStart(shift))}`);
  }
  // A cook's own arrival time and note in one slot
  function saveDetails(slot, { time, note }) {
    const a = assignments[slot.key];
    if (!a) return;
    const next = { ...a };
    if (time && time !== slotStart(times, slot.day, slot.shift, slot.station)) next.time = time; else delete next.time;
    if (note) next.note = note; else delete next.note;
    save({ ...assignments, [slot.key]: next });
    showToast(`נשמר ל${nameOf(a.chefId)}`);
  }
  // Change the board and offer to undo it
  function change(next, text) {
    const before = assignments;
    save(next);
    showToast(text, () => save(before));
  }

  // Put chefId in slot (fromKey: the slot they are moved out of). Placing against a rule is allowed, with undo.
  function place(slot, chefId, fromKey) {
    const next = { ...assignments };
    // A cook moved by dragging keeps their own time and note
    const moved = fromKey ? assignments[fromKey] : null;
    if (fromKey) delete next[fromKey];
    const why = blockReason(chefId, slot, { ...ctx, assignments: next });
    next[slot.key] = { chefId, ...(moved?.time ? { time: moved.time } : {}), ...(moved?.note ? { note: moved.note } : {}) };
    const prev = assignments[slot.key];
    if (why) change(next, `${nameOf(chefId)} שובץ למרות: ${why}`);
    else if (prev && prev.chefId !== chefId) change(next, `${nameOf(chefId)} במקום ${nameOf(prev.chefId)}`);
    else if (fromKey) change(next, `${nameOf(chefId)} הועבר`);
    else save(next);
  }
  function clearSlot(slot) {
    const current = assignments[slot.key];
    if (!current) return;
    const next = { ...assignments };
    delete next[slot.key];
    change(next, `${nameOf(current.chefId)} הוצא מהמשבצת`);
  }

  // ── Mouse dragging (computer) ──
  const dragRef = useRef(null); // { chefId, fromKey }
  function dragStart(e, chefId, fromKey) {
    dragRef.current = { chefId, fromKey };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', chefId);
    setDragging(chefId);
  }
  function dragEnd() {
    dragRef.current = null;
    setDragging(null);
  }
  function drop(slot) {
    const d = dragRef.current;
    dragEnd();
    if (!d || d.fromKey === slot.key || assignments[slot.key]?.chefId === d.chefId) return;
    place(slot, d.chefId, d.fromKey);
  }

  function runAuto() {
    const inSchedule = Object.fromEntries(
      SCHEDULE_CHEFS.filter(c => profiles[c.id]).map(c => [c.id, profiles[c.id]]),
    );
    const { assignments: next, filled, unfilled } = autoAssign({ template, assignments, profiles: inSchedule, availability });
    if (!filled) { showToast(unfilled.length ? 'לא נמצא טבח מתאים למשבצות הריקות' : 'אין משבצות ריקות'); return; }
    change(next, `שובצו ${filled} משבצות${unfilled.length ? `, ${unfilled.length} נשארו ריקות` : ''}`);
  }
  function approveAll() {
    // eslint-disable-next-line no-unused-vars
    const next = Object.fromEntries(Object.entries(assignments).map(([k, a]) => { if (!a?.auto) return [k, a]; const { auto, reason, ...rest } = a; return [k, rest]; }));
    change(next, `${autoCount} הצעות אושרו`);
  }
  function clearAll() {
    const n = Object.keys(assignments).length;
    change({}, `הלוח נוקה (${n} משבצות)`);
  }
  function clearAuto() {
    const next = Object.fromEntries(Object.entries(assignments).filter(([, a]) => !a?.auto));
    change(next, `${autoCount} הצעות נמחקו`);
  }

  const warnings = useMemo(() => scheduleWarnings({ template, assignments, profiles, availability, chefName: nameOf }), [template, assignments, profiles, availability]);
  const emptyCount = slots.filter(s => !assignments[s.key]).length;
  const problems = warnings.filter(w => !(w.level === 'warn' && w.key));

  // Publish what is on the board (approved placements only) so cooks see it
  const toPublish = publishedSlots(assignments);
  const detailsToPublish = publishedDetails(assignments);
  const same = (x, y) => JSON.stringify(x || {}) === JSON.stringify(y || {});
  const changedSincePublish = !!published
    && (!same(published.slots, toPublish) || !same(published.details, detailsToPublish) || !same(published.times, times));
  function publish() {
    const before = published;
    setPublished({ week, slots: toPublish, details: detailsToPublish, times, publishedAt: new Date().toISOString() });
    const n = Object.keys(toPublish).length;
    showToast(`${before ? 'הסידור עודכן' : 'הסידור פורסם'}: ${n} משמרות${emptyCount ? `, ${emptyCount} ריקות` : ''}`, () => setPublished(before));
  }

  if (!draftState.loaded || !availabilityLoaded || !publishedState.loaded) return <SkeletonList />;
  if (!slots.length) return <p className="text-base text-text-secondary">אין משבצות. קבע בלשונית כוח אדם כמה טבחים צריך בכל משמרת.</p>;

  const days = weekDays(week);
  const openSlotObj = openKey ? slots.find(sl => sl.key === openKey) : null;
  const submitted = SCHEDULE_CHEFS.filter(c => availability[c.id]).length;
  const slotFor = (slot, compact) => (
    <Slot key={slot.key} slot={slot} a={assignments[slot.key]} start={slotStart(times, slot.day, slot.shift, slot.station)} selected={dragging} ctx={ctx} compact={compact} onTap={() => setOpenKey(slot.key)}
      onDragStart={e => dragStart(e, assignments[slot.key].chefId, slot.key)} onDragEnd={dragEnd} onDrop={() => drop(slot)} />
  );

  return (
    <div className="space-y-4">
      {/* Cooks and actions: one row on a computer */}
      <div className="space-y-4 lg:space-y-0 lg:flex lg:items-start lg:justify-between lg:gap-6">
      {/* Cooks: shifts so far. On a computer, drag a name onto a slot. */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {SCHEDULE_CHEFS.map(c => {
            const sent = !!availability[c.id];
            return (
              <div
                key={c.id}
                draggable
                onDragStart={e => dragStart(e, c.id)}
                onDragEnd={dragEnd}
                className="min-h-[44px] px-3 rounded-xl flex items-center gap-2 text-base font-semibold md:cursor-grab"
                style={{ background: 'var(--bg-card-solid)', color: sent ? '#fff' : 'var(--text-2)', border: '1px solid var(--border)' }}
              >
                {c.displayName}
                <span className="tabular-nums font-medium" style={{ opacity: 0.7 }}>
                  {sent ? `${countFor(assignments, c.id)}/${profiles[c.id]?.max ?? 6}` : 'לא הגיש'}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-base text-text-secondary">
          לוחצים על משבצת ובוחרים טבח מהרשימה (במחשב אפשר גם לגרור). הגישו <span className="tabular-nums">{submitted}</span> מתוך <span className="tabular-nums">{SCHEDULE_CHEFS.length}</span>.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 lg:flex-shrink-0 lg:justify-end">
        <Button variant="secondary" size="sm" icon={Wand2} onClick={runAuto}>שיבוץ אוטומטי</Button>
        {autoCount > 0 && <Button variant="secondary" size="sm" icon={CheckCheck} onClick={approveAll}>אישור {autoCount} הצעות</Button>}
        {autoCount > 0 && <Button variant="ghost" size="sm" icon={X} onClick={clearAuto}>מחיקת הצעות</Button>}
        {Object.keys(assignments).length > 0 && <Button variant="ghost" size="sm" icon={Eraser} onClick={clearAll}>ניקוי הלוח</Button>}
      </div>
      </div>

      {wide ? (
        <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'minmax(0,1fr) 300px' }}>
          <WeekGrid days={days} slots={slots} times={times} onTime={setTimeKey} renderSlot={slot => slotFor(slot, true)} />
          <div className="space-y-4">
            {/* Checks */}
            <div className="rounded-xl px-5 py-4 space-y-2" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
              <div className="text-h3 text-text-primary">בדיקות</div>
              <p className="text-base text-text-secondary">
                {emptyCount ? <><span className="tabular-nums">{emptyCount}</span> משבצות עוד ריקות.</> : 'כל המשבצות מלאות.'}
              </p>
              {problems.length === 0
                ? <p className="text-base" style={{ color: '#5ee3a8' }}>אין בעיות בשיבוץ.</p>
                : problems.map((w, i) => (
                    <p key={i} className="flex items-start gap-2 text-base" style={{ color: w.level === 'error' ? '#F87171' : '#F59E0B' }}>
                      <AlertTriangle size={18} strokeWidth={1.75} className="flex-shrink-0 mt-1" />{w.text}
                    </p>
                  ))}
            </div>


            {/* Publish */}
            <div className="rounded-xl px-5 py-4 space-y-3" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-h3 text-text-primary">פרסום לטבחים</span>
                {!published ? <span className="text-base" style={{ color: '#F59E0B' }}>עוד לא פורסם</span>
                  : changedSincePublish ? <span className="text-base" style={{ color: '#F59E0B' }}>יש שינויים שלא פורסמו</span>
                  : <span className="text-base" style={{ color: '#5ee3a8' }}>פורסם</span>}
              </div>
              {published && <p className="text-base text-text-secondary">פורסם לאחרונה: <span className="tabular-nums">{stamp(published.publishedAt)}</span></p>}
              {autoCount > 0
                ? <p className="text-base text-text-secondary">קודם צריך לאשר או למחוק את <span className="tabular-nums">{autoCount}</span> ההצעות האוטומטיות.</p>
                : <p className="text-base text-text-secondary">אחרי הפרסום כל טבח רואה את המשמרות שלו במסך הבית.</p>}
              <Button fullWidth icon={Send} onClick={publish} disabled={autoCount > 0 || !Object.keys(toPublish).length || (published && !changedSincePublish) || !!publishedState.error}>
                {published ? 'עדכון הסידור' : 'פרסום הסידור'}
              </Button>
              {publishedState.error && <p className="text-base text-sem-danger">הפרסום נכשל. בדוק חיבור לאינטרנט ונסה שוב.</p>}
            </div>
          </div>
        </div>
      ) : (
        <>
        {/* Days */}
        {days.map((isoDay, d) => (
          <div key={isoDay} className="rounded-xl px-4 py-4 space-y-3" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
            <div className="text-h3 text-text-primary">{DAY_NAMES[d]} <span className="text-base font-normal text-text-tertiary tabular-nums">{shortDate(isoDay)}</span></div>
            {SCHEDULE_SHIFTS.map(sh => {
              const shiftSlots = slots.filter(s => s.day === d && s.shift === sh.id);
              if (!shiftSlots.length) return null;
              return (
                <div key={sh.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base text-text-secondary">{sh.name}</span>
                    <TimeChip day={d} shift={sh.id} times={times} onTap={setTimeKey} />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {shiftSlots.map(slot => slotFor(slot, false))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Checks */}
        <div className="rounded-xl px-5 py-4 space-y-2" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
          <div className="text-h3 text-text-primary">בדיקות</div>
          <p className="text-base text-text-secondary">
            {emptyCount ? <><span className="tabular-nums">{emptyCount}</span> משבצות עוד ריקות.</> : 'כל המשבצות מלאות.'}
          </p>
          {problems.length === 0
            ? <p className="text-base" style={{ color: '#5ee3a8' }}>אין בעיות בשיבוץ.</p>
            : problems.map((w, i) => (
                <p key={i} className="flex items-start gap-2 text-base" style={{ color: w.level === 'error' ? '#F87171' : '#F59E0B' }}>
                  <AlertTriangle size={18} strokeWidth={1.75} className="flex-shrink-0 mt-1" />{w.text}
                </p>
              ))}
        </div>


        {/* Publish */}
        <div className="rounded-xl px-5 py-4 space-y-3" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-h3 text-text-primary">פרסום לטבחים</span>
            {!published ? <span className="text-base" style={{ color: '#F59E0B' }}>עוד לא פורסם</span>
              : changedSincePublish ? <span className="text-base" style={{ color: '#F59E0B' }}>יש שינויים שלא פורסמו</span>
              : <span className="text-base" style={{ color: '#5ee3a8' }}>פורסם</span>}
          </div>
          {published && <p className="text-base text-text-secondary">פורסם לאחרונה: <span className="tabular-nums">{stamp(published.publishedAt)}</span></p>}
          {autoCount > 0
            ? <p className="text-base text-text-secondary">קודם צריך לאשר או למחוק את <span className="tabular-nums">{autoCount}</span> ההצעות האוטומטיות.</p>
            : <p className="text-base text-text-secondary">אחרי הפרסום כל טבח רואה את המשמרות שלו במסך הבית.</p>}
          <Button fullWidth icon={Send} onClick={publish} disabled={autoCount > 0 || !Object.keys(toPublish).length || (published && !changedSincePublish) || !!publishedState.error}>
            {published ? 'עדכון הסידור' : 'פרסום הסידור'}
          </Button>
          {publishedState.error && <p className="text-base text-sem-danger">הפרסום נכשל. בדוק חיבור לאינטרנט ונסה שוב.</p>}
        </div>
        </>
      )}

      <Sheet open={!!openSlotObj} onClose={() => setOpenKey(null)} title={openSlotObj ? slotTitle(openSlotObj, days) : ''}>
        {openSlotObj && (
          <CookPicker
            key={`${openSlotObj.key}-${assignments[openSlotObj.key]?.chefId || ''}`}
            slot={openSlotObj}
            current={assignments[openSlotObj.key]}
            start={slotStart(times, openSlotObj.day, openSlotObj.shift, openSlotObj.station)}
            onSaveDetails={d => saveDetails(openSlotObj, d)}
            ctx={ctx}
            onPick={id => { place(openSlotObj, id); setOpenKey(null); }}
            onClear={() => { clearSlot(openSlotObj); setOpenKey(null); }}
            onClose={() => setOpenKey(null)}
          />
        )}
      </Sheet>
      <Sheet open={!!timeKey} onClose={() => setTimeKey(null)} title={timeKey ? `${DAY_NAMES[Number(timeKey.split('-')[0])]} ${shortDate(days[Number(timeKey.split('-')[0])])} · ${SCHEDULE_SHIFTS.find(s => s.id === timeKey.split('-')[1]).name}` : ''}>
        {timeKey && (
          <ShiftTimeEditor
            key={timeKey}
            value={times[timeKey] || defaultStart(timeKey.split('-')[1])}
            usual={defaultStart(timeKey.split('-')[1])}
            onSave={v => { saveTime(timeKey, v); setTimeKey(null); }}
          />
        )}
      </Sheet>
      <UndoToast toast={toast} onUndo={handleUndo} />
    </div>
  );
}

// Arrival time of one shift on one day; tap to change it.
function TimeChip({ day, shift, times, onTap, compact }) {
  const t = shiftStart(times, day, shift);
  const changed = t !== defaultStart(shift);
  return (
    <button
      type="button"
      onClick={() => onTap(shiftKey(day, shift))}
      aria-label={`שעת הגעה ${DAY_NAMES[day]} ${SCHEDULE_SHIFTS.find(s => s.id === shift).short}: ${fmtTime(t)}`}
      className={`${compact ? 'min-h-[32px] w-full justify-center text-sm' : 'min-h-[40px] px-3 text-base'} rounded-lg flex items-center gap-1.5 tabular-nums transition-opacity active:opacity-70`}
      style={{ background: 'var(--bg-inset)', border: `1px solid ${changed ? '#F59E0B' : 'var(--border)'}`, color: changed ? '#F59E0B' : 'var(--text-2)' }}
    >
      <Clock size={compact ? 13 : 15} strokeWidth={1.75} />{fmtTime(t)}
    </button>
  );
}

const TIME_INPUT = 'w-full min-h-[56px] px-4 rounded-2xl text-lg text-text-primary outline-none tabular-nums';
const INPUT_STYLE = { background: 'var(--bg-inset)', border: '1px solid var(--border)', colorScheme: 'dark' };

function ShiftTimeEditor({ value, usual, onSave }) {
  const [v, setV] = useState(value);
  return (
    <div className="space-y-3">
      <label htmlFor="shift-time" className="text-label text-text-secondary block">שעת הגעה לכל המשמרת ביום הזה</label>
      <input id="shift-time" type="time" value={v} onChange={e => setV(e.target.value)} className={TIME_INPUT} style={INPUT_STYLE} dir="ltr" />
      <Button fullWidth onClick={() => onSave(v)} disabled={!v}>שמירה</Button>
      {value !== usual && <Button variant="ghost" fullWidth size="sm" onClick={() => onSave('')}>חזרה לשעה הרגילה ({fmtTime(usual)})</Button>}
    </div>
  );
}

// A cook's own arrival time and note for this slot
function SlotDetails({ current, start, onSave }) {
  const [time, setTime] = useState(current.time || start);
  const [note, setNote] = useState(current.note || '');
  const dirty = time !== (current.time || start) || note.trim() !== (current.note || '');
  const first = nameOf(current.chefId).split(' ')[0];
  return (
    <div className="rounded-xl px-4 py-4 space-y-3" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
      <div className="space-y-1.5">
        <label htmlFor="slot-time" className="text-label text-text-secondary block">שעת הגעה של {first} <span className="text-text-tertiary">(רגיל: {fmtTime(start)})</span></label>
        <input id="slot-time" type="time" value={time} onChange={e => setTime(e.target.value)} className={TIME_INPUT} style={INPUT_STYLE} dir="ltr" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="slot-note" className="text-label text-text-secondary block">הערה ל{first} (לא חובה)</label>
        <input id="slot-note" type="text" maxLength={80} value={note} onChange={e => setNote(e.target.value)} placeholder="למשל: מסיים ב-20:00"
          className="w-full min-h-[56px] px-4 rounded-2xl text-lg text-text-primary placeholder:text-text-tertiary outline-none" style={INPUT_STYLE} />
      </div>
      {dirty && <Button fullWidth size="sm" onClick={() => onSave({ time, note: note.trim() })}>שמירת שעה והערה</Button>}
    </div>
  );
}

function Slot({ slot, a, start, selected, ctx, compact, onTap, onDragStart, onDragEnd, onDrop }) {
  const info = SCHEDULE_STATION_INFO[slot.station];
  let style = { background: 'var(--bg-inset)', border: '1px dashed var(--border-strong, rgba(255,255,255,0.18))', color: 'var(--text-dis)' };
  if (a) style = a.auto
    ? { background: 'rgba(245,158,11,0.10)', border: '1.5px dashed #F59E0B', color: '#fff' }
    : { background: 'var(--bg-elevated, #272727)', border: '1px solid var(--border-strong, rgba(255,255,255,0.18))', color: '#fff' };

  let dim = false;
  if (selected) {
    if (a?.chefId === selected) style = { ...style, outline: '2px solid #fff', outlineOffset: 1 };
    else if (blockReason(selected, slot, ctx)) dim = true;
    else {
      const pref = availabilityOf(selected, slot, ctx) === AVAIL.PREFER;
      style = pref
        ? { background: '#10B981', border: '1.5px solid #10B981', color: '#0b2a1e' }
        : { background: 'rgba(16,185,129,0.10)', border: '1.5px solid rgba(16,185,129,0.5)', color: a ? '#fff' : '#7fd3a3' };
    }
  }

  const who = a ? (compact ? nameOf(a.chefId).split(' ')[0] : nameOf(a.chefId)) : 'ריק';
  return (
    <button
      type="button"
      onClick={onTap}
      draggable={!!a}
      onDragStart={a ? onDragStart : undefined}
      onDragEnd={onDragEnd}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      title={[a?.time && a.time !== start ? `הגעה ${fmtTime(a.time)}` : '', a?.note, a?.reason].filter(Boolean).join(' · ') || undefined}
      aria-label={`${info.name}: ${a ? nameOf(a.chefId) : 'ריק'}${a?.auto ? ' (הצעה)' : ''}`}
      className={`${compact ? 'min-h-[40px] w-full' : 'min-h-[60px]'} px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-opacity duration-150 min-w-0`}
      style={{ ...style, opacity: dim ? 0.35 : 1 }}
    >
      {!compact && <span className="flex items-center gap-1 text-xs whitespace-nowrap" style={{ opacity: 0.85 }}><StationDot station={slot.station} size={8} />{info.name.replace('פס ', '')}</span>}
      <span className="text-base font-semibold truncate max-w-full">{who}</span>
      {a && (a.time || a.note) && (
        <span className="flex items-center gap-1 text-xs font-semibold max-w-full min-w-0" style={{ color: '#F59E0B' }}>
          {a.time && <span className="tabular-nums">{fmtTime(a.time)}</span>}
          {a.note && (compact || a.time ? <MessageSquare size={11} strokeWidth={2} className="flex-shrink-0" /> : <span className="truncate font-medium">{a.note}</span>)}
        </span>
      )}
    </button>
  );
}

// "6.12 14:30"
function stamp(isoTime) {
  const t = new Date(isoTime);
  return `${t.getDate()}.${t.getMonth() + 1} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}

// The whole week in one table: days across, each shift's stations down the side.
function WeekGrid({ days, slots, times, onTime, renderSlot }) {
  const cols = { gridTemplateColumns: '92px repeat(7, minmax(0, 1fr))' };
  const todayIso = iso(new Date());
  return (
    <div className="rounded-xl p-3 space-y-1" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
      <div className="grid gap-1.5 items-end" style={cols}>
        <div />
        {days.map((isoDay, d) => (
          <div key={isoDay} className="text-center pb-1">
            <div className="text-base font-semibold" style={{ color: isoDay === todayIso ? '#5ee3a8' : undefined }}>{DAY_NAMES[d]}</div>
            <div className="text-sm text-text-tertiary tabular-nums">{shortDate(isoDay)}</div>
          </div>
        ))}
      </div>
      {SCHEDULE_SHIFTS.map(sh => {
        const stations = SCHEDULE_STATIONS.filter(st => slots.some(s => s.shift === sh.id && s.station === st));
        if (!stations.length) return null;
        return (
          <div key={sh.id} className="space-y-1 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="grid gap-1.5 items-center" style={cols}>
              <div className="text-base font-medium text-text-secondary">{sh.name}</div>
              {days.map((isoDay, d) => <TimeChip key={isoDay} day={d} shift={sh.id} times={times} onTap={onTime} compact />)}
            </div>
            {stations.map(st => (
              <div key={st} className="grid gap-1.5" style={cols}>
                <div className="flex items-center gap-1.5 text-sm text-text-secondary min-w-0">
                  <StationDot station={st} size={8} /><span className="truncate">{SCHEDULE_STATION_INFO[st].name}</span>
                  {STATION_STARTS[`${sh.id}-${st}`] && <span className="tabular-nums text-text-tertiary">{fmtTime(STATION_STARTS[`${sh.id}-${st}`])}</span>}
                </div>
                {days.map((isoDay, d) => {
                  const cell = slots.filter(s => s.day === d && s.shift === sh.id && s.station === st);
                  return (
                    <div key={isoDay} className="flex flex-col gap-1 min-w-0">
                      {cell.length ? cell.map(renderSlot) : <div className="min-h-[40px] rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }} />}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function slotTitle(slot, days) {
  return `${DAY_NAMES[slot.day]} ${shortDate(days[slot.day])} · ${SCHEDULE_SHIFTS.find(s => s.id === slot.shift).name} · ${SCHEDULE_STATION_INFO[slot.station].name}`;
}

// Every cook for one slot, best first, colored by what they submitted.
const KIND_ORDER = { here: 0, pref: 1, can: 2, blocked: 3, no: 4, none: 5 };
const KIND_LOOK = {
  here:    { row: { background: 'var(--bg-elevated, #272727)', border: '2px solid #fff' },                   label: '#fff' },
  pref:    { row: { background: '#10B981', border: '1.5px solid #10B981', color: '#0b2a1e' },                label: '#0b2a1e' },
  can:     { row: { background: 'rgba(16,185,129,0.10)', border: '1.5px solid rgba(16,185,129,0.5)' },      label: '#7fd3a3' },
  blocked: { row: { background: 'var(--bg-inset)', border: '1px solid var(--border)' },                     label: '#F87171' },
  no:      { row: { background: 'var(--bg-inset)', border: '1px solid var(--border)' },                     label: 'var(--text-dis)' },
  none:    { row: { background: 'var(--bg-inset)', border: '1px dashed var(--border)' },                    label: '#F59E0B' },
};

export function cookOptions(slot, ctx, currentId) {
  return SCHEDULE_CHEFS.map(c => {
    const level = Number(ctx.profiles[c.id]?.ratings?.[slot.station] || 0);
    const v = availabilityOf(c.id, slot, ctx);
    let kind; let label;
    if (c.id === currentId) { kind = 'here'; label = 'משובץ כאן'; }
    else if (!ctx.availability[c.id]) { kind = 'none'; label = 'לא הגיש'; }
    else {
      const why = blockReason(c.id, slot, ctx);
      if (!why) { kind = v === AVAIL.PREFER ? 'pref' : 'can'; label = v === AVAIL.PREFER ? 'מעדיף' : 'יכול'; }
      else if (v === AVAIL.NO) { kind = 'no'; label = 'לא יכול'; }
      else { kind = 'blocked'; label = why; }
    }
    return { id: c.id, name: c.displayName, level, kind, label };
  }).sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || b.level - a.level || a.name.localeCompare(b.name, 'he'));
}

function CookPicker({ slot, current, start, ctx, onPick, onClear, onClose, onSaveDetails }) {
  const options = cookOptions(slot, ctx, current?.chefId);
  const stationName = SCHEDULE_STATION_INFO[slot.station].name;
  return (
    <div className="space-y-2">
      {current && <SlotDetails current={current} start={start} onSave={onSaveDetails} />}
      {current?.auto && current.reason && <p className="text-base text-text-secondary">הצעה אוטומטית: {current.reason}</p>}
      {options.map(o => {
        const look = KIND_LOOK[o.kind];
        const strong = o.kind === 'pref';
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => (o.kind === 'here' ? onClose() : onPick(o.id))}
            aria-label={`${o.name}: ${o.label}`}
            className="w-full min-h-[64px] px-4 rounded-xl flex items-center justify-between gap-3 text-right transition-opacity duration-150 active:opacity-80"
            style={{ color: '#fff', ...look.row }}
          >
            <span className="min-w-0">
              <span className="block text-lg font-semibold truncate">{o.name}</span>
              <span className="block text-sm" style={{ opacity: strong ? 0.85 : 0.6 }}>
                {o.level ? `רמה ${o.level} ב${stationName}` : `לא עובד ב${stationName}`} · {countFor(ctx.assignments, o.id)}/{ctx.profiles[o.id]?.max ?? 6} משמרות
              </span>
            </span>
            <span className={`flex-shrink-0 text-base ${strong ? 'font-bold' : 'font-medium'}`} style={{ color: look.label }}>
              {o.label}
            </span>
          </button>
        );
      })}
      {current && <Button variant="danger" fullWidth size="sm" onClick={onClear}>הוצאת {nameOf(current.chefId)} מהמשבצת</Button>}
      <p className="text-sm text-text-tertiary pt-1">אפשר לבחור גם מי שמסומן באדום. אחרי השיבוץ יופיע כפתור ביטול.</p>
    </div>
  );
}
