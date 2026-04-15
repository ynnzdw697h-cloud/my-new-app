import { useHaptic } from '../../hooks/useHaptic';

/**
 * ListRow — standard 64px+ touch row for checklists, recipe lists, delivery rows.
 *
 * checkable: shows a checkbox-style toggle on the trailing side
 * checked: boolean
 * onToggle: called when the whole row is tapped (checkable rows)
 * onClick: called when tapped (non-checkable rows)
 * stationColor: hex — colors the checkbox/active state
 * leading: ReactNode (icon tile, avatar, etc.)
 * trailing: ReactNode (badge, chevron, etc.) — overrides checkbox
 * subtitle: second line of text
 */
export function ListRow({
  children,
  subtitle,
  checkable = false,
  checked = false,
  onToggle,
  onClick,
  stationColor = '#D4ED31',
  leading,
  trailing,
  className = '',
  disabled = false,
}) {
  const vibrate = useHaptic();

  function handleTap() {
    if (disabled) return;
    vibrate();
    if (checkable) onToggle?.();
    else onClick?.();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleTap}
      onKeyDown={(e) => e.key === 'Enter' && handleTap()}
      className={[
        'flex items-center gap-4 px-4 py-3.5 rounded-2xl min-h-[64px]',
        'cursor-pointer select-none',
        'active:scale-[0.98] active:transition-[transform_80ms] transition-all duration-150',
        checked ? 'opacity-60' : '',
        disabled ? 'opacity-30 pointer-events-none' : '',
        className,
      ].join(' ')}
    >
      {/* Leading slot */}
      {leading && (
        <div className="flex-shrink-0">{leading}</div>
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={[
          'text-body font-semibold text-right',
          checked ? 'line-through text-text-tertiary' : 'text-text-primary',
        ].join(' ')}>
          {children}
        </p>
        {subtitle && (
          <p className="text-meta text-text-tertiary text-right mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Trailing: custom OR checkbox */}
      {trailing ? (
        <div className="flex-shrink-0">{trailing}</div>
      ) : checkable && (
        <div
          className="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200"
          style={{
            borderColor: checked ? stationColor : 'rgba(255,255,255,0.25)',
            background:  checked ? stationColor : 'transparent',
            boxShadow:   checked ? `0 0 12px ${stationColor}55` : 'none',
          }}
        >
          {checked && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7L5.5 10L11.5 4" stroke="#0E0E0E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
