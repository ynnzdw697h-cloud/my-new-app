import { useState } from 'react';
import { CalendarX } from 'lucide-react';
import { EmptyState, SkeletonList } from '../ui';
import { useFirestoreDoc } from '../../hooks/useFirestoreDoc';
import { useChefId } from '../../hooks/useChefId';
import {
  SCHEDULE_CHEFS, SCHEDULE_SHIFTS, SCHEDULE_STATIONS, SCHEDULE_STATION_INFO, DAY_NAMES, PUBLIC_DOCS,
  weekStartOf, weekDays, shortDate, parseSlotKey, iso,
} from '../../data/schedule';
import { StationDot, WeekPicker } from './parts';

const nameOf = id => SCHEDULE_CHEFS.find(c => c.id === id)?.displayName || id;

// סידור עבודה: the published schedule for the whole team, read-only.
export default function TeamSchedule({ user }) {
  const [week, setWeek] = useState(() => weekStartOf());
  const chefId = useChefId(user);
  return (
    <div className="p-5 md:p-6 space-y-4 max-w-xl mx-auto" dir="rtl">
      <WeekPicker week={week} setWeek={setWeek} ahead={1} />
      <WeekView key={week} week={week} me={chefId} />
    </div>
  );
}

export function WeekView({ week, me }) {
  const [published, , state] = useFirestoreDoc(PUBLIC_DOCS.published(week), null);
  if (!state.loaded) return <SkeletonList />;
  if (!published) {
    return <EmptyState icon={CalendarX} title="הסידור לשבוע הזה עוד לא פורסם" description="כשהמנהלים יפרסמו אותו, הוא יופיע כאן." />;
  }

  // day -> shift -> [{ station, n, chefId }]
  const byShift = {};
  Object.entries(published.slots || {}).forEach(([key, chefId]) => {
    const s = parseSlotKey(key);
    ((byShift[s.day] ||= {})[s.shift] ||= []).push({ ...s, chefId });
  });
  const stationOrder = st => SCHEDULE_STATIONS.indexOf(st);
  const today = iso(new Date());

  return (
    <div className="space-y-3">
      {weekDays(week).map((isoDay, d) => {
        const isToday = isoDay === today;
        const shifts = byShift[d] || {};
        return (
          <div key={isoDay} className="rounded-xl px-4 py-4 space-y-3"
            style={{ background: 'var(--bg-card-solid)', border: isToday ? '1.5px solid rgba(255,255,255,0.45)' : '1px solid var(--border)' }}>
            <div className="text-h3 text-text-primary">
              {DAY_NAMES[d]} <span className="text-base font-normal text-text-tertiary tabular-nums">{shortDate(isoDay)}</span>
              {isToday && <span className="text-base font-normal text-text-secondary"> · היום</span>}
            </div>
            {SCHEDULE_SHIFTS.map(sh => {
              const people = (shifts[sh.id] || []).sort((a, b) => stationOrder(a.station) - stationOrder(b.station) || a.n - b.n);
              return (
                <div key={sh.id} className="space-y-1">
                  <div className="text-base text-text-secondary">{sh.name}</div>
                  {people.length === 0
                    ? <div className="text-base text-text-dis">אין שיבוץ</div>
                    : people.map(p => {
                        const mine = p.chefId === me;
                        return (
                          <div key={`${p.station}-${p.n}`} className="flex items-center gap-2 min-h-[36px] text-lg">
                            <StationDot station={p.station} size={8} />
                            <span className="text-text-secondary w-24 flex-shrink-0">{SCHEDULE_STATION_INFO[p.station].name}</span>
                            <span className={mine ? 'font-bold' : 'font-medium text-text-primary'} style={mine ? { color: '#5ee3a8' } : undefined}>
                              {nameOf(p.chefId)}{mine ? ' (אתה)' : ''}
                            </span>
                          </div>
                        );
                      })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
