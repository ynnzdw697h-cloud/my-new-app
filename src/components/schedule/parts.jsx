import { Minus, Plus, Lock } from 'lucide-react';
import { SCHEDULE_STATION_INFO } from '../../data/schedule';

export function StationDot({ station, size = 10 }) {
  return <span aria-hidden="true" style={{ width: size, height: size, borderRadius: '50%', background: SCHEDULE_STATION_INFO[station]?.color, flexShrink: 0, display: 'inline-block' }} />;
}

// − value + ; `emptyLabel` is shown at `min` (e.g. "לא עובד" for rating 0)
export function Stepper({ value, onChange, min = 0, max = 10, emptyLabel, label }) {
  const btn = 'w-12 h-12 rounded-xl flex items-center justify-center text-text-primary transition-colors duration-150 active:bg-white/10 disabled:opacity-30';
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" className={btn} style={{ border: '1px solid var(--border)' }} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="פחות">
        <Minus size={20} strokeWidth={1.75} />
      </button>
      <span className="min-w-[72px] text-center text-lg font-semibold tabular-nums text-text-primary" aria-live="polite">
        {value === min && emptyLabel ? <span className="text-base font-medium text-text-tertiary">{emptyLabel}</span> : value}
      </span>
      <button type="button" className={btn} style={{ border: '1px solid var(--border)' }} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="יותר">
        <Plus size={20} strokeWidth={1.75} />
      </button>
    </div>
  );
}

export function Toggle({ checked, onChange, children }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 min-h-[56px] px-4 rounded-xl text-right text-lg text-text-primary transition-colors duration-150"
      style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}
    >
      <span>{children}</span>
      <span className="relative w-12 h-7 rounded-full flex-shrink-0 transition-colors duration-150" style={{ background: checked ? '#10B981' : 'rgba(255,255,255,0.18)' }}>
        <span className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-150" style={{ right: checked ? 4 : 24 }} />
      </span>
    </button>
  );
}

// Segmented tabs (same look as the app's quiet controls)
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-2xl" role="tablist" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className="flex-1 min-h-[48px] rounded-xl text-base font-semibold transition-colors duration-150"
          style={{ background: value === t.id ? 'var(--bg-elevated)' : 'transparent', color: value === t.id ? '#fff' : 'var(--text-2)' }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// Shown when Firestore refuses manager-only data
export function NoAccess() {
  return (
    <div className="rounded-2xl px-5 py-5 flex items-start gap-3" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
      <Lock size={22} strokeWidth={1.5} className="text-text-secondary flex-shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-lg font-semibold text-text-primary">אין גישה לנתוני הסידור</p>
        <p className="text-base text-text-secondary">החלק הזה פתוח רק למנהלים. אם אתה מנהל, התנתק והיכנס שוב עם הקוד שלך.</p>
      </div>
    </div>
  );
}
