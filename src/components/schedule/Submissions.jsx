import { useState } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { Sheet } from '../ui';
import { useFirestoreDoc } from '../../hooks/useFirestoreDoc';
import {
  SCHEDULE_CHEFS, SCHEDULE_SHIFTS, DAY_NAMES, AVAIL, AVAIL_LABELS, PUBLIC_DOCS,
  shiftKey, weekLabel, shortDate, weekDays, deadlineLabel, deadlineDate, iso,
} from '../../data/schedule';

// Managers: who has sent their shifts for the coming week, and what they sent.
export default function Submissions({ week, deadline }) {
  const [open, setOpen] = useState(null); // { chef, data }
  const closes = deadlineDate(week, deadline);

  return (
    <div className="space-y-3">
      <p className="text-base text-text-secondary">
        ההגשה לשבוע הזה נסגרת ביום {deadlineLabel(deadline)} ({shortDate(iso(closes))}).
      </p>
      {SCHEDULE_CHEFS.map(chef => (
        <Row key={chef.id} chef={chef} week={week} onOpen={data => setOpen({ chef, data })} />
      ))}
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? `${open.chef.displayName} · ${weekLabel(week)}` : ''}>
        {open && <Detail data={open.data} week={week} />}
      </Sheet>
    </div>
  );
}

function Row({ chef, week, onOpen }) {
  const [data, , state] = useFirestoreDoc(PUBLIC_DOCS.availability(week, chef.id), null);
  const sent = !!data?.submittedAt;
  const n = sent ? Object.values(data.shifts || {}).filter(v => v > 0).length : 0;
  return (
    <button
      type="button"
      disabled={!sent}
      onClick={() => onOpen(data)}
      className="w-full min-h-[64px] px-5 rounded-xl flex items-center justify-between gap-3 text-right transition-colors duration-150 active:bg-white/5"
      style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}
    >
      <span className="text-lg font-medium text-text-primary">{chef.displayName}</span>
      <span className="flex items-center gap-2 text-base">
        {!state.loaded ? <span className="text-text-tertiary">…</span>
          : sent ? <>
              <span className="flex items-center gap-1" style={{ color: '#5ee3a8' }}><Check size={18} strokeWidth={2} />הגיש</span>
              <span className="text-text-secondary tabular-nums">{n} משמרות</span>
              <ChevronLeft size={20} strokeWidth={1.75} className="text-text-tertiary" />
            </>
          : <span style={{ color: '#F59E0B' }}>עוד לא הגיש</span>}
      </span>
    </button>
  );
}

function Detail({ data, week }) {
  const days = weekDays(week);
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {days.map((isoDay, d) => (
          <div key={isoDay} className="grid items-center gap-2 min-h-[44px]" style={{ gridTemplateColumns: '84px 1fr 1fr' }}>
            <span className="text-base text-text-primary">{DAY_NAMES[d]} <span className="text-text-tertiary tabular-nums">{shortDate(isoDay)}</span></span>
            {SCHEDULE_SHIFTS.map(sh => {
              const v = Number(data.shifts?.[shiftKey(d, sh.id)] || 0);
              return (
                <span key={sh.id} className={`text-base ${v === AVAIL.PREFER ? 'font-bold' : ''}`}
                  style={{ color: v === AVAIL.PREFER ? '#5ee3a8' : v === AVAIL.CAN ? '#7fd3a3' : 'var(--text-dis)' }}>
                  {sh.short}: {AVAIL_LABELS[v]}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="text-lg text-text-primary">רוצה: {Number(data.wanted) ? <span className="tabular-nums">{data.wanted} משמרות</span> : 'לא משנה'}</div>
      {data.note && <div className="text-lg text-text-primary">הערה: {data.note}</div>}
    </div>
  );
}
