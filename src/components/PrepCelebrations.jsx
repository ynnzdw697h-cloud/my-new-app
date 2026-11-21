import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Flame, Check } from 'lucide-react';

/* ─── Streak badge — consecutive days the station hit 100% ─── */
export function StreakBadge({ count, size = 'md' }) {
  if (!count) return null;
  const small = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-medium tabular-nums flex-shrink-0 text-text-secondary ${small ? 'px-2 py-1 text-sm' : 'px-2.5 py-1 text-base'}`}
      style={{ border: '1px solid var(--border)' }}
      aria-label={`${count} ימים ברצף שהפס הושלם`}
    >
      <Flame size={small ? 14 : 16} strokeWidth={1.5} />
      {count}
    </span>
  );
}

/* ─── Segmented bar: one segment per item, falls back to a solid bar when there are many ─── */
const MAX_SEGMENTS = 30;
export function SegmentedBar({ done, total, color, height = 6 }) {
  if (total <= MAX_SEGMENTS) {
    return (
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{ height, background: i < done ? color : 'rgba(255,255,255,0.10)', transition: 'background-color 0.2s' }}
          />
        ))}
      </div>
    );
  }
  const pct = total ? (done / total) * 100 : 0;
  return (
    <div className="relative rounded-sm overflow-hidden" style={{ height, background: 'rgba(255,255,255,0.10)' }} aria-hidden="true">
      <div className="absolute inset-y-0 right-0" style={{ width: `${pct}%`, background: color, transition: 'width 0.25s' }} />
    </div>
  );
}

/* ─── Compact progress bar that sticks under the header while scrolling ─── */
export function StickyProgress({ done, total, color, streak }) {
  const left = total - done;
  return (
    <div
      className="sticky top-16 md:top-0 z-20 px-4 md:px-6 py-3 space-y-2"
      style={{
        background: 'rgba(18,18,18,0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex items-baseline gap-3">
        <span className="text-xl font-bold text-text-primary">
          {left > 0 ? <>נשארו <span className="tabular-nums">{left}</span></> : 'הכול מוכן'}
        </span>
        <span className="text-base tabular-nums text-text-secondary">{done}/{total}</span>
        <span className="mr-auto"><StreakBadge count={streak} size="sm" /></span>
      </div>
      <SegmentedBar done={done} total={total} color={left === 0 ? '#10B981' : color} />
    </div>
  );
}

/* ─── Status shape: readable without relying on color alone ─── */
export function StatusMark({ status, color, size = 30 }) {
  const ring = { width: size, height: size, borderRadius: '50%', flexShrink: 0, transition: 'background-color 0.15s, border-color 0.15s' };
  if (status === 'done') {
    return (
      <span className="flex items-center justify-center" style={{ ...ring, background: color, border: `2px solid ${color}` }}>
        <Check size={size * 0.55} strokeWidth={2.5} color="#fff" />
      </span>
    );
  }
  if (status === 'progress') {
    return <span style={{ ...ring, border: '2px solid #F59E0B', background: 'linear-gradient(to left, #F59E0B 50%, transparent 50%)' }} />;
  }
  if (status === 'stuck') {
    return <span style={{ ...ring, border: '2px dashed #F87171' }} />;
  }
  return <span style={{ ...ring, border: '2px solid rgba(255,255,255,0.45)' }} />;
}

/* ─── Bottom toast with an Undo button, closes itself after a few seconds ─── */
// `position` lets a screen with its own bottom bar lift the toast above it.
// `duration` must match the caller's close timer (all callers use 5000ms): a thin
// line along the bottom shrinks over that time. A new toast has a new id, so the
// line restarts. No line when the user prefers reduced motion.
export function UndoToast({ toast, onUndo, position = 'bottom-28 md:bottom-8', duration = 5000 }) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={`fixed z-40 inset-x-0 ${position} flex justify-center px-4`}
          dir="rtl"
          role="status"
        >
          <div
            className="relative overflow-hidden w-full max-w-md flex items-center gap-3 rounded-xl pr-5 pl-2 py-1.5"
            style={{ background: '#F4F4F5', color: '#121212' }}
          >
            <span className="flex-1 text-base font-medium">{toast.text}</span>
            {toast.undoable && (
              <button
                onClick={onUndo}
                className="min-h-[48px] px-4 text-base font-bold underline underline-offset-4"
              >
                ביטול
              </button>
            )}
            {toast.undoable && !reduceMotion && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 inset-x-0 h-[3px] origin-right"
                style={{
                  background: 'rgba(18,18,18,0.45)',
                  animation: `undo-countdown ${duration}ms linear forwards`,
                }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
