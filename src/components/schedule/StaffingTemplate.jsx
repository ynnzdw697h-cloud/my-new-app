import { SCHEDULE_SHIFTS, SCHEDULE_STATIONS, SCHEDULE_STATION_INFO, DAY_NAMES, defaultTemplate } from '../../data/schedule';
import { StationDot } from './parts';

const MAX_PER_STATION = 3;

// How many cooks each shift needs per station. Tap a number to change it (0 → 1 → 2 → 3 → 0).
export default function StaffingTemplate({ template, setTemplate }) {
  const t = template?.days ? template : defaultTemplate();

  function bump(d, shift, station) {
    setTemplate(prev => {
      const base = prev?.days ? prev : defaultTemplate();
      const days = base.days.map((day, i) => {
        if (i !== d) return day;
        const cur = Number(day[shift]?.[station] || 0);
        return { ...day, [shift]: { ...day[shift], [station]: (cur + 1) % (MAX_PER_STATION + 1) } };
      });
      return { ...base, days };
    });
  }
  function copySundayToAll() {
    setTemplate(prev => {
      const base = prev?.days ? prev : defaultTemplate();
      return { ...base, days: base.days.map(() => JSON.parse(JSON.stringify(base.days[0]))) };
    });
  }
  function setDeadline(patch) {
    setTemplate(prev => {
      const base = prev?.days ? prev : defaultTemplate();
      return { ...base, deadline: { ...base.deadline, ...patch } };
    });
  }

  const perWeek = t.days.reduce((sum, day) => sum + SCHEDULE_SHIFTS.reduce((s2, sh) => s2 + SCHEDULE_STATIONS.reduce((s3, st) => s3 + Number(day[sh.id]?.[st] || 0), 0), 0), 0);
  const selectCls = 'min-h-[48px] px-3 rounded-xl text-lg text-text-primary outline-none';
  const selectStyle = { background: 'var(--bg-inset)', border: '1px solid var(--border)' };

  return (
    <div className="space-y-4">
      <p className="text-base text-text-secondary">כמה טבחים צריך בכל פס, בכל משמרת. לחיצה על מספר משנה אותו. סה״כ <span className="tabular-nums text-text-primary">{perWeek}</span> משבצות בשבוע.</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-base text-text-secondary">
        {SCHEDULE_STATIONS.map(st => (
          <span key={st} className="flex items-center gap-2"><StationDot station={st} />{SCHEDULE_STATION_INFO[st].name}</span>
        ))}
      </div>

      <div className="rounded-xl px-5 py-4 space-y-3" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
        <div className="text-h3 text-text-primary">תאריך אחרון להגשה</div>
        <div className="flex flex-wrap items-center gap-2 text-lg text-text-primary">
          <span>יום</span>
          <select aria-label="יום אחרון להגשה" className={selectCls} style={selectStyle} value={t.deadline?.day ?? 4} onChange={e => setDeadline({ day: Number(e.target.value) })}>
            {DAY_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
          <span>בשעה</span>
          <select aria-label="שעה אחרונה להגשה" className={selectCls} style={selectStyle} value={t.deadline?.hour ?? 12} onChange={e => setDeadline({ hour: Number(e.target.value) })}>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
          </select>
          <span className="text-base text-text-secondary">בשבוע שלפני</span>
        </div>
      </div>

      {t.days.map((day, d) => (
        <div key={d} className="rounded-xl px-5 py-4 space-y-3" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-h3 text-text-primary">יום {DAY_NAMES[d]}</span>
            {d === 0 && (
              <button type="button" onClick={copySundayToAll} className="min-h-[48px] px-4 rounded-xl text-base font-medium text-text-primary transition-colors duration-150 active:bg-white/10" style={{ border: '1px solid var(--border)' }}>
                אותו דבר לכל הימים
              </button>
            )}
          </div>
          {SCHEDULE_SHIFTS.map(sh => (
            <div key={sh.id} className="flex items-center gap-2">
              <span className="w-24 flex-shrink-0 text-base text-text-secondary">{sh.name}</span>
              <div className="flex-1 grid grid-cols-4 gap-2">
                {SCHEDULE_STATIONS.map(st => {
                  const n = Number(day[sh.id]?.[st] || 0);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => bump(d, sh.id, st)}
                      aria-label={`יום ${DAY_NAMES[d]}, ${sh.name}, ${SCHEDULE_STATION_INFO[st].name}: ${n}`}
                      className="min-h-[52px] rounded-xl flex items-center justify-center gap-2 text-lg font-semibold tabular-nums transition-colors duration-150 active:bg-white/10"
                      style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: n ? '#fff' : 'var(--text-dis)' }}
                    >
                      <StationDot station={st} />{n}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
