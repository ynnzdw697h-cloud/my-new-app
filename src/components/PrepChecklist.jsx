import { useState } from 'react';
import { Sun, Trash2, Sparkles, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { STATIONS } from '../data/stations';
import { PREP_TASKS } from '../data/prepTasks';
import { useFirestoreSet } from '../hooks/useFirestoreSet';
import { useFirestoreArray } from '../hooks/useFirestoreArray';

const SHIFTS     = ['הכנות בוקר', 'הכנות צהריים'];
const SHIFT_KEYS = { 'הכנות בוקר': 'בוקר', 'הכנות צהריים': 'צהריים' };
const SHIFT_HAS_ICON = { 'הכנות בוקר': false, 'הכנות צהריים': true };

/* ─── Liquid Progress Card ─── */
function LiquidProgressCard({ pct, color }) {
  // Ensure a minimum visible fill when not empty, so the wave always anchors properly
  const fillPct = pct === 0 ? 0 : Math.max(pct, 5);

  return (
    <div
      className="w-full rounded-2xl overflow-hidden relative"
      style={{
        height: 140,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${color}35`,
        boxShadow: `inset 0 0 40px rgba(0,0,0,0.3), 0 0 28px ${color}18`,
      }}
    >
      {/* Background glow from bottom */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 115%, ${color}22, transparent 65%)`,
      }} />

      {/* Rising liquid */}
      <motion.div
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        animate={{ height: `${fillPct}%` }}
        transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Wave surface — two overlapping waves at different speeds */}
        {pct > 0 && (
          <div style={{ position: 'absolute', top: -13, left: 0, right: 0, height: 14 }}>
            {/* Primary wave */}
            <motion.div
              style={{ position: 'absolute', top: 0, left: 0, width: '200%', height: '100%' }}
              animate={{ x: '-50%' }}
              transition={{ duration: 3.2, ease: 'linear', repeat: Infinity }}
            >
              <svg viewBox="0 0 800 14" width="100%" height="14" preserveAspectRatio="none">
                <path
                  d="M0,7 C33,0 67,14 100,7 C133,0 167,14 200,7 C233,0 267,14 300,7 C333,0 367,14 400,7 C433,0 467,14 500,7 C533,0 567,14 600,7 C633,0 667,14 700,7 C733,0 767,14 800,7 L800,14 L0,14 Z"
                  fill={color + '75'}
                />
              </svg>
            </motion.div>
            {/* Secondary wave — offset phase, faster */}
            <motion.div
              style={{ position: 'absolute', top: 2, left: '-25%', width: '200%', height: '100%', opacity: 0.55 }}
              animate={{ x: '-50%' }}
              transition={{ duration: 2.1, ease: 'linear', repeat: Infinity }}
            >
              <svg viewBox="0 0 800 14" width="100%" height="14" preserveAspectRatio="none">
                <path
                  d="M0,7 C33,0 67,14 100,7 C133,0 167,14 200,7 C233,0 267,14 300,7 C333,0 367,14 400,7 C433,0 467,14 500,7 C533,0 567,14 600,7 C633,0 667,14 700,7 C733,0 767,14 800,7 L800,14 L0,14 Z"
                  fill={color + '50'}
                />
              </svg>
            </motion.div>
          </div>
        )}

        {/* Liquid body */}
        <div style={{
          position: 'absolute',
          top: pct > 0 ? 1 : 0,
          bottom: 0, left: 0, right: 0,
          background: `linear-gradient(to top, ${color}65 0%, ${color}45 60%, ${color}25 100%)`,
        }} />
      </motion.div>

      {/* Text overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 10,
      }}>
        <div className="text-xs font-semibold mb-1" style={{
          color: pct > 55 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)',
          textShadow: '0 1px 4px rgba(0,0,0,0.7)',
          transition: 'color 0.5s ease',
        }}>
          התקדמות
        </div>
        <motion.div
          animate={{ color: pct > 55 ? '#ffffff' : color }}
          transition={{ duration: 0.5 }}
          className="text-5xl font-black leading-none tabular-nums"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.55)' }}
        >
          {pct}%
        </motion.div>
      </div>
    </div>
  );
}

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

/* ─── SwipeableRow: drag right (RTL) to reveal left delete button ─── */
function SwipeableRow({ rowId, swipedId, setSwipedId, onDeleteRequest, children }) {
  return (
    <div className="relative rounded-3xl overflow-hidden">
      {/* Delete button — revealed on the left */}
      <div
        className="absolute inset-y-0 left-0 flex items-center justify-center bg-red-600 rounded-3xl"
        style={{ width: 80, zIndex: 0 }}
      >
        <button
          onClick={onDeleteRequest}
          className="w-full h-full flex items-center justify-center text-white font-bold text-2xl"
        >
          ✕
        </button>
      </div>

      {/* Draggable foreground */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 80 }}
        dragElastic={0.05}
        animate={{ x: swipedId === rowId ? 80 : 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 40) setSwipedId(rowId);
          else setSwipedId(null);
        }}
        onClick={() => { if (swipedId === rowId) setSwipedId(null); }}
        style={{ touchAction: 'pan-y', position: 'relative', zIndex: 1 }}
      >
        {children}
      </motion.div>
    </div>
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
          <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>משמרת</p>
          <div className="flex gap-2">
            {['בוקר', 'צהריים'].map(s => (
              <button
                key={s}
                onClick={() => setShift(s)}
                className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all"
                style={{
                  background: shift === s ? stationColor + '22' : 'rgba(255,255,255,0.05)',
                  border: shift === s ? `1px solid ${stationColor}55` : '1px solid rgba(255,255,255,0.08)',
                  color: shift === s ? stationColor : 'rgba(255,255,255,0.45)',
                }}
              >
                {s === 'בוקר' ? 'הכנות בוקר' : 'הכנות צהריים'}
              </button>
            ))}
          </div>
        </div>

        {/* Task name */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>שם ההכנה *</p>
          <input
            autoFocus
            type="text"
            value={taskName}
            onChange={e => setTaskName(e.target.value)}
            placeholder="לדוגמה: סלט קצוץ"
            className="w-full px-4 py-3 rounded-2xl text-white text-sm focus:outline-none"
            style={{ ...inputStyle, '::placeholder': { color: 'rgba(255,255,255,0.25)' } }}
          />
        </div>

        {/* Qty + unit */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>כמות ויחידות</p>
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
          <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>הערות</p>
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
          <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>תת-הכנות — צ׳קליסט (אופציונלי)</p>
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
                    style={{ color: 'rgba(255,255,255,0.3)' }}
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
export default function PrepChecklist({ station, completedTasks, onToggle, onReset }) {
  const [completedSubs, setCompletedSubs] = useFirestoreSet(`prep_subs_${station}`);
  const [customTasks, setCustomTasks]     = useFirestoreArray(`custom_prep_${station}`);
  const [hiddenIds, setHiddenIds]         = useFirestoreSet(`hidden_prep_${station}`);

  const [showAdd, setShowAdd]             = useState(false);
  const [swipedId, setSwipedId]           = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // task object

  const st = STATIONS[station];

  // Merge static (minus hidden) + custom tasks
  const staticTasks = (PREP_TASKS[station] || []).filter(t => !hiddenIds.has(t.id));
  const allTasks    = [...staticTasks, ...customTasks];

  const allIds   = allTasks.flatMap(t => t.subItems ? t.subItems.map(s => s.id) : [t.id]);
  const doneCount = allIds.filter(id => completedTasks.has(id) || completedSubs.has(id)).length;
  const pct      = allIds.length > 0 ? Math.round((doneCount / allIds.length) * 100) : 0;

  const parentDone = allTasks.filter(t =>
    t.subItems ? t.subItems.every(s => completedSubs.has(s.id)) : completedTasks.has(t.id)
  ).length;

  function toggleSub(id) {
    setCompletedSubs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleReset() {
    setCompletedSubs(new Set());
    onReset();
  }

  function requestDelete(task) {
    setSwipedId(null);
    setConfirmDelete(task);
  }

  function executeDelete() {
    if (!confirmDelete) return;
    if (confirmDelete.isCustom) {
      setCustomTasks(prev => prev.filter(t => t.id !== confirmDelete.id));
    } else {
      setHiddenIds(prev => { const next = new Set(prev); next.add(confirmDelete.id); return next; });
    }
    setConfirmDelete(null);
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-xl mx-auto" dir="rtl">

      {/* ── Header ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold"
            style={{ border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.38)', background: 'transparent' }}
          >
            + הוסף הכנה
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold"
            style={{ border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.38)', background: 'transparent' }}
          >
            <Trash2 size={13} strokeWidth={1.5} />
            איפוס יום
          </button>
        </div>
        <LiquidProgressCard pct={pct} color={st.color} />
      </div>

      {/* ── Progress bar card ── */}
      <div className="rounded-3xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex justify-between items-end mb-3">
          <div>
            <span className="text-white font-bold text-lg">{parentDone}</span>
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}> / {allTasks.length} משימות הושלמו</span>
          </div>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{doneCount} / {allIds.length} סה״כ</span>
        </div>
        <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="absolute inset-y-0 right-0 rounded-full"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ background: `linear-gradient(90deg, ${st.color}cc, ${st.color})`, boxShadow: `0 0 10px ${st.color}80` }}
          />
        </div>
      </div>

      {/* ── Shift sections ── */}
      {SHIFTS.map(shiftLabel => {
        const shiftKey   = SHIFT_KEYS[shiftLabel];
        const shiftTasks = allTasks.filter(t => t.shift === shiftKey);
        if (shiftTasks.length === 0) return null;

        const shiftAllIds = shiftTasks.flatMap(t => t.subItems ? t.subItems.map(s => s.id) : [t.id]);
        const shiftDone   = shiftAllIds.filter(id => completedTasks.has(id) || completedSubs.has(id)).length;
        const shiftPct    = shiftAllIds.length > 0 ? Math.round((shiftDone / shiftAllIds.length) * 100) : 0;

        return (
          <section key={shiftLabel}>
            <div className="flex items-center gap-3 mb-3">
              {SHIFT_HAS_ICON[shiftLabel] && <Sun size={20} style={{ color: '#F59E0B' }} strokeWidth={1.5} />}
              <div>
                <h3 className="text-white font-black text-xl">{shiftLabel}</h3>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {shiftDone}/{shiftAllIds.length} פריטים · {shiftPct}%
                </span>
              </div>
              <AnimatePresence>
                {shiftPct === 100 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.7, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="mr-auto text-xs font-bold px-3 py-1 rounded-xl"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}
                  >
                    ✓ הושלם
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="h-1 rounded-full overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${shiftPct}%` }}
                transition={{ duration: 0.5 }}
                style={{ backgroundColor: st.color }}
              />
            </div>

            <div className="space-y-3">
              {shiftTasks.map(task => (
                <SwipeableRow
                  key={task.id}
                  rowId={task.id}
                  swipedId={swipedId}
                  setSwipedId={setSwipedId}
                  onDeleteRequest={() => requestDelete(task)}
                >
                  <TaskCard
                    task={task}
                    isDone={task.subItems
                      ? task.subItems.every(s => completedSubs.has(s.id))
                      : completedTasks.has(task.id)
                    }
                    completedSubs={completedSubs}
                    stationColor={st.color}
                    onToggle={() => !task.subItems && onToggle(task.id)}
                    onToggleSub={toggleSub}
                  />
                </SwipeableRow>
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
            <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>עבודה מעולה — הפריפ היומי הושלם.</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation dialog ── */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
              onClick={() => setConfirmDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="fixed z-50 inset-x-5 rounded-3xl p-6 space-y-4"
              style={{ top: '50%', transform: 'translateY(-50%)', background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)' }}
              dir="rtl"
            >
              <p className="text-white font-bold text-base text-center">
                האם אתה בטוח שברצונך למחוק הכנה זו?
              </p>
              <p className="text-center text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {confirmDelete.task}
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={executeDelete}
                  className="flex-1 py-3 rounded-2xl font-bold text-sm transition-colors"
                  style={{ background: '#dc2626', color: '#fff' }}
                >
                  כן, מחק
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 rounded-2xl text-sm transition-colors"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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


    </div>
  );
}

/* ════════════════════════════════════════════
   TaskCard — with celebration burst
════════════════════════════════════════════ */
function TaskCard({ task, isDone, completedSubs, stationColor, onToggle, onToggleSub }) {
  const hasSubItems = !!task.subItems;
  const [particles, setParticles] = useState([]);

  function handleToggle() {
    if (hasSubItems) return;
    onToggle();
    if (!isDone) {
      const ps = spawnParticles(stationColor);
      setParticles(ps);
      setTimeout(() => setParticles([]), 700);
    }
  }

  function handleToggleSub(id, wasDone) {
    onToggleSub(id);
    if (!wasDone) {
      const ps = spawnParticles(stationColor);
      setParticles(ps);
      setTimeout(() => setParticles([]), 700);
    }
  }

  return (
    <motion.div
      animate={isDone ? { scale: [1, 1.025, 0.99, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      className="rounded-3xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: isDone ? `1px solid ${stationColor}30` : '1px solid var(--border)',
        transition: 'border-color 0.4s ease',
      }}
    >
      {/* Category label */}
      <div className="flex items-center gap-2 px-5 pt-3 pb-1">
        <Tag size={12} style={{ color: stationColor + 'bb' }} strokeWidth={1.5} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: stationColor + 'bb' }}>
          {task.category}
        </span>
      </div>

      {/* Main row */}
      <div
        className={`flex items-start gap-4 px-5 pb-4 pt-1 select-none ${!hasSubItems ? 'cursor-pointer' : ''}`}
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
            animate={{ color: isDone ? 'rgba(255,255,255,0.35)' : '#ffffff' }}
            className="font-bold text-base leading-snug"
          >
            {task.task}
          </motion.div>
          {task.details && (
            <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{task.details}</div>
          )}
          {task.estimatedTime && (
            <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>⏱ {task.estimatedTime}</div>
          )}
        </div>

        {/* "הושלם" badge */}
        <AnimatePresence>
          {isDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6, x: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: 'spring', stiffness: 450, damping: 22, delay: 0.15 }}
              className="text-xs font-bold px-2.5 py-1 rounded-xl flex-shrink-0"
              style={{ background: stationColor + '18', color: stationColor, border: `1px solid ${stationColor}35` }}
            >
              הושלם
            </motion.div>
          )}
        </AnimatePresence>
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
}

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
        animate={{ color: subDone ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.85)' }}
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
            className="text-xs font-bold flex-shrink-0"
            style={{ color: stationColor }}
          >
            הושלם
          </motion.span>
        )}
      </AnimatePresence>

      {sub.unit && !subDone && (
        <span
          className="text-xs px-2 py-0.5 rounded-lg font-medium flex-shrink-0"
          style={{ background: stationColor + '18', color: stationColor }}
        >
          {sub.unit}
        </span>
      )}
    </motion.div>
  );
}
