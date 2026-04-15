/**
 * StatusDot — semantic status indicator: dot + color + label.
 * Colorblind-safe: uses color AND text, never color alone.
 *
 * status: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
 */

const STATUS_MAP = {
  success: { color: '#34D399', label: 'תקין' },
  warning: { color: '#F59E0B', label: 'מתקרב' },
  danger:  { color: '#F87171', label: 'פג' },
  info:    { color: '#60A5FA', label: 'מידע' },
  neutral: { color: 'rgba(255,255,255,0.38)', label: '' },
};

export function StatusDot({ status = 'neutral', label, className = '' }) {
  const s = STATUS_MAP[status] || STATUS_MAP.neutral;
  const displayLabel = label ?? s.label;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className="flex-shrink-0 w-2 h-2 rounded-full"
        style={{ background: s.color, boxShadow: `0 0 6px ${s.color}88` }}
      />
      {displayLabel && (
        <span className="text-meta" style={{ color: s.color }}>
          {displayLabel}
        </span>
      )}
    </span>
  );
}
