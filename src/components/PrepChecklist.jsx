import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { Sun, Plus, RotateCcw, Pencil, Check, Trash2, Undo2, X, MoreHorizontal, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { STATIONS } from '../data/stations';
import { Sheet, Button } from './ui';
import { StickyProgress, SegmentedBar, StatusMark, UndoToast } from './PrepCelebrations';

const SHIFTS     = ['הכנות בוקר', 'הכנות צהריים'];
const SHIFT_KEYS = { 'הכנות בוקר': 'בוקר', 'הכנות צהריים': 'צהריים' };
const SHIFT_HAS_ICON = { 'הכנות בוקר': false, 'הכנות צהריים': true };

const STATUS_OPTIONS = [
  { value: 'todo',     label: 'לא התחיל' },
  { value: 'progress', label: 'בתהליך' },
  { value: 'stuck',    label: 'חסר / תקוע' },
  { value: 'done',     label: 'מוכן' },
];

/* ─── EditableRow: in edit mode, covers the card with a clear delete button ─── */
function EditableRow({ editing, label, onDeleteRequest, children }) {
  return (
    <motion.div layout className="relative">
      {children}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-end pl-4"
            style={{ background: 'rgba(0,0,0,0.45)' }}
          >
            <button
              onClick={onDeleteRequest}
              aria-label={`מחק ${label}`}
              className="w-14 h-14 rounded-2xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: '#DC2626', color: '#fff', }}
            >
              <Trash2 size={22} strokeWidth={2} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── AddPrepModal ─── */
function AddPrepModal({ stationColor, onAdd, onClose }) {
  const [shift, setShift]         = useState('בוקר');
  const [taskName, setTaskName]   = useState('');
  const [targetQty, setTargetQty] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  const [notes, setNotes]         = useState('');
  const [subItems, setSubItems]   = useState([]);
  const [subInput, setSubInput]   = useState('');

  function addSubItem() {
    const label = subInput.trim();
    if (!label) return;
    setSubItems(prev => [...prev, { id: `sub_c_${Date.now()}_${prev.length}`, label }]);
    setSubInput('');
  }

  function handleSubmit() {
    const name = taskName.trim();
    if (!name) return;
    const now = Date.now();
    onAdd({
      id: `custom_${now}`,
      isCustom: true,
      task: name,
      category: 'מותאם אישית',
      categoryIcon: null,
      shift,
      estimatedTime: targetQty ? `${targetQty}${targetUnit ? ' ' + targetUnit : ''}` : null,
      details: notes.trim() || null,
      subItems: subItems.length > 0 ? subItems : undefined,
    });
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl p-6 space-y-5"
        style={{ background: '#1a1a23', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '92vh', overflowY: 'auto' }}
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-1" style={{ background: 'rgba(255,255,255,0.18)' }} />
        <h2 className="text-white font-black text-xl text-center">הוספת הכנה</h2>

        {/* Shift toggle */}
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.62)' }}>משמרת</p>
          <div className="flex gap-2">
            {['בוקר', 'צהריים'].map(s => (
              <button
                key={s}
                onClick={() => setShift(s)}
                className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all"
                style={{
                  background: shift === s ? stationColor + '22' : 'rgba(255,255,255,0.05)',
                  border: shift === s ? `1px solid ${stationColor}55` : '1px solid rgba(255,255,255,0.08)',
                  color: shift === s ? stationColor : 'rgba(255,255,255,0.62)',
                }}
              >
                {s === 'בוקר' ? 'הכנות בוקר' : 'הכנות צהריים'}
              </button>
            ))}
          </div>
        </div>

        {/* Task name */}
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.62)' }}>שם ההכנה *</p>
          <input
            autoFocus
            type="text"
            value={taskName}
            onChange={e => setTaskName(e.target.value)}
            placeholder="לדוגמה: סלט קצוץ"
            className="w-full px-4 py-3 rounded-2xl text-white text-sm focus:outline-none"
            style={{ ...inputStyle, '::placeholder': { color: 'rgba(255,255,255,0.5)' } }}
          />
        </div>

        {/* Qty + unit */}
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.62)' }}>כמות ויחידות</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={targetQty}
              onChange={e => setTargetQty(e.target.value)}
              placeholder="5"
              className="w-20 px-4 py-3 rounded-2xl text-white text-sm focus:outline-none text-center"
              style={inputStyle}
            />
            <input
              type="text"
              value={targetUnit}
              onChange={e => setTargetUnit(e.target.value)}
              placeholder="קילו, יחידות, מגש..."
              className="flex-1 px-4 py-3 rounded-2xl text-white text-sm focus:outline-none"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.62)' }}>הערות</p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="הוראות מיוחדות, טמפרטורה, ספק..."
            rows={2}
            className="w-full px-4 py-3 rounded-2xl text-white text-sm focus:outline-none resize-none"
            style={inputStyle}
          />
        </div>

        {/* Sub-items builder */}
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.62)' }}>תת-הכנות — צ׳קליסט (אופציונלי)</p>
          {subItems.length > 0 && (
            <div className="mb-2 space-y-1.5">
              {subItems.map((sub, idx) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="w-5 h-5 rounded-lg border-2 flex-shrink-0"
                    style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                  />
                  <span className="flex-1 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{sub.label}</span>
                  <button
                    onClick={() => setSubItems(prev => prev.filter((_, i) => i !== idx))}
                    className="text-lg transition-colors flex-shrink-0"
                    style={{ color: 'rgba(255,255,255,0.62)' }}
                  >
                    <X size={18} strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={subInput}
              onChange={e => setSubInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSubItem()}
              placeholder="הוסף פריט לרשימה..."
              className="flex-1 px-4 py-3 rounded-2xl text-white text-sm focus:outline-none"
              style={inputStyle}
            />
            <button
              onClick={addSubItem}
              disabled={!subInput.trim()}
              className="px-4 py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-35"
              style={{ background: stationColor + '22', color: stationColor, border: `1px solid ${stationColor}35` }}
            >
              + הוסף
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!taskName.trim()}
          className="w-full py-4 rounded-2xl font-black text-white text-base transition-all disabled:opacity-35"
          style={{
            background: taskName.trim() ? stationColor : 'rgba(255,255,255,0.08)',
            
          }}
        >
          <span className="inline-flex items-center gap-2"><Check size={18} strokeWidth={2} />הוסף הכנה</span>
        </button>
      </motion.div>
    </>
  );
}

/* ════════════════════════════════════════════
   Main PrepChecklist
════════════════════════════════════════════ */
const TOAST_MS = 5000;

function vibrate(pattern) { window.navigator?.vibrate?.(pattern); }

export default function PrepChecklist({ station, prep }) {
  const {
    completedSubs, setCustomTasks, hiddenIds, setHiddenIds,
    toggleSub, taskStatus, setTaskStatus, resetDay, progress, streak,
  } = prep;

  const [showAdd, setShowAdd]             = useState(false);
  const [editing, setEditing]             = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // task object
  const [confirmReset, setConfirmReset]   = useState(false);
  const [statusFor, setStatusFor]         = useState(null); // task object
  const [openDone, setOpenDone]           = useState({});   // shiftLabel -> bool
  const [toast, setToast]                 = useState(null); // { id, text, undoable, undo }
  const [finishedAt, setFinishedAt]       = useState(null);

  const st = STATIONS[station];
  const { pct, done, total, shiftProgress } = progress;
  const shifts = SHIFTS.map(label => ({ label, ...shiftProgress(SHIFT_KEYS[label]) }));

  const toastTimer = useRef(null);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

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

  // Message after an item is marked done: what's left, never a cheer.
  function doneMessage(name, shiftKey) {
    const leftAll = total - done - 1;
    if (leftAll <= 0) {
      setFinishedAt(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }));
      vibrate([30, 50, 30]);
      return `${name} ✓ · ${st.name} מוכן לשירות`;
    }
    const sp = shiftProgress(shiftKey);
    if (sp.total - sp.done - 1 === 0) {
      const label = SHIFTS.find(l => SHIFT_KEYS[l] === shiftKey);
      return `${label} הושלמו · נשארו ${leftAll} בפס`;
    }
    return `${name} ✓ · נשארו ${leftAll} בפס`;
  }

  const onTapTask = useCallback(task => {
    if (task.subItems) return;
    const prevStatus = taskStatus(task);
    vibrate(15);
    if (prevStatus === 'done') {
      setTaskStatus(task.id, 'todo');
      return;
    }
    setTaskStatus(task.id, 'done');
    showToast(doneMessage(task.task, task.shift), () => setTaskStatus(task.id, prevStatus));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskStatus, setTaskStatus, showToast, total, done]);

  const onToggleSub = useCallback((task, sub) => {
    const wasDone = completedSubs.has(sub.id);
    vibrate(15);
    toggleSub(sub.id);
    if (!wasDone) showToast(doneMessage(sub.label, task.shift), () => toggleSub(sub.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedSubs, toggleSub, showToast, total, done]);

  function chooseStatus(value) {
    if (!statusFor) return;
    const prevStatus = taskStatus(statusFor);
    setTaskStatus(statusFor.id, value);
    if (value === 'done' && prevStatus !== 'done') {
      showToast(doneMessage(statusFor.task, statusFor.shift), () => setTaskStatus(statusFor.id, prevStatus));
    }
    setStatusFor(null);
  }

  const requestDelete = useCallback((task) => {
    setConfirmDelete(task);
  }, []);

  function executeDelete() {
    if (!confirmDelete) return;
    if (confirmDelete.isCustom) {
      setCustomTasks(prev => prev.filter(t => t.id !== confirmDelete.id));
    } else {
      setHiddenIds(prev => { const next = new Set(prev); next.add(confirmDelete.id); return next; });
    }
    setConfirmDelete(null);
  }

  function executeReset() {
    resetDay();
    setFinishedAt(null);
    setConfirmReset(false);
  }

  const renderRow = task => (
    <EditableRow
      key={task.id}
      editing={editing}
      label={task.task}
      onDeleteRequest={() => requestDelete(task)}
    >
      <TaskRow
        task={task}
        status={taskStatus(task)}
        completedSubs={completedSubs}
        stationColor={st.color}
        onTap={() => onTapTask(task)}
        onOpenStatus={() => setStatusFor(task)}
        onToggleSub={sub => onToggleSub(task, sub)}
      />
    </EditableRow>
  );

  return (
    <div className="max-w-xl mx-auto" dir="rtl">

      <StickyProgress done={done} total={total} color={st.color} streak={streak.count} />

      <div className="p-4 md:p-6 space-y-8">

      {/* ── Station ready ── */}
      {pct === 100 && (
        <div className="rounded-xl px-5 py-6 text-center space-y-1" style={{ border: '1px solid rgba(16,185,129,0.35)' }}>
          <div className="text-2xl font-bold text-text-primary">{st.name} מוכן לשירות</div>
          <div className="text-base text-text-secondary tabular-nums">
            {total} פריטים{finishedAt ? ` · הושלם ב-${finishedAt}` : ''}
          </div>
          {streak.count > 1 && (
            <div className="text-base text-text-secondary tabular-nums">{streak.count} ימים ברצף שהפס מוכן</div>
          )}
        </div>
      )}

      {/* ── Shift sections ── */}
      {shifts.map(({ label: shiftLabel, tasks: shiftTasks, done: shiftDone, total: shiftTotal }) => {
        if (shiftTasks.length === 0) return null;
        const pending  = shiftTasks.filter(t => !progress.isTaskDone(t));
        const finished = shiftTasks.filter(t => progress.isTaskDone(t));
        const showDone = editing || openDone[shiftLabel];
        const complete = shiftDone === shiftTotal;

        return (
          <section key={shiftLabel} className="space-y-3">
            <div className="flex items-center gap-2">
              {SHIFT_HAS_ICON[shiftLabel] && <Sun size={18} className="text-text-secondary" strokeWidth={1.5} />}
              <h3 className="text-text-primary font-bold text-xl">{shiftLabel}</h3>
              <span className="mr-auto text-base tabular-nums text-text-secondary">
                {complete ? 'הושלם' : `${shiftDone}/${shiftTotal}`}
              </span>
            </div>
            <SegmentedBar done={shiftDone} total={shiftTotal} color={complete ? '#10B981' : st.color} height={4} />

            {pending.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
                <AnimatePresence initial={false}>
                  {pending.map(renderRow)}
                </AnimatePresence>
              </div>
            )}

            {finished.length > 0 && (
              <div>
                <button
                  onClick={() => setOpenDone(o => ({ ...o, [shiftLabel]: !o[shiftLabel] }))}
                  aria-expanded={!!showDone}
                  className="w-full flex items-center gap-2 min-h-[48px] px-1 text-base text-text-secondary"
                >
                  <ChevronDown size={18} strokeWidth={1.5} style={{ transform: showDone ? 'none' : 'rotate(90deg)', transition: 'transform 0.15s' }} />
                  הושלמו <span className="tabular-nums">({finished.length})</span>
                </button>
                {showDone && (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <AnimatePresence initial={false}>
                      {finished.map(renderRow)}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}

      {/* ── Add / edit ── */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowAdd(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-medium min-h-[52px] text-text-primary"
          style={{ border: '1px solid var(--border)' }}
        >
          <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
          הוסף הכנה
        </button>
        <button
          onClick={() => setEditing(v => !v)}
          aria-pressed={editing}
          className="flex items-center justify-center gap-2 px-5 min-h-[52px] rounded-xl text-base font-medium"
          style={editing
            ? { background: 'rgba(255,255,255,0.92)', color: '#121212' }
            : { color: 'rgba(255,255,255,0.8)', border: '1px solid var(--border)' }}
        >
          {editing ? <Check size={18} strokeWidth={2} aria-hidden="true" /> : <Pencil size={18} strokeWidth={1.5} aria-hidden="true" />}
          {editing ? 'סיום' : 'עריכה'}
        </button>
      </div>

      {editing && hiddenIds.size > 0 && (
        <button
          onClick={() => setHiddenIds(new Set())}
          className="w-full flex items-center justify-center gap-2 min-h-[48px] rounded-xl text-base font-medium text-text-secondary"
          style={{ border: '1px dashed rgba(255,255,255,0.18)' }}
        >
          <Undo2 size={18} strokeWidth={1.5} aria-hidden="true" />
          שחזר {hiddenIds.size} הכנות קבועות שנמחקו
        </button>
      )}

      {/* ── Reset (rarely needed — the list resets itself every morning) ── */}
      <div className="flex justify-center pt-2 pb-24">
        <button
          onClick={() => setConfirmReset(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-text-tertiary min-h-[44px]"
        >
          <RotateCcw size={14} strokeWidth={1.75} />
          איפוס יום
        </button>
      </div>

      </div>

      {/* ── Status picker ── */}
      <Sheet open={!!statusFor} onClose={() => setStatusFor(null)} title={statusFor?.task}>
        <div className="space-y-2">
          {STATUS_OPTIONS
            .filter(o => !(o.value === 'done' && statusFor?.subItems))
            .map(o => {
              const current = statusFor && taskStatus(statusFor) === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => chooseStatus(o.value)}
                  className="w-full flex items-center gap-4 min-h-[60px] px-4 rounded-xl text-lg text-text-primary"
                  style={{ background: current ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid var(--border)' }}
                >
                  <StatusMark status={o.value} color={st.color} size={26} />
                  <span className="flex-1 text-right">{o.label}</span>
                  {current && <Check size={18} strokeWidth={2} className="text-text-secondary" />}
                </button>
              );
            })}
        </div>
      </Sheet>

      {/* ── Reset confirmation ── */}
      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="לאפס את הצ׳ק ליסט של היום?">
        <p className="text-body text-text-secondary mb-2">
          כל הסימונים של {st.name} מהיום יימחקו — לכל הצוות.
        </p>
        <p className="text-body text-text-tertiary mb-6">
          לא צריך לאפס כל יום: הרשימה מתאפסת לבד בכל בוקר.
        </p>
        <div className="flex gap-3">
          <Button variant="danger" fullWidth onClick={executeReset}>כן, אפס</Button>
          <Button variant="ghost" fullWidth onClick={() => setConfirmReset(false)}>ביטול</Button>
        </div>
      </Sheet>

      {/* ── Delete confirmation ── */}
      <Sheet open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="למחוק את ההכנה?">
        <p className="text-h3 text-text-primary font-bold mb-1">{confirmDelete?.task}</p>
        <p className="text-body text-text-secondary mb-6">
          {confirmDelete?.isCustom ? 'ההכנה תימחק מהרשימה.' : 'זו הכנה קבועה — אפשר לשחזר אותה במצב עריכה.'}
        </p>
        <div className="flex gap-3">
          <Button variant="danger" fullWidth onClick={executeDelete}>כן, מחק</Button>
          <Button variant="ghost" fullWidth onClick={() => setConfirmDelete(null)}>ביטול</Button>
        </div>
      </Sheet>

      {/* ── Add Prep Modal ── */}
      <AnimatePresence>
        {showAdd && (
          <AddPrepModal
            stationColor={st.color}
            onAdd={task => { setCustomTasks(prev => [...prev, task]); setShowAdd(false); }}
            onClose={() => setShowAdd(false)}
          />
        )}
      </AnimatePresence>

      <UndoToast toast={toast} onUndo={handleUndo} />
    </div>
  );
}

/* ════════════════════════════════════════════
   TaskRow — one flat row; tap marks done, the side button picks a status
════════════════════════════════════════════ */
const STATUS_HINT = { progress: 'בתהליך', stuck: 'חסר / תקוע' };

const TaskRow = memo(function TaskRow({ task, status, completedSubs, stationColor, onTap, onOpenStatus, onToggleSub }) {
  const hasSubItems = !!task.subItems;
  const isDone = status === 'done';
  const meta = [task.category, task.details, task.estimatedTime].filter(Boolean).join(' · ');

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18 }}
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-stretch">
        <button
          onClick={onTap}
          disabled={hasSubItems}
          className="flex-1 flex items-center gap-4 pr-4 pl-2 py-3 min-h-[64px] text-right select-none disabled:cursor-default"
        >
          <StatusMark status={status} color={stationColor} />
          <span className="flex-1 min-w-0">
            <span className={`block text-lg font-medium leading-snug ${isDone ? 'text-text-secondary' : 'text-text-primary'}`}>
              {task.task}
            </span>
            {(STATUS_HINT[status] || meta) && (
              <span className="block text-sm text-text-secondary mt-0.5">
                {STATUS_HINT[status] && (
                  <span style={{ color: status === 'stuck' ? '#F87171' : '#F59E0B' }}>{STATUS_HINT[status]}{meta ? ' · ' : ''}</span>
                )}
                {meta}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={onOpenStatus}
          aria-label={`מצב: ${task.task}`}
          className="w-14 flex items-center justify-center text-text-tertiary flex-shrink-0"
        >
          <MoreHorizontal size={20} strokeWidth={1.5} />
        </button>
      </div>

      {hasSubItems && (
        <div className="pr-16 pl-4 pb-2">
          {task.subItems.map(sub => {
            const subDone = completedSubs.has(sub.id);
            return (
              <button
                key={sub.id}
                onClick={() => onToggleSub(sub)}
                className="w-full flex items-center gap-3 min-h-[52px] text-right select-none"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <StatusMark status={subDone ? 'done' : 'todo'} color={stationColor} size={24} />
                <span className={`flex-1 text-base ${subDone ? 'text-text-secondary' : 'text-text-primary'}`}>{sub.label}</span>
                {sub.unit && <span className="text-sm text-text-secondary">{sub.unit}</span>}
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
});
