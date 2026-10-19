/**
 * Card — canonical surface unit for the kitchen OS.
 *
 * tappable: pointer + a quiet pressed state (for row cards that navigate somewhere)
 * padded: false to remove internal padding (compose your own)
 */
export function Card({
  children,
  tappable = false,
  padded = true,
  className = '',
  style,
  onClick,
}) {
  const base = [
    'bg-bg-surface border border-border rounded-3xl',
    padded ? 'p-5' : '',
    tappable
      ? 'cursor-pointer select-none transition-colors duration-150 hover:border-border-strong active:bg-white/5'
      : '',
    className,
  ].join(' ');

  return (
    <div
      className={base}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(e) : undefined}
    >
      {children}
    </div>
  );
}
