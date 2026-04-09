import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STATIONS } from '../data/stations';
import { PREP_TASKS } from '../data/prepTasks';
import { useFirestoreSet } from '../hooks/useFirestoreSet';

const SHIFTS = ['הכנות בוקר', 'הכנות צהריים'];
const SHIFT_KEYS  = { 'הכנות בוקר': 'בוקר', 'הכנות צהריים': 'צהריים' };
const SHIFT_ICONS = { 'הכנות בוקר': null, 'הכנות צהריים': '☀️' };

/* ─── Particle for celebration burst ─── */
function Particle({ angle, speed, color, size }) {
  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
        opacity: 0,
        scale: 0,
      }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        top: '50%', right: 0,
        width: size, height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 5px ${color}`,
        pointerEvents: 'none',
        zIndex: 30,
        transform: 'translateY(-50%)',
      }}
    />
  );
}

const PARTICLE_COLORS = (stationColor) => [stationColor, stationColor + 'bb', '#ffffff', '#ffffff99'];

function spawnParticles(color) {
  return Array.from({ length: 14 }, (_, i) => ({
    id: i + Date.now(),
    angle: (i / 14) * Math.PI * 2,
    speed: 30 + Math.random() * 40,
    color: PARTICLE_COLORS(color)[Math.floor(Math.random() * 4)],
    size: 4 + Math.random() * 4,
  }));
}

export default function PrepChecklist({ station, completedTasks, onToggle, onReset }) {
  const [completedSubs, setCompletedSubs] = useFirestoreSet(`prep_subs_${station}`);

  const st = STATIONS[station];
  const tasks = PREP_TASKS[station] || [];

  const allIds = tasks.flatMap(t => t.subItems ? t.subItems.map(s => s.id) : [t.id]);
  const doneCount = allIds.filter(id => completedTasks.has(id) || completedSubs.has(id)).length;
  const pct = allIds.length > 0 ? Math.round((doneCount / allIds.length) * 100) : 0;

  const parentDone = tasks.filter(t =>
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

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-xl mx-auto" dir="rtl">

      {/* ── Header ── */}
      <div className="space-y-2">
        {/* Reset button — top-left, above progress card */}
        <div className="flex justify-end">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold"
            style={{ border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.38)', background: 'transparent' }}
          >
            🗑 איפוס יום
          </button>
        </div>

        {/* Progress % — full width, main focal point */}
        <div
          className="w-full py-5 rounded-2xl text-center"
          style={{
            background: st.color + '18',
            border: `1px solid ${st.color}35`,
            boxShadow: `0 0 24px ${st.color}28`,
          }}
        >
          <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>התקדמות</div>
          <div className="text-5xl font-black leading-none" style={{ color: st.color }}>{pct}%</div>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="rounded-3xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex justify-between items-end mb-3">
          <div>
            <span className="text-white font-bold text-lg">{parentDone}</span>
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}> / {tasks.length} משימות הושלמו</span>
          </div>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{doneCount} / {allIds.length} סה״כ</span>
        </div>
        <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="absolute inset-y-0 right-0 rounded-full"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              background: `linear-gradient(90deg, ${st.color}cc, ${st.color})`,
              boxShadow: `0 0 10px ${st.color}80`,
            }}
          />
        </div>
      </div>

      {/* ── Shift sections ── */}
      {SHIFTS.map(shiftLabel => {
        const shiftKey = SHIFT_KEYS[shiftLabel];
        const shiftTasks = tasks.filter(t => t.shift === shiftKey);
        if (shiftTasks.length === 0) return null;

        const shiftAllIds = shiftTasks.flatMap(t => t.subItems ? t.subItems.map(s => s.id) : [t.id]);
        const shiftDone = shiftAllIds.filter(id => completedTasks.has(id) || completedSubs.has(id)).length;
        const shiftPct = shiftAllIds.length > 0 ? Math.round((shiftDone / shiftAllIds.length) * 100) : 0;

        return (
          <section key={shiftLabel}>
            <div className="flex items-center gap-3 mb-3">
              {SHIFT_ICONS[shiftLabel] && <span className="text-2xl">{SHIFT_ICONS[shiftLabel]}</span>}
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
                <TaskCard
                  key={task.id}
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
            <div className="text-4xl mb-3">🎉</div>
            <div className="text-white font-black text-xl" style={{ color: '#34d399' }}>כל המשימות הושלמו!</div>
            <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>עבודה מעולה — הפריפ היומי הושלם.</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════
   TaskCard — with Digital Celebration
════════════════════════════════════════════ */
function TaskCard({ task, isDone, completedSubs, stationColor, onToggle, onToggleSub }) {
  const hasSubItems = !!task.subItems;
  const [particles, setParticles] = useState([]);

  function handleToggle() {
    if (hasSubItems) return;
    onToggle();
    // spawn particles only when marking as done
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
      animate={isDone
        ? { scale: [1, 1.025, 0.99, 1] }
        : { scale: 1 }
      }
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      className="rounded-3xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: isDone ? `1px solid ${stationColor}30` : '1px solid var(--border)',
        opacity: isDone ? 0.75 : 1,
        transition: 'opacity 0.4s ease, border-color 0.4s ease',
      }}
    >
      {/* Category label */}
      <div className="flex items-center gap-2 px-5 pt-3 pb-1">
        <span className="text-sm">{task.categoryIcon}</span>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: stationColor + 'bb' }}>
          {task.category}
        </span>
      </div>

      {/* Main row */}
      <div
        className={`flex items-start gap-4 px-5 pb-4 pt-1 select-none ${!hasSubItems ? 'cursor-pointer' : ''}`}
        onClick={handleToggle}
      >
        {/* Checkbox with particles */}
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
          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>⏱ {task.estimatedTime}</div>
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
              style={{
                background: stationColor + '18',
                color: stationColor,
                border: `1px solid ${stationColor}35`,
              }}
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

/* ─── Sub-item with its own mini celebration ─── */
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
      animate={subDone
        ? { scale: [1, 1.04, 0.98, 1] }
        : { scale: 1 }
      }
      transition={{ duration: 0.4 }}
      className="flex items-center gap-2.5 cursor-pointer select-none rounded-2xl px-3 py-2.5"
      style={{
        background: subDone ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
        border: subDone ? `1px solid ${stationColor}25` : '1px solid transparent',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* Sub checkbox */}
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
        <span className="text-xs px-2 py-0.5 rounded-lg font-medium flex-shrink-0"
          style={{ background: stationColor + '18', color: stationColor }}>
          {sub.unit}
        </span>
      )}
    </motion.div>
  );
}
