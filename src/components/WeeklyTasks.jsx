import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, RotateCcw, Check, Plus, Pencil, Trash2, Undo2 } from 'lucide-react';
import { WEEKLY_TASKS, DAYS, CATEGORIES } from '../data/weeklyTasks';
import { STATIONS } from '../data/stations';
import { useFirestoreSet } from '../hooks/useFirestoreSet';
import { useFirestoreArray } from '../hooks/useFirestoreArray';
import { useServiceDay, getWeekStart, getDayIndex } from '../hooks/usePrepState';
import { Sheet, Button, Input, EmptyState } from './ui';
import { StickyProgress, StatusMark, UndoToast } from './PrepCelebrations';

const DAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const ALL = 'הכל';
const TOAST_MS = 5000;

function vibrate(pattern) { window.navigator?.vibrate?.(pattern); }

export default function WeeklyTasks({ station }) {
  const serviceDay = useServiceDay();
  const weekStart  = getWeekStart(serviceDay);
  const todayIdx   = getDayIndex(serviceDay);

  // Keyed by week, so the list starts clean every Sunday automatically.
  const [completed, setCompleted] = useFirestoreSet(`weekly_${station}_${weekStart}`);
  const [dayIdx, setDayIdx]       = useState(todayIdx);
  const [category, setCategory]   = useState(ALL);
  const [customTasks, setCustomTasks] = useFirestoreArray(`custom_weekly_${station}`);
  const [hiddenIds, setHiddenIds]     = useFirestoreSet(`hidden_weekly_${station}`);
  const [editing, setEditing]         = useState(false);
  const [showAdd, setShowAdd]         = useState(false);
  const [toast, setToast]         = useState(null);
  const toastTimer                = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const st          = STATIONS[station];
  const stationById = Object.fromEntries(Object.values(STATIONS).map(s => [s.id, s]));
  const day         = DAYS[dayIdx];
  const allTasks    = [...WEEKLY_TASKS.filter(t => !hiddenIds.has(t.id)), ...customTasks];

  const weekDone  = allTasks.filter(t => completed.has(t.id)).length;
  const weekTotal = allTasks.length;
  const weekPct   = weekTotal ? Math.round((weekDone / weekTotal) * 100) : 0;

  const dayTasks   = allTasks.filter(t => t.day === day);
  const dayDone    = dayTasks.filter(t => completed.has(t.id)).length;
  const categories = CATEGORIES.filter(c => c === ALL || dayTasks.some(t => t.category === c));
  const activeCat  = categories.includes(category) ? category : ALL;
  const groups     = categories
    .filter(c => c !== ALL && (activeCat === ALL || activeCat === c))
    .map(c => ({ name: c, tasks: dayTasks.filter(t => t.category === c) }));

  // Bottom toast; with `undo` it shows a "ביטול" button for 5 seconds
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

  const setDone = (id, want) => setCompleted(prev => {
    const next = new Set(prev);
    want ? next.add(id) : next.delete(id);
    return next;
  });

  function toggleTask(task) {
    const wasDone = completed.has(task.id);
    vibrate(15);
    setDone(task.id, !wasDone);
    if (wasDone) return;

    // Message states what's left, never a cheer
    const remaining = list => list.filter(t => t.id !== task.id && !completed.has(t.id)).length;
    const leftWeek = remaining(allTasks);
    const leftDay  = remaining(dayTasks);
    const text = leftWeek === 0 ? `${task.task} ✓ · השבוע הושלם`
      : leftDay === 0 ? `${task.task} ✓ · יום ${day} הושלם · נשארו ${leftWeek} השבוע`
      : `${task.task} ✓ · נשארו ${leftDay} היום`;
    if (leftDay === 0) vibrate([30, 50, 30]);
    showToast(text, () => setDone(task.id, false));
  }

  function addTask({ task, day: taskDay, category: taskCategory, notes }) {
    setCustomTasks(prev => [...prev, {
      id: `wc_${Date.now()}`,
      isCustom: true,
      task,
      category: taskCategory,
      day: taskDay,
      notes,
      assignedTo: station,
    }]);
    setShowAdd(false);
    setDayIdx(DAYS.indexOf(taskDay));
    showToast('המשימה נוספה');
  }

  // Delete right away, Undo brings it back (fixed tasks are only hidden)
  function deleteTask(task) {
    if (task.isCustom) {
      const index = customTasks.findIndex(t => t.id === task.id);
      setCustomTasks(prev => prev.filter(t => t.id !== task.id));
      showToast(`${task.task} נמחקה`, () => setCustomTasks(prev => {
        if (prev.some(t => t.id === task.id)) return prev;
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, task);
        return next;
      }));
    } else {
      setHiddenIds(prev => new Set(prev).add(task.id));
      showToast(`${task.task} נמחקה`, () => setHiddenIds(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      }));
    }
  }

  function resetWeek() {
    const before = new Set(completed);
    setCompleted(new Set());
    showToast('הסימונים של השבוע אופסו', () => setCompleted(before));
  }

  function selectDay(i) {
    setDayIdx(i);
    setCategory(ALL);
  }

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">

      <StickyProgress pct={weekPct} done={weekDone} total={weekTotal} color={st.color} />

      <div className="p-4 md:p-6 space-y-5">

        {/* ── Day strip ── */}
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((d, i) => {
            const tasks    = allTasks.filter(t => t.day === d);
            const left     = tasks.filter(t => !completed.has(t.id)).length;
            const allDone  = tasks.length > 0 && left === 0;
            const selected = i === dayIdx;
            return (
              <button
                key={d}
                onClick={() => selectDay(i)}
                aria-label={`יום ${d}, נותרו ${left}`}
                aria-pressed={selected}
                className="flex flex-col items-center justify-center gap-1 rounded-xl min-h-[72px] pt-1 transition-colors duration-150"
                style={selected
                  ? { background: 'rgba(255,255,255,0.10)', border: `2px solid ${st.color}` }
                  : { background: 'var(--bg-surface)', border: '2px solid var(--border)' }}
              >
                <span className="text-sm font-semibold" style={{ color: selected ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                  {DAY_SHORT[i]}
                </span>
                {allDone ? (
                  <Check size={20} strokeWidth={2.5} style={{ color: '#10B981' }} />
                ) : (
                  <span className="text-lg font-bold tabular-nums leading-none text-text-primary">
                    {left}
                  </span>
                )}
                {/* Today marker — always reserves its row so all days align */}
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: i === todayIdx ? st.color : 'transparent' }}
                />
              </button>
            );
          })}
        </div>

        {/* ── Day title ── */}
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-2xl font-bold text-white">
            יום {day}
            {dayIdx === todayIdx && <span className="text-base font-medium mr-2 text-text-secondary">· היום</span>}
          </h2>
          <span className="text-base font-semibold tabular-nums text-text-secondary">
            {dayDone}/{dayTasks.length} הושלמו
          </span>
        </div>

        {/* ── Add / edit ── */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-xl text-base font-semibold transition-colors duration-150 active:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
          >
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
            הוסף משימה
          </button>
          <button
            onClick={() => setEditing(v => !v)}
            aria-pressed={editing}
            className="flex items-center justify-center gap-2 px-5 min-h-[48px] rounded-xl text-base font-semibold transition-colors duration-150"
            style={{
              background: editing ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {editing ? <Check size={18} strokeWidth={2.5} aria-hidden="true" /> : <Pencil size={18} strokeWidth={2} aria-hidden="true" />}
            {editing ? 'סיום' : 'עריכה'}
          </button>
        </div>

        {/* ── Category chips (only when the day has more than one) ── */}
        {categories.length > 2 && (
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1" style={{ scrollbarWidth: 'none' }}>
            {categories.map(c => {
              const active = c === activeCat;
              const count  = c === ALL ? dayTasks.length : dayTasks.filter(t => t.category === c).length;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={active}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl text-base font-medium transition-colors duration-150"
                  style={active
                    ? { background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {c}
                  <span className="tabular-nums" style={{ opacity: 0.55 }}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Task groups ── */}
        {dayTasks.length === 0 ? (
          <EmptyState icon={CalendarDays} title="אין משימות ביום הזה" description="אפשר לבחור יום אחר למעלה" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            {groups.map(g => (
              <TaskGroup
                key={g.name}
                name={g.name}
                tasks={g.tasks}
                completed={completed}
                onToggle={toggleTask}
                onDelete={deleteTask}
                editing={editing}
                color={st.color}
                station={station}
                stationById={stationById}
              />
            ))}
          </div>
        )}

        {editing && hiddenIds.size > 0 && (
          <button
            onClick={() => setHiddenIds(new Set())}
            className="w-full flex items-center justify-center gap-2 min-h-[48px] rounded-2xl text-base font-semibold text-text-secondary"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.18)' }}
          >
            <Undo2 size={18} strokeWidth={2} aria-hidden="true" />
            שחזר {hiddenIds.size} משימות קבועות שנמחקו
          </button>
        )}

        {/* ── Reset (rarely needed — the list resets itself every Sunday) ── */}
        <div className="flex justify-center pt-4 pb-2">
          <button
            onClick={resetWeek}
            disabled={weekDone === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-base font-medium text-text-tertiary min-h-[48px] disabled:opacity-40"
          >
            <RotateCcw size={14} strokeWidth={1.75} />
            איפוס שבוע
          </button>
        </div>
      </div>

      <AddWeeklySheet
        open={showAdd}
        defaultDay={day}
        color={st.color}
        onAdd={addTask}
        onClose={() => setShowAdd(false)}
      />

      <UndoToast toast={toast} onUndo={handleUndo} />
    </div>
  );
}

/* ─── Add a weekly task: name, day, category, optional notes ─── */
function AddWeeklySheet({ open, defaultDay, color, onAdd, onClose }) {
  const [task, setTask]         = useState('');
  const [day, setDay]           = useState(defaultDay);
  const [category, setCategory] = useState('הכנות');
  const [notes, setNotes]       = useState('');

  useEffect(() => {
    if (open) { setTask(''); setNotes(''); setDay(defaultDay); }
  }, [open, defaultDay]);

  const name = task.trim();

  function submit() {
    if (!name) return;
    onAdd({ task: name, day, category, notes: notes.trim() });
  }

  const chip = (active) => active
    ? { background: color, color: '#fff' }
    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.1)' };

  return (
    <Sheet open={open} onClose={onClose} title="משימה שבועית חדשה">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto -mx-1 px-1">
        <Input
          label="שם המשימה"
          placeholder="לדוגמה: איולי צ׳יפוטלה"
          value={task}
          onChange={e => setTask(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          autoFocus
        />

        <div>
          <p className="text-label text-text-secondary px-1 mb-2">יום</p>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((d, i) => (
              <button
                key={d}
                onClick={() => setDay(d)}
                aria-pressed={day === d}
                aria-label={`יום ${d}`}
                className="min-h-[48px] rounded-xl text-base font-bold transition-colors"
                style={chip(day === d)}
              >
                {DAY_SHORT[i]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-label text-text-secondary px-1 mb-2">קטגוריה</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter(c => c !== ALL).map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className="px-4 min-h-[44px] rounded-xl text-base font-bold transition-colors"
                style={chip(category === c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="הערות (לא חובה)"
          placeholder="כמות, ספק, הוראה מיוחדת…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <Button variant="secondary" fullWidth onClick={submit} disabled={!name} icon={Plus}>
          הוסף משימה
        </Button>
      </div>
    </Sheet>
  );
}

/* ─── One category as a compact grouped list; finished items sink to the bottom ─── */
function TaskGroup({ name, tasks, completed, onToggle, onDelete, editing, color, station, stationById }) {
  const done   = tasks.filter(t => completed.has(t.id)).length;
  const sorted = [...tasks].sort((a, b) => completed.has(a.id) - completed.has(b.id));
  const full   = done === tasks.length;

  return (
    <section
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card-solid)', border: `1px solid ${full ? 'rgba(16,185,129,0.35)' : 'var(--border)'}` }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 className="text-xl font-bold text-white">{name}</h3>
        <span className="text-base tabular-nums text-text-secondary">
          {full ? 'הושלם' : `${done}/${tasks.length}`}
        </span>
      </div>

      <ul>
        <AnimatePresence initial={false}>
          {sorted.map((task, i) => {
            const isDone      = completed.has(task.id);
            const taskStation = task.assignedTo !== station ? stationById[task.assignedTo] : null;
            return (
              <motion.li
                key={task.id}
                layout
                transition={{ duration: 0.18 }}
                style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}
              >
                <div className="flex items-center">
                <button
                  onClick={() => !editing && onToggle(task)}
                  disabled={editing}
                  className="flex-1 min-w-0 flex items-center gap-4 px-4 min-h-[64px] py-2 text-right active:bg-white/5 transition-colors duration-150"
                >
                  <StatusMark status={isDone ? 'done' : 'todo'} color={color} />
                  <span className="flex-1 min-w-0">
                    <span
                      className="block text-lg font-medium leading-snug transition-colors duration-150"
                      style={{ color: isDone ? 'rgba(255,255,255,0.62)' : '#fff' }}
                    >
                      {task.task}
                    </span>
                    {task.notes && <span className="block text-base text-text-secondary mt-0.5">{task.notes}</span>}
                  </span>
                  {taskStation && (
                    <span className="text-sm font-bold px-2 py-1 rounded-lg flex-shrink-0" style={{ background: taskStation.color + '20', color: taskStation.color }}>
                      {taskStation.name}
                    </span>
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {editing && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      onClick={() => onDelete(task)}
                      aria-label={`מחק ${task.task}`}
                      className="w-12 h-12 ml-2 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}
                    >
                      <Trash2 size={20} strokeWidth={2} />
                    </motion.button>
                  )}
                </AnimatePresence>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}
