import { useHaptic } from '../../hooks/useHaptic';

/**
 * NumberStepper — large ± stepper for quantities, scales, protein counts.
 * Keyboard-friendly but designed for wet-hand touch.
 *
 * min / max: optional clamp values
 * step: increment amount (default 1)
 * unit: optional label suffix (e.g. "ק״ג", "יח׳")
 */
export function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  label,
  disabled = false,
  className = '',
}) {
  const vibrate = useHaptic();

  function decrement() {
    if (disabled) return;
    const next = value - step;
    if (min !== undefined && next < min) return;
    vibrate();
    onChange(next);
  }

  function increment() {
    if (disabled) return;
    const next = value + step;
    if (max !== undefined && next > max) return;
    vibrate();
    onChange(next);
  }

  const canDec = min === undefined || value - step >= min;
  const canInc = max === undefined || value + step <= max;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <span className="text-label text-text-secondary px-1">{label}</span>
      )}
      <div className="flex items-center gap-3">
        {/* Decrement */}
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || !canDec}
          aria-label="הפחת"
          className={[
            'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0',
            'bg-bg-elevated border border-border',
            'text-text-primary text-2xl font-light',
            'active:scale-[0.92] transition-all duration-100',
            'disabled:opacity-30 disabled:pointer-events-none',
          ].join(' ')}
        >
          −
        </button>

        {/* Value display */}
        <div className="flex-1 h-14 flex items-center justify-center rounded-2xl bg-bg-inset border border-border gap-1.5">
          <span className="text-display tabular-nums text-text-primary">
            {value}
          </span>
          {unit && (
            <span className="text-label text-text-secondary mt-1">{unit}</span>
          )}
        </div>

        {/* Increment */}
        <button
          type="button"
          onClick={increment}
          disabled={disabled || !canInc}
          aria-label="הוסף"
          className={[
            'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0',
            'bg-bg-elevated border border-border',
            'text-accent text-2xl font-light',
            'active:scale-[0.92] transition-all duration-100',
            'disabled:opacity-30 disabled:pointer-events-none',
          ].join(' ')}
        >
          +
        </button>
      </div>
    </div>
  );
}
