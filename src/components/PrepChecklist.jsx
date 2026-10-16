import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { Sun, Sparkles, Tag, Plus, RotateCcw, Clock, Pencil, Check, Trash2, Undo2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { STATIONS } from '../data/stations';
import { Sheet, Button } from './ui';
import { StickyProgress, CheerToast, CelebrationOverlay, StreakBadge } from './PrepCelebrations';

const SHIFTS     = ['הכנות בוקר', 'הכנות צהריים'];
const SHIFT_KEYS = { 'הכנות בוקר': 'בוקר', 'הכנות צהריים': 'צהריים' };
const SHIFT_HAS_ICON = { 'הכנות בוקר': false, 'הכנות צהריים': true };

/* ─── Particle burst on task completion ─── */
function Particle({ angle, speed, color, size }) {
  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x: Math.cos(angle) * speed, y: Math.sin(angle) * speed, opacity: 0, scale: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        position: 'absolute', top: '50%', right: 0,
        width: size, height: size, borderRadius: '50%',
        background: color, boxShadow: `0 0 5px ${color}`,
        pointerEvents: 'none', zIndex: 30, transform: 'translateY(-50%)',
      }}
    />
  );
}
const PARTICLE_COLORS = c => [c, c + 'bb', '#ffffff', '#ffffff99'];
function spawnParticles(color) {
  return Array.from({ length: 14 }, (_, i) => ({
    id: i + Date.now(),
    angle: (i / 14) * Math.PI * 2,
    speed: 30 + Math.random() * 40,
    color: PARTICLE_COLORS(color)[Math.floor(Math.random() * 4)],
    size: 4 + Math.random() * 4,
  }));
}

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
            className="absolute inset-0 rounded-3xl flex items-center justify-end pl-4"
            style={{ background: 'rgba(0,0,0,0.45)' }}
          >
            <button
              onClick={onDeleteRequest}
              aria-label={`מחק ${label}`}
              className="w-14 h-14 rounded-2xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: '#DC2626', color: '#fff', boxShadow: '0 4px 16px rgba(220,38,38,0.4)' }}
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
                    ✕
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
            boxShadow: taskName.trim() ? `0 0 24px ${stationColor}45` : 'none',
          }}
        >
          ✓ הוסף הכנה
        </button>
      </motion.div>
    </>
  );
}

/* ════════════════════════════════════════════
   Main PrepChecklist
════════════════════════════════════════════ */
const MILESTONES = [
  { at: 25, text: 'רבע מהפריפ בפנים 💪' },
  { at: 50, text: 'חצי דרך! ממשיכים 🔥' },
  { at: 75, text: 'עוד קצת ואתה שם 🚀' },
];

function vibrate(pattern) { window.navigator?.vibrate?.(pattern); }

export default function PrepChecklist({ station, prep }) {
  const {
    completedSubs, setCustomTasks, hiddenIds, setHiddenIds,
    toggleTask, toggleSub, resetDay, progress, streak,
  } = prep;

  const [showAdd, setShowAdd]             = useState(false);
  const [editing, setEditing]             = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // task object
  const [confirmReset, setConfirmReset]   = useState(false);
  const [toast, setToast]                 = useState(null);
  const [celebrate, setCelebrate]         = useState(null); // { finishedAt }

  const st = STATIONS[station];
  const { pct, done, total, shiftProgress } = progress;
  const shifts = SHIFTS.map(label => ({ label, ...shiftProgress(SHIFT_KEYS[label]) }));

  // ── Celebrations: only react to progress the cook just made on this screen ──
  const lastActionRef = useRef(0);
  const prevRef       = useRef({ pct, done, shiftPcts: shifts.map(s => s.pct) });
  const toastTimer    = useRef(null);

  const showToast = useCallback((text, color) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, color });
    vibrate([20, 40, 20]);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const shiftPctKey = shifts.map(s => s.pct).join(',');
  useEffect(() => {
    const prev      = prevRef.current;
    const shiftPcts = shiftPctKey.split(',').map(Number);
    prevRef.current = { pct, done, shiftPcts };

    const userCaused = Date.now() - lastActionRef.current < 2000;
    if (!userCaused || pct <= prev.pct) return;

    if (pct === 100) {
      vibrate([40, 60, 40, 60, 80]);
      setToast(null);
      setCelebrate({ finishedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) });
      return;
    }
    const finishedShift = SHIFTS.find((_, i) => shiftPcts[i] === 100 && prev.shiftPcts[i] < 100);
    if (finishedShift) return showToast(`${finishedShift} — סגור! ✅`, '#10B981');

    const milestone = [...MILESTONES].reverse().find(m => prev.pct < m.at && pct >= m.at);
    if (milestone) return showToast(milestone.text, st.color);

    if (prev.done === 0 && done > 0) showToast('יאללה, יצאנו לדרך ⚡', st.color);
  }, [pct, done, shiftPctKey, showToast, st.color]);

  const onToggleTask = useCallback(id => { lastActionRef.current = Date.now(); toggleTask(id); }, [toggleTask]);
  const onToggleSub  = useCallback(id => { lastActionRef.current = Date.now(); toggleSub(id); }, [toggleSub]);

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
    setConfirmReset(false);
  }

  return (
    <div className="max-w-xl mx-auto" dir="rtl">

      <StickyProgress pct={pct} done={done} total={total} color={st.color} streak={streak.count} />

      <div className="p-4 md:p-6 space-y-6">

      {/* ── Add / edit ── */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowAdd(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-bold min-h-[52px] active:scale-[0.98] transition-transform"
          style={{ background: st.color + '18', border: `1px solid ${st.color}40`, color: st.color }}
        >
          <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
          הוסף הכנה
        </button>
        <button
          onClick={() => setEditing(v => !v)}
          aria-pressed={editing}
          className="flex items-center justify-center gap-2 px-5 min-h-[52px] rounded-2xl text-base font-bold active:scale-[0.98] transition-transform"
          style={editing
            ? { background: 'rgba(255,255,255,0.92)', color: '#121212' }
            : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {editing ? <Check size={18} strokeWidth={2.5} aria-hidden="true" /> : <Pencil size={18} strokeWidth={2} aria-hidden="true" />}
          {editing ? 'סיום' : 'עריכה'}
        </button>
      </div>

      {/* ── Shift sections ── */}
      {shifts.map(({ label: shiftLabel, tasks: shiftTasks, done: shiftDone, total: shiftTotal, pct: shiftPct }) => {
        if (shiftTasks.length === 0) return null;

        return (
          <section key={shiftLabel}>
            <div className="flex items-center gap-3 mb-3">
              {SHIFT_HAS_ICON[shiftLabel] && <Sun size={20} style={{ color: '#F59E0B' }} strokeWidth={1.5} />}
              <div>
                <h3 className="text-white font-black text-xl">{shiftLabel}</h3>
                <span className="text-sm text-text-secondary tabular-nums">
                  {shiftDone}/{shiftTotal} פריטים · {shiftPct}%
                </span>
              </div>
              <AnimatePresence>
                {shiftPct === 100 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.7, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="mr-auto text-sm font-bold px-3 py-1 rounded-xl"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}
                  >
                    ✓ הושלם
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${shiftPct}%` }}
                transition={{ duration: 0.5 }}
                style={{ backgroundColor: shiftPct === 100 ? '#34D399' : st.color }}
              />
            </div>

            <div className="space-y-3">
              {shiftTasks.map(task => (
                <EditableRow
                  key={task.id}
                  editing={editing}
                  label={task.task}
                  onDeleteRequest={() => requestDelete(task)}
                >
                  <TaskCard
                    task={task}
                    isDone={progress.isTaskDone(task)}
                    completedSubs={completedSubs}
                    stationColor={st.color}
                    onToggle={() => !task.subItems && onToggleTask(task.id)}
                    onToggleSub={onToggleSub}
                  />
                </EditableRow>
              ))}
            </div>
          </section>
        );
      })}

      {/* ── Completion banner ── */}
      <AnimatePresence>
        {pct === 100 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="rounded-3xl p-6 text-center"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <div className="flex justify-center mb-3">
              <Sparkles size={36} style={{ color: '#34d399' }} strokeWidth={1.25} />
            </div>
            <div className="font-black text-xl" style={{ color: '#34d399' }}>כל המשימות הושלמו!</div>
            <div className="text-base mt-1 text-text-secondary">עבודה מעולה — הפריפ היומי הושלם.</div>
            {streak.count > 0 && (
              <div className="flex justify-center mt-3"><StreakBadge count={streak.count} /></div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {editing && hiddenIds.size > 0 && (
        <button
          onClick={() => setHiddenIds(new Set())}
          className="w-full flex items-center justify-center gap-2 min-h-[48px] rounded-2xl text-base font-semibold text-text-secondary"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.18)' }}
        >
          <Undo2 size={18} strokeWidth={2} aria-hidden="true" />
          שחזר {hiddenIds.size} הכנות קבועות שנמחקו
        </button>
      )}

      {/* ── Reset (rarely needed — the list resets itself every morning) ── */}
      <div className="flex justify-center pt-6 pb-2">
        <button
          onClick={() => setConfirmReset(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-text-tertiary min-h-[44px]"
        >
          <RotateCcw size={14} strokeWidth={1.75} />
          איפוס יום
        </button>
      </div>

      </div>

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

      <CheerToast toast={toast} />

      <CelebrationOverlay
        open={!!celebrate}
        onClose={() => setCelebrate(null)}
        stationName={st.name}
        color={st.color}
        total={total}
        finishedAt={celebrate?.finishedAt}
        streak={streak}
      />
    </div>
  );
}

/* ════════════════════════════════════════════
   TaskCard — with celebration burst
════════════════════════════════════════════ */
const TaskCard = memo(function TaskCard({ task, isDone, completedSubs, stationColor, onToggle, onToggleSub }) {
  const hasSubItems = !!task.subItems;
  const [particles, setParticles] = useState([]);

  function handleToggle() {
    if (hasSubItems) return;
    window.navigator?.vibrate?.(15);
    onToggle();
    if (!isDone) {
      const ps = spawnParticles(stationColor);
      setParticles(ps);
      setTimeout(() => setParticles([]), 700);
    }
  }

  function handleToggleSub(id, wasDone) {
    window.navigator?.vibrate?.(15);
    onToggleSub(id);
    if (!wasDone) {
      const ps = spawnParticles(stationColor);
      setParticles(ps);
      setTimeout(() => setParticles([]), 700);
    }
  }

  return (
    <motion.div
      layout
      animate={isDone ? { scale: [1, 1.025, 0.99, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      className="rounded-3xl overflow-hidden"
      style={{
        background: 'var(--bg-card-solid)',
        border: isDone ? `1px solid ${stationColor}30` : '1px solid var(--border)',
        transition: 'border-color 0.4s ease',
      }}
    >
      {/* Category label */}
      <div className="flex items-center gap-2 px-5 pt-3 pb-1">
        <Tag size={12} style={{ color: stationColor + 'bb' }} strokeWidth={1.5} />
        <span className="text-sm font-bold uppercase tracking-wider" style={{ color: stationColor + 'bb' }}>
          {task.category}
        </span>
      </div>

      {/* Main row */}
      <div
        className={`flex items-center gap-4 px-5 pb-4 pt-1 select-none min-h-[72px] ${!hasSubItems ? 'cursor-pointer' : ''}`}
        onClick={handleToggle}
      >
        {/* Checkbox */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {particles.map(p => <Particle key={p.id} {...p} />)}
          <motion.div
            animate={isDone
              ? { scale: [1, 1.35, 1], backgroundColor: stationColor, borderColor: stationColor }
              : { backgroundColor: 'transparent', borderColor: '#475569' }
            }
            transition={{ duration: 0.35, ease: 'backOut' }}
            className="w-8 h-8 rounded-2xl border-2 flex items-center justify-center mt-0.5"
            style={{ boxShadow: isDone ? `0 0 16px ${stationColor}90` : 'none' }}
          >
            <AnimatePresence>
              {isDone && (
                <motion.svg
                  key="check"
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 18, delay: 0.05 }}
                  width="14" height="14" viewBox="0 0 14 14" fill="none"
                >
                  <motion.path
                    d="M2 7l4 4 6-6"
                    stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ duration: 0.28, delay: 0.06 }}
                  />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <motion.div
            animate={{ color: isDone ? 'rgba(255,255,255,0.62)' : '#ffffff' }}
            className="font-bold text-base leading-snug"
          >
            {task.task}
          </motion.div>
          {task.details && (
            <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.62)' }}>{task.details}</div>
          )}
          {task.estimatedTime && (
            <div className="text-sm mt-1 inline-flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)' }}><Clock size={13} strokeWidth={2} aria-hidden="true" />{task.estimatedTime}</div>
          )}
        </div>

        {/* "הושלם" badge — fixed-width slot so appearance never shifts text */}
        <div className="flex-shrink-0 flex items-center justify-end" style={{ width: 52 }}>
          <AnimatePresence>
            {isDone && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 450, damping: 22, delay: 0.15 }}
                className="text-sm font-bold px-2.5 py-1 rounded-xl"
                style={{ background: stationColor + '18', color: stationColor, border: `1px solid ${stationColor}35` }}
              >
                הושלם
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sub-items */}
      {hasSubItems && (
        <div className="mx-5 mb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="grid grid-cols-2 gap-2">
            {task.subItems.map(sub => {
              const subDone = completedSubs.has(sub.id);
              return (
                <SubItem
                  key={sub.id}
                  sub={sub}
                  subDone={subDone}
                  stationColor={stationColor}
                  onToggle={() => handleToggleSub(sub.id, subDone)}
                />
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
})

/* ─── Sub-item ─── */
function SubItem({ sub, subDone, stationColor, onToggle }) {
  const [particles, setParticles] = useState([]);

  function handleClick() {
    onToggle();
    if (!subDone) {
      const ps = spawnParticles(stationColor);
      setParticles(ps);
      setTimeout(() => setParticles([]), 700);
    }
  }

  return (
    <motion.div
      onClick={handleClick}
      animate={subDone ? { scale: [1, 1.04, 0.98, 1] } : { scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-2.5 cursor-pointer select-none rounded-2xl px-3 py-2.5"
      style={{
        background: subDone ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
        border: subDone ? `1px solid ${stationColor}25` : '1px solid transparent',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {particles.map(p => <Particle key={p.id} {...p} />)}
        <motion.div
          animate={subDone
            ? { scale: [1, 1.3, 1], backgroundColor: stationColor, borderColor: stationColor }
            : { backgroundColor: 'transparent', borderColor: '#475569' }
          }
          transition={{ duration: 0.3, ease: 'backOut' }}
          className="w-6 h-6 rounded-xl border-2 flex items-center justify-center"
          style={{ boxShadow: subDone ? `0 0 10px ${stationColor}70` : 'none' }}
        >
          <AnimatePresence>
            {subDone && (
              <motion.svg
                key="sc"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                width="11" height="11" viewBox="0 0 14 14" fill="none"
              >
                <motion.path
                  d="M2 7l4 4 6-6" stroke="white" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.22 }}
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <motion.span
        animate={{ color: subDone ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.85)' }}
        className="flex-1 font-medium text-sm"
      >
        {sub.label}
      </motion.span>

      <AnimatePresence>
        {subDone && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="text-sm font-bold flex-shrink-0"
            style={{ color: stationColor }}
          >
            הושלם
          </motion.span>
        )}
      </AnimatePresence>

      {sub.unit && !subDone && (
        <span
          className="text-sm px-2 py-0.5 rounded-lg font-medium flex-shrink-0"
          style={{ background: stationColor + '18', color: stationColor }}
        >
          {sub.unit}
        </span>
      )}
    </motion.div>
  );
}
