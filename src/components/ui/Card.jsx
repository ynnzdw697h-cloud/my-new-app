/**
 * Card — canonical surface unit for the kitchen OS.
 *
 * tappable: adds glow-btn behaviour + cursor-pointer (for row cards that navigate somewhere)
 * stationColor: hex string — tints the glow when tappable
 * padded: false to remove internal padding (compose your own)
 */
export function Card({
  children,
  tappable = false,
  stationColor,
  padded = true,
  className = '',
  style,
  onClick,
}) {
  const base = [
    'bg-bg-surface border border-border rounded-3xl',
    padded ? 'p-5' : '',
    tappable
      ? 'cursor-pointer select-none active:scale-[0.98] active:transition-[transform_80ms] transition-all duration-200'
      : '',
    tappable ? 'glow-btn' : '',
    className,
  ].join(' ');

  const glowStyle = tappable && stationColor
    ? { '--gc': stationColor, '--gca': stationColor + '66', '--gcb': stationColor + '22' }
    : {};

  return (
    <div
      className={base}
      style={{ ...glowStyle, ...style }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(e) : undefined}
    >
      {children}
    </div>
  );
}
