import { useEffect, useMemo, useState } from 'react';
import { Check, CalendarX } from 'lucide-react';
import { Button, EmptyState, SkeletonList } from '../ui';
import { useFirestoreDoc } from '../../hooks/useFirestoreDoc';
import { useChefId } from '../../hooks/useChefId';
import {
  SCHEDULE_SHIFTS, SCHEDULE_CHEFS, DAY_NAMES, AVAIL, AVAIL_LABELS, PUBLIC_DOCS,
  shiftKey, weekDays, weekLabel, shortDate, submissionWeek, deadlineDate, deadlineLabel, iso,
} from '../../data/schedule';
import { Stepper } from './parts';

const DEFAULT_SETTINGS = { deadline: { day: 4, hour: 12 } };
const EMPTY = { shifts: {}, wanted: 0, note: '' };

// Tap cycles: לא יכול → יכול → מעדיף → לא יכול
const next = v => (Number(v || 0) + 1) % 3;

const LOOK = {
  [AVAIL.NO]:     { background: 'var(--bg-inset)',          border: '1px solid var(--border)',              color: 'var(--text-dis)' },
  [AVAIL.CAN]:    { background: 'rgba(16,185,129,0.08)',    border: '1.5px solid rgba(16,185,129,0.45)',    color: '#7fd3a3' },
  [AVAIL.PREFER]: { background: '#10B981',                  border: '1.5px solid #10B981',                  color: '#0b2a1e' },
};

// הגשת משמרות — each cook marks the shifts they can work next week.
export default function ShiftSubmit({ user }) {
  const chefId = useChefId(user);
  const [settings, , settingsState] = useFirestoreDoc(PUBLIC_DOCS.settings, DEFAULT_SETTINGS);
  const deadline = settings?.deadline || DEFAULT_SETTINGS.deadline;
  const week = useMemo(() => submissionWeek(new Date(), deadline), [deadline]);

  if (chefId === undefined || !settingsState.loaded) return <Wrap><SkeletonList /></Wrap>;
  if (!chefId || !SCHEDULE_CHEFS.some(c => c.id === chefId)) {
    return <Wrap><EmptyState icon={CalendarX} title="אין לך הגשת משמרות" description="המשתמש שלך לא מופיע בסידור העבודה." /></Wrap>;
  }
  return <Wrap><SubmitForm key={`${week}_${chefId}`} chefId={chefId} user={user} week={week} deadline={deadline} /></Wrap>;
}

function Wrap({ children }) {
  return <div className="p-5 md:p-6 space-y-4 max-w-xl mx-auto" dir="rtl">{children}</div>;
}

function SubmitForm({ chefId, user, week, deadline }) {
  const [saved, setSaved, state] = useFirestoreDoc(PUBLIC_DOCS.availability(week, chefId), null);
  const [draft, setDraft] = useState(null);
  const [sending, setSending] = useState(false);

  // Start from what was sent before (once it has loaded)
  useEffect(() => {
    if (state.loaded && draft === null) setDraft(saved ? { ...EMPTY, ...saved } : EMPTY);
  }, [state.loaded, saved, draft]);

  if (!state.loaded || draft === null) return <SkeletonList />;

  const days = weekDays(week);
  const count = Object.values(draft.shifts).filter(v => v > 0).length;
  const dirty = !saved
    || JSON.stringify(saved.shifts || {}) !== JSON.stringify(draft.shifts)
    || Number(saved.wanted || 0) !== Number(draft.wanted || 0)
    || (saved.note || '') !== (draft.note || '');

  const tap = key => setDraft(d => ({ ...d, shifts: { ...d.shifts, [key]: next(d.shifts[key]) } }));
  const setAll = v => setDraft(d => {
    const shifts = {};
    days.forEach((_, i) => SCHEDULE_SHIFTS.forEach(sh => { if (v) shifts[shiftKey(i, sh.id)] = v; }));
    return { ...d, shifts };
  });

  async function send() {
    setSending(true);
    const clean = Object.fromEntries(Object.entries(draft.shifts).filter(([, v]) => v > 0));
    await setSaved({ chefId, name: user, week, shifts: clean, wanted: Number(draft.wanted || 0), note: (draft.note || '').trim(), submittedAt: new Date().toISOString() });
    setDraft(d => ({ ...d, shifts: clean, note: (d.note || '').trim() }));
    setSending(false);
  }

  const sentAt = saved?.submittedAt ? new Date(saved.submittedAt) : null;

  return (
    <>
      <div className="rounded-xl px-5 py-4 space-y-2" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-h3 text-text-primary">שבוע <span className="tabular-nums" dir="ltr">{weekLabel(week)}</span></span>
          {sentAt
            ? <span className="flex items-center gap-1.5 text-base font-medium" style={{ color: '#5ee3a8' }}><Check size={18} strokeWidth={2} />נשלח</span>
            : <span className="text-base font-medium" style={{ color: '#F59E0B' }}>עוד לא נשלח</span>}
        </div>
        <p className="text-base text-text-secondary">
          אפשר לשלוח ולעדכן עד יום {deadlineLabel(deadline)} ({shortDate(iso(deadlineDate(week, deadline)))}).
        </p>
        <p className="text-base text-text-secondary">לחיצה על משמרת מחליפה: לא יכול ← יכול ← מעדיף.</p>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => setAll(AVAIL.CAN)}>יכול בהכל</Button>
        <Button variant="ghost" size="sm" className="flex-1" onClick={() => setAll(0)}>ניקוי</Button>
      </div>

      <div className="space-y-2">
        {days.map((isoDay, d) => (
          <div key={isoDay} className="grid items-center gap-2" style={{ gridTemplateColumns: '76px 1fr 1fr' }}>
            <div>
              <div className="text-lg font-medium text-text-primary">{DAY_NAMES[d]}</div>
              <div className="text-sm text-text-tertiary tabular-nums">{shortDate(isoDay)}</div>
            </div>
            {SCHEDULE_SHIFTS.map(sh => {
              const key = shiftKey(d, sh.id);
              const v = Number(draft.shifts[key] || 0);
              return (
                <button
                  key={sh.id}
                  type="button"
                  onClick={() => tap(key)}
                  aria-label={`יום ${DAY_NAMES[d]}, ${sh.name}: ${AVAIL_LABELS[v]}`}
                  className="min-h-[64px] rounded-xl flex flex-col items-center justify-center transition-colors duration-150 active:opacity-80"
                  style={LOOK[v]}
                >
                  <span className="text-base" style={{ opacity: v ? 0.8 : 1, color: v ? 'inherit' : 'var(--text-2)' }}>{sh.short}</span>
                  <span className={`text-lg ${v === AVAIL.PREFER ? 'font-bold' : 'font-medium'}`}>{AVAIL_LABELS[v]}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="rounded-xl px-5 py-4 space-y-4" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
        <div className="space-y-2">
          <div className="text-label text-text-secondary">כמה משמרות אתה רוצה השבוע</div>
          <Stepper label="כמה משמרות אתה רוצה" value={Number(draft.wanted || 0)} min={0} max={12} emptyLabel="לא משנה" onChange={v => setDraft(d => ({ ...d, wanted: v }))} />
        </div>
        <div className="space-y-2">
          <label htmlFor="avail-note" className="text-label text-text-secondary block">הערה (לא חובה)</label>
          <textarea
            id="avail-note"
            rows={2}
            maxLength={300}
            value={draft.note}
            onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
            placeholder="למשל: ביום שלישי רק עד 22:00"
            className="w-full px-4 py-3 rounded-2xl resize-none text-lg text-text-primary placeholder:text-text-tertiary outline-none"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}
          />
        </div>
      </div>

      <Button fullWidth onClick={send} disabled={!dirty || sending || state.error}>
        {sending ? 'שולח…' : sentAt ? (dirty ? 'עדכון ההגשה' : 'ההגשה נשלחה') : `שליחה (${count} משמרות)`}
      </Button>
      {state.error && <p className="text-base text-sem-danger">השליחה נכשלה. בדוק חיבור לאינטרנט ונסה שוב.</p>}
    </>
  );
}
