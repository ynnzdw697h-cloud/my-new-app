/**
 * Chip — 28px tag / status pill.
 *
 * variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'station'
 * stationColor: hex (used when variant='station')
 */
export function Chip({
  children,
  variant = 'default',
  stationColor,
  className = '',
}) {
  const variants = {
    default: {
      bg:     'rgba(255,255,255,0.08)',
      border: 'rgba(255,255,255,0.12)',
      color:  'rgba(255,255,255,0.72)',
    },
    success: {
      bg:     'rgba(52,211,153,0.12)',
      border: 'rgba(52,211,153,0.30)',
      color:  '#34D399',
    },
    warning: {
      bg:     'rgba(245,158,11,0.12)',
      border: 'rgba(245,158,11,0.30)',
      color:  '#F59E0B',
    },
    danger: {
      bg:     'rgba(248,113,113,0.12)',
      border: 'rgba(248,113,113,0.30)',
      color:  '#F87171',
    },
    info: {
      bg:     'rgba(96,165,250,0.12)',
      border: 'rgba(96,165,250,0.30)',
      color:  '#60A5FA',
    },
    station: {
      bg:     (stationColor || '#D4ED31') + '1A',
      border: (stationColor || '#D4ED31') + '40',
      color:  stationColor || '#D4ED31',
    },
  };

  const s = variants[variant] || variants.default;

  return (
    <span
      className={`inline-flex items-center px-3 h-7 rounded-full text-label whitespace-nowrap ${className}`}
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      {children}
    </span>
  );
}
