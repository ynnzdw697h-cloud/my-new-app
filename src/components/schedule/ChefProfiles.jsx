import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Sheet } from '../ui';
import { SCHEDULE_CHEFS, SCHEDULE_STATIONS, SCHEDULE_STATION_INFO, defaultProfile } from '../../data/schedule';
import { StationDot, Stepper, Toggle } from './parts';

// Manager-only cook cards: rating per station, note for the scheduler, min/max shifts.
export default function ChefProfiles({ profiles, setProfiles }) {
  const [openId, setOpenId] = useState(null);
  const chef    = SCHEDULE_CHEFS.find(c => c.id === openId);
  const profile = (id) => ({ ...defaultProfile(), ...(profiles?.[id] || {}) });

  // Every change saves at once (no save button)
  function update(id, patch) {
    setProfiles(prev => {
      const cur = { ...defaultProfile(), ...(prev?.[id] || {}) };
      return { ...(prev || {}), [id]: { ...cur, ...patch } };
    });
  }
  function setRating(id, station, v) {
    const ratings = { ...profile(id).ratings };
    if (v > 0) ratings[station] = v; else delete ratings[station];
    update(id, { ratings });
  }

  return (
    <div className="space-y-3">
      <p className="text-base text-text-secondary">רק אתה וקידר רואים את המסך הזה. הרמות עוזרות לשיבוץ האוטומטי.</p>
      {SCHEDULE_CHEFS.map(c => {
        const p = profile(c.id);
        const rated = SCHEDULE_STATIONS.filter(s => p.ratings[s] > 0);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => setOpenId(c.id)}
            className="w-full rounded-xl px-5 py-4 min-h-[72px] flex items-center gap-3 text-right transition-colors duration-150 active:bg-white/5"
            style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', opacity: p.inSchedule ? 1 : 0.55 }}
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-lg font-semibold text-text-primary">{c.displayName}</div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-text-secondary">
                {!p.inSchedule ? <span>לא בסידור</span>
                  : rated.length === 0 ? <span className="text-text-tertiary">עוד לא הוגדרו פסים</span>
                  : rated.map(s => (
                    <span key={s} className="inline-flex items-center gap-1.5">
                      <StationDot station={s} />{SCHEDULE_STATION_INFO[s].name} <span className="tabular-nums text-text-primary">{p.ratings[s]}</span>
                    </span>
                  ))}
              </div>
              {p.note && <div className="text-base text-text-tertiary truncate">{p.note}</div>}
            </div>
            <ChevronLeft size={20} strokeWidth={1.5} className="text-text-tertiary flex-shrink-0" aria-hidden="true" />
          </button>
        );
      })}

      <Sheet open={!!chef} onClose={() => setOpenId(null)} title={chef?.displayName || ''}>
        {chef && (() => {
          const p = profile(chef.id);
          return (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="text-label text-text-secondary">רמה בכל פס (1 עד 10)</div>
                {SCHEDULE_STATIONS.map(s => (
                  <div key={s} className="flex items-center justify-between gap-3 min-h-[56px]">
                    <span className="flex items-center gap-2 text-lg text-text-primary"><StationDot station={s} />{SCHEDULE_STATION_INFO[s].name}</span>
                    <Stepper label={`רמה ב${SCHEDULE_STATION_INFO[s].name}`} value={p.ratings[s] || 0} min={0} max={10} emptyLabel="לא עובד" onChange={v => setRating(chef.id, s, v)} />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label htmlFor="chef-note" className="text-label text-text-secondary block">הערה לשיבוץ</label>
                <textarea
                  id="chef-note"
                  rows={2}
                  value={p.note}
                  onChange={e => update(chef.id, { note: e.target.value })}
                  placeholder="למשל: עדיף לשבץ בפס חם"
                  className="w-full px-4 py-3 rounded-2xl resize-none text-lg text-text-primary placeholder:text-text-tertiary outline-none"
                  style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}
                />
              </div>

              <div className="space-y-2">
                <div className="text-label text-text-secondary">משמרות בשבוע</div>
                <div className="flex items-center justify-between gap-3 min-h-[56px]">
                  <span className="text-lg text-text-primary">מינימום</span>
                  <Stepper label="מינימום משמרות" value={p.min} min={0} max={p.max} onChange={v => update(chef.id, { min: v })} />
                </div>
                <div className="flex items-center justify-between gap-3 min-h-[56px]">
                  <span className="text-lg text-text-primary">מקסימום</span>
                  <Stepper label="מקסימום משמרות" value={p.max} min={Math.max(1, p.min)} max={12} onChange={v => update(chef.id, { max: v })} />
                </div>
              </div>

              <div className="space-y-2">
                <Toggle checked={p.senior} onChange={v => update(chef.id, { senior: v })}>יכול להיות בכיר משמרת</Toggle>
                <Toggle checked={p.inSchedule} onChange={v => update(chef.id, { inSchedule: v })}>מופיע בסידור</Toggle>
              </div>
            </div>
          );
        })()}
      </Sheet>
    </div>
  );
}
