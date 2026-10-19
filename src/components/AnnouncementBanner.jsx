import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFirestoreArray } from '../hooks/useFirestoreArray';
import { LOG_DOCS, nowLabel } from '../data/shifts';
import { CHEFS } from '../data/chefs';
import { UndoToast } from './PrepCelebrations';

const TOAST_MS  = 5000;
const MAX_SHOWN = 2;
const TEAM = CHEFS.filter(c => c.role === 'chef').map(c => c.displayName);

// The author counts as having seen their own announcement
function seenNames(a) {
  const names = [a.author, ...(a.seenBy || []).map(s => s.name)];
  return names.filter((n, i) => n && names.indexOf(n) === i);
}

export default function AnnouncementBanner({ user, onOpen }) {
  const [announcements, setAnnouncements] = useFirestoreArray(LOG_DOCS.announcements);

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const unseen = announcements.filter(a => !a.removed && !seenNames(a).includes(user)).reverse(); // newest first
  const shown  = unseen.slice(0, MAX_SHOWN);
  const extra  = unseen.length - shown.length;

  // Several people tap "ראיתי" at once, so always go through the updater
  function markSeen(a) {
    setAnnouncements(prev => prev.map(x => x.id === a.id && !seenNames(x).includes(user)
      ? { ...x, seenBy: [...(x.seenBy || []), { name: user, time: nowLabel() }] }
      : x));
    clearTimeout(toastTimer.current);
    setToast({
      id: Date.now(),
      text: 'סומן כנקרא',
      undoable: true,
      undo: () => setAnnouncements(prev => prev.map(x => x.id === a.id
        ? { ...x, seenBy: (x.seenBy || []).filter(s => s.name !== user) }
        : x)),
    });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  function handleUndo() {
    toast?.undo?.();
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  return (
    <>
      {shown.length > 0 && (
        <div className="space-y-3" dir="rtl">
          <AnimatePresence initial={false}>
            {shown.map(a => {
              const seen    = seenNames(a);
              const notSeen = TEAM.filter(n => !seen.includes(n));
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-xl px-5 py-4 space-y-3"
                  style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}
                >
                  <div className="text-sm font-medium text-text-secondary">
                    הודעה לצוות · {a.author} · <span className="tabular-nums">{a.time}</span>
                  </div>
                  <p className="text-lg text-text-primary leading-relaxed whitespace-pre-wrap">{a.text}</p>
                  <div className="text-sm text-text-secondary">
                    ראו: {seen.join(', ')}
                    {notSeen.length > 0 && <span className="text-text-tertiary"> · עוד לא: {notSeen.join(', ')}</span>}
                  </div>
                  <button
                    onClick={() => markSeen(a)}
                    className="w-full min-h-[56px] rounded-xl text-lg font-medium text-text-primary transition-colors duration-150"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    ראיתי
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {extra > 0 && (
            <button
              onClick={onOpen}
              className="w-full min-h-[48px] text-base text-text-secondary"
            >
              ועוד {extra} הודעות
            </button>
          )}
        </div>
      )}
      <UndoToast toast={toast} onUndo={handleUndo} />
    </>
  );
}
