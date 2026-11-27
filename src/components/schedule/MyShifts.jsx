import { ChevronLeft, CalendarCheck } from 'lucide-react';
import { useFirestoreDoc } from '../../hooks/useFirestoreDoc';
import { useChefId } from '../../hooks/useChefId';
import {
  SCHEDULE_CHEFS, SCHEDULE_SHIFTS, SCHEDULE_STATION_INFO, DAY_NAMES, PUBLIC_DOCS,
  weekStartOf, nextWeekStart, weekDays, weekLabel, shortDate, submissionWeek, iso, slotKey, shiftStart, defaultStart, fmtTime,
} from '../../data/schedule';
import { addDays } from '../../data/shifts';
import { shiftsOf } from '../../utils/scheduler';
import { StationDot } from './parts';

const nameOf = id => SCHEDULE_CHEFS.find(c => c.id === id)?.displayName || id;
const MAX_ROWS = 6;

// Dashboard card: my next shifts from the published schedule, and a reminder to submit.
export default function MyShifts({ user, onNavigate }) {
  const chefId = useChefId(user);
  if (!chefId || !SCHEDULE_CHEFS.some(c => c.id === chefId)) return null;
  return <MyShiftsCard chefId={chefId} onNavigate={onNavigate} />;
}

function MyShiftsCard({ chefId, onNavigate }) {
  const thisWeek = weekStartOf();
  const nextWeek = nextWeekStart();
  const [pubThis, , thisState] = useFirestoreDoc(PUBLIC_DOCS.published(thisWeek), null);
  const [pubNext, , nextState] = useFirestoreDoc(PUBLIC_DOCS.published(nextWeek), null);
  const [settings, , settingsState] = useFirestoreDoc(PUBLIC_DOCS.settings, null);
  const submitWeek = submissionWeek(new Date(), settings?.deadline);
  const [mySubmit, , submitState] = useFirestoreDoc(PUBLIC_DOCS.availability(submitWeek, chefId), null);

  if (!thisState.loaded || !nextState.loaded || !settingsState.loaded || !submitState.loaded) return null;

  const today = iso(new Date());
  const upcoming = [[thisWeek, pubThis], [nextWeek, pubNext]].flatMap(([week, pub]) => {
    if (!pub) return [];
    const days = weekDays(week);
    return shiftsOf(pub.slots, chefId).map(s => {
      const detail = pub.details?.[slotKey(s.day, s.shift, s.station, s.n)] || {};
      return { ...s, date: days[s.day], time: detail.time || shiftStart(pub.times, s.day, s.shift), note: detail.note };
    }).filter(s => s.date >= today);
  });
  const rows = upcoming.slice(0, MAX_ROWS);
  const notSubmitted = !mySubmit?.submittedAt;
  // Weeks that were published without any shift for me
  const emptyWeeks = [[thisWeek, pubThis], [nextWeek, pubNext]]
    .filter(([week, pub]) => pub && !upcoming.some(s => weekDays(week).includes(s.date)) && addDays(week, 6) >= today)
    .map(([week]) => week);

  if (!rows.length && !notSubmitted && !emptyWeeks.length) return null;

  const dayName = date => (date === today ? 'היום' : date === addDays(today, 1) ? 'מחר' : `יום ${DAY_NAMES[new Date(`${date}T12:00`).getDay()]}`);

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-text-secondary px-1">המשמרות שלי</h2>
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
        {rows.map(s => {
          const info = SCHEDULE_STATION_INFO[s.station];
          return (
            <div key={`${s.date}-${s.shift}-${s.station}`} className="px-4 py-3 min-h-[64px] space-y-0.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 text-lg">
                <span className="font-medium text-text-primary">{dayName(s.date)}</span>
                <span className="text-text-tertiary tabular-nums">{shortDate(s.date)}</span>
                <span className="text-text-secondary">· {SCHEDULE_SHIFTS.find(x => x.id === s.shift).short}</span>
                <span className="tabular-nums font-medium" style={{ color: s.time !== defaultStart(s.shift) ? '#F59E0B' : 'var(--text-2)' }}>{fmtTime(s.time)}</span>
                <span className="mr-auto flex items-center gap-1.5 text-base text-text-secondary"><StationDot station={s.station} size={8} />{info.name}</span>
              </div>
              {s.note && <div className="text-base truncate" style={{ color: '#F59E0B' }}>{s.note}</div>}
              {s.mates.length > 0 && <div className="text-base text-text-secondary truncate">עם {s.mates.map(nameOf).join(', ')}</div>}
            </div>
          );
        })}
        {upcoming.length > MAX_ROWS && (
          <div className="px-4 py-3 text-base text-text-secondary" style={{ borderBottom: '1px solid var(--border)' }}>
            ועוד <span className="tabular-nums">{upcoming.length - MAX_ROWS}</span> משמרות
          </div>
        )}
        {emptyWeeks.map(week => (
          <div key={week} className="px-4 py-3 min-h-[56px] flex items-center text-lg text-text-secondary" style={{ borderBottom: '1px solid var(--border)' }}>
            אין לך משמרות בשבוע <span className="tabular-nums mr-1.5" dir="ltr">{weekLabel(week)}</span>
          </div>
        ))}
        {(pubThis || pubNext) && (
          <button
            type="button"
            onClick={() => onNavigate('team_schedule')}
            className="w-full text-right px-4 min-h-[56px] flex items-center gap-3 active:bg-white/5"
            style={{ borderBottom: notSubmitted ? '1px solid var(--border)' : undefined }}
          >
            <span className="flex-1 text-lg text-text-secondary">כל הסידור</span>
            <ChevronLeft size={18} strokeWidth={1.5} className="text-text-tertiary flex-shrink-0" />
          </button>
        )}
        {notSubmitted && (
          <button
            type="button"
            onClick={() => onNavigate('shift_submit')}
            className="w-full text-right px-4 min-h-[64px] flex items-center gap-3 active:bg-white/5"
          >
            <CalendarCheck size={20} strokeWidth={1.5} className="flex-shrink-0" style={{ color: '#F59E0B' }} />
            <span className="flex-1 min-w-0 text-lg text-text-primary">
              עוד לא הגשת משמרות לשבוע <span className="tabular-nums" dir="ltr">{weekLabel(submitWeek)}</span>
            </span>
            <ChevronLeft size={18} strokeWidth={1.5} className="text-text-tertiary flex-shrink-0" />
          </button>
        )}
      </div>
    </section>
  );
}
