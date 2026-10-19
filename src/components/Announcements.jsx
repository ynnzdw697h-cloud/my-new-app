import { useState, useRef, useEffect } from 'react';
import { Megaphone, X } from 'lucide-react';
import { useFirestoreArray } from '../hooks/useFirestoreArray';
import { LOG_DOCS, nowLabel } from '../data/shifts';
import { getServiceDay } from '../hooks/usePrepState';
import { CHEFS } from '../data/chefs';
import { Card, Button, EmptyState } from './ui';
import { UndoToast } from './PrepCelebrations';

const TOAST_MS = 5000;
const TEAM = CHEFS.filter(c => c.role === 'chef').map(c => c.displayName);

// "2026-10-18" → "18/10"
function shortDate(day) {
  const [, m, d] = day.split('-');
  return `${Number(d)}/${Number(m)}`;
}

// The author counts as having seen their own announcement
function seenNames(a) {
  const names = [a.author, ...(a.seenBy || []).map(s => s.name)];
  return names.filter((n, i) => n && names.indexOf(n) === i);
}

export default function Announcements({ user }) {
  const [announcements, setAnnouncements] = useFirestoreArray(LOG_DOCS.announcements);

  const [input, setInput] = useState('');
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const today  = getServiceDay();
  const active = announcements.filter(a => !a.removed).reverse(); // newest first

  function addAnnouncement() {
    const text = input.trim();
    if (!text) return;
    setAnnouncements(prev => [...prev, { id: Date.now(), text, author: user, time: nowLabel(), day: getServiceDay(), seenBy: [] }]);
    setInput('');
  }

  // Several people tap "ראיתי" at once, so always go through the updater
  function markSeen(a) {
    setAnnouncements(prev => prev.map(x => x.id === a.id && !seenNames(x).includes(user)
      ? { ...x, seenBy: [...(x.seenBy || []), { name: user, time: nowLabel() }] }
      : x));
  }

  // Remove right away; Undo brings it back
  function removeAnnouncement(a) {
    setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, removed: true } : x));
    clearTimeout(toastTimer.current);
    setToast({
      id: Date.now(),
      text: 'ההודעה הוסרה',
      undoable: true,
      undo: () => setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, removed: false } : x)),
    });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  function handleUndo() {
    toast?.undo?.();
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  return (
    <div className="p-5 md:p-6 space-y-5 max-w-2xl mx-auto" dir="rtl">

      {/* ══ Compose ══ */}
      <Card padded={false}>
        <div className="px-5 py-4 flex items-center gap-2.5"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <Megaphone size={18} strokeWidth={1.5} className="text-text-secondary" />
          <h3 className="text-h3 text-text-primary">הודעה לצוות</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.ctrlKey && addAnnouncement()}
            placeholder="מה כולם צריכים לדעת"
            aria-label="הודעה לצוות"
            rows={3}
            className="w-full px-4 py-3 rounded-2xl resize-none text-lg text-text-primary
                       placeholder:text-text-tertiary outline-none transition-colors duration-150"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}
            onFocus={e => e.target.style.borderColor = '#3B82F6'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <Button variant="secondary" fullWidth onClick={addAnnouncement} disabled={!input.trim()}>
            שלח לכולם
          </Button>
        </div>
      </Card>

      {/* ══ Active announcements, newest first ══ */}
      {active.length === 0 ? (
        <EmptyState icon={Megaphone} compact title="אין הודעות פעילות" />
      ) : (
        <div className="space-y-3">
          {active.map(a => {
            const seen    = seenNames(a);
            const notSeen = TEAM.filter(n => !seen.includes(n));
            return (
              <div
                key={a.id}
                className="rounded-xl px-5 py-4 flex items-start gap-3 min-h-[64px]"
                style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="text-base text-text-secondary">
                    <span className="text-text-primary font-semibold">{a.author}</span>
                    <span className="tabular-nums"> · {a.time}</span>
                    {a.day && a.day !== today && <span className="tabular-nums"> · {shortDate(a.day)}</span>}
                  </div>
                  <p className="text-lg text-text-primary leading-relaxed whitespace-pre-wrap">{a.text}</p>
                  <div className="text-sm text-text-secondary">
                    <div>ראו: {seen.join(', ')}</div>
                    {notSeen.length > 0 && <div className="text-text-tertiary">עוד לא: {notSeen.join(', ')}</div>}
                  </div>
                  {!seen.includes(user) && (
                    <button
                      onClick={() => markSeen(a)}
                      className="min-h-[48px] px-5 rounded-xl text-base font-medium text-text-primary transition-colors duration-150"
                      style={{ border: '1px solid var(--border)' }}
                    >
                      ראיתי
                    </button>
                  )}
                </div>
                <button
                  onClick={() => removeAnnouncement(a)}
                  aria-label="הסר הודעה"
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-150 active:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)' }}
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <UndoToast toast={toast} onUndo={handleUndo} />
    </div>
  );
}
