import { useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Flame, Trophy } from 'lucide-react';

/* ─── Streak badge — consecutive days the station hit 100% ─── */
export function StreakBadge({ count, size = 'md' }) {
  if (!count) return null;
  const small = size === 'sm';
  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className={`inline-flex items-center gap-1 rounded-xl font-black tabular-nums flex-shrink-0 ${small ? 'px-2 py-1 text-sm' : 'px-3 py-1.5 text-base'}`}
      style={{ background: 'rgba(249,115,22,0.15)', color: '#FB923C', border: '1px solid rgba(249,115,22,0.35)' }}
      aria-label={`רצף של ${count} ימים`}
    >
      <Flame size={small ? 15 : 18} strokeWidth={2.2} fill="#FB923C" />
      {count}
    </motion.span>
  );
}

/* ─── Compact progress bar that sticks under the header while scrolling ─── */
export function StickyProgress({ pct, done, total, color, streak }) {
  return (
    <div
      className="sticky top-16 md:top-0 z-20 px-4 md:px-6 py-3"
      style={{
        background: 'rgba(18,18,18,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-3">
        <motion.span
          key={pct}
          initial={{ scale: 1.25 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="text-2xl font-black tabular-nums leading-none"
          style={{ color: pct === 100 ? '#34D399' : color, minWidth: 58 }}
        >
          {pct}%
        </motion.span>
        <div className="flex-1 relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            className="absolute inset-y-0 right-0 rounded-full"
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            style={{
              background: pct === 100 ? '#34D399' : `linear-gradient(270deg, ${color}, ${color}cc)`,
              boxShadow: `0 0 10px ${pct === 100 ? '#34D399' : color}80`,
            }}
          />
        </div>
        <span className="text-sm font-bold tabular-nums text-text-secondary">
          {done}/{total}
        </span>
        <StreakBadge count={streak} size="sm" />
      </div>
    </div>
  );
}

/* ─── Short encouragement pill that pops above the bottom nav ─── */
export function CheerToast({ toast }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 30, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          className="fixed z-40 inset-x-0 bottom-28 md:bottom-8 flex justify-center pointer-events-none px-4"
          dir="rtl"
          role="status"
        >
          <div
            className="rounded-2xl px-5 py-3.5 text-lg font-black text-white text-center"
            style={{
              background: toast.color,
              boxShadow: `0 10px 40px ${toast.color}70`,
            }}
          >
            {toast.text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Full-screen celebration when the station hits 100% ─── */
const CONFETTI_COLORS = ['#FBBF24', '#34D399', '#60A5FA', '#F87171', '#FFFFFF', '#FB923C'];

function Confetti({ color }) {
  const pieces = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    id: i,
    left:   Math.random() * 100,
    delay:  Math.random() * 0.6,
    dur:    2.2 + Math.random() * 1.6,
    rotate: (Math.random() - 0.5) * 720,
    drift:  (Math.random() - 0.5) * 120,
    w:      6 + Math.random() * 6,
    h:      10 + Math.random() * 8,
    color:  i % 4 === 0 ? color : CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  })), [color]);

  return (
    <div className="fixed inset-0 z-[61] pointer-events-none overflow-hidden">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: -40, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', x: p.drift, rotate: p.rotate, opacity: [1, 1, 0.8] }}
          transition={{ duration: p.dur, delay: p.delay, ease: [0.25, 0.4, 0.6, 1] }}
          style={{ position: 'absolute', top: 0, left: `${p.left}%`, width: p.w, height: p.h, background: p.color, borderRadius: 2 }}
        />
      ))}
    </div>
  );
}

export function CelebrationOverlay({ open, onClose, stationName, color, total, finishedAt, streak }) {
  const reduceMotion = useReducedMotion();
  const isRecord = streak.count > 1 && streak.count >= streak.best;

  return (
    <AnimatePresence>
      {open && (
        <>
          {!reduceMotion && <Confetti color={color} />}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)' }}
            onClick={onClose}
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
              className="w-full max-w-sm rounded-3xl p-7 text-center"
              style={{ background: '#1F1F24', border: '1px solid rgba(52,211,153,0.35)', boxShadow: '0 0 60px rgba(52,211,153,0.25)' }}
              onClick={e => e.stopPropagation()}
            >
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.25 }}
                className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center"
                style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.35), rgba(251,191,36,0.05))' }}
              >
                <Trophy size={52} strokeWidth={1.5} style={{ color: '#FBBF24' }} />
              </motion.div>

              <h2 className="text-3xl font-black text-white">הפריפ הושלם!</h2>
              <p className="text-lg font-semibold mt-1" style={{ color: '#34D399' }}>{stationName} מוכן לסרוויס</p>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="rounded-2xl py-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-2xl font-black text-white tabular-nums">{total}</div>
                  <div className="text-sm text-text-secondary">פריטים</div>
                </div>
                <div className="rounded-2xl py-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-2xl font-black text-white tabular-nums">{finishedAt}</div>
                  <div className="text-sm text-text-secondary">שעת סיום</div>
                </div>
              </div>

              {streak.count > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-3 rounded-2xl py-3 flex items-center justify-center gap-2"
                  style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)' }}
                >
                  <Flame size={22} strokeWidth={2} fill="#FB923C" style={{ color: '#FB923C' }} />
                  <span className="text-lg font-black" style={{ color: '#FB923C' }}>
                    {streak.count === 1 ? 'יום ראשון ברצף!' : `${streak.count} ימים ברצף`}
                  </span>
                  {isRecord && (
                    <span className="text-sm font-bold rounded-lg px-2 py-0.5" style={{ background: '#FB923C', color: '#1F1F24' }}>
                      שיא!
                    </span>
                  )}
                </motion.div>
              )}

              <button
                onClick={onClose}
                className="w-full mt-6 py-4 rounded-2xl font-black text-lg text-white active:scale-95 transition-transform"
                style={{ background: '#10B981', boxShadow: '0 0 24px rgba(16,185,129,0.45)' }}
              >
                יאללה, לסרוויס!
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
