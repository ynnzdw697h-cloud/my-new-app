import { useHaptic } from '../../hooks/useHaptic';

/**
 * Button — unified kitchen button.
 *
 * variant: 'primary' | 'secondary' | 'ghost' | 'danger'
 * size:    'md' (56px default) | 'sm' (48px)
 * fullWidth: boolean
 * icon: lucide component (icon-only when no children)
 *
 * All buttons fire haptic on click for commit actions.
 * Pass haptic={false} to suppress (e.g., toggles that shouldn't confirm).
 */
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon: Icon,
  children,
  onClick,
  disabled = false,
  haptic = true,
  className = '',
  style,
  type = 'button',
  ariaLabel,
}) {
  const vibrate = useHaptic();

  function handleClick(e) {
    if (disabled) return;
    if (haptic) vibrate();
    onClick?.(e);
  }

  const isIconOnly = Icon && !children;

  const base = [
    'inline-flex items-center justify-center gap-2.5',
    'font-semibold text-label tracking-tight',
    'rounded-2xl select-none cursor-pointer',
    'transition-all duration-200',
    'active:scale-[0.97] active:transition-[transform_80ms]',
    'disabled:opacity-40 disabled:pointer-events-none',
    fullWidth ? 'w-full' : '',
  ].join(' ');

  const sizeClass = size === 'sm'
    ? (isIconOnly ? 'w-12 h-12' : 'h-12 px-5')
    : (isIconOnly ? 'w-14 h-14' : 'h-14 px-6');

  const variants = {
    primary: [
      'bg-accent text-[#0E0E0E]',
      'hover:brightness-110',
      'shadow-[0_0_0_1px_rgba(212,237,49,0.0)]',
      'hover:shadow-[0_0_20px_rgba(212,237,49,0.42),0_0_55px_rgba(212,237,49,0.14)]',
    ].join(' '),

    secondary: [
      'bg-bg-surface text-text-primary',
      'border border-border',
      'hover:border-border-strong hover:bg-bg-elevated',
    ].join(' '),

    ghost: [
      'bg-transparent text-text-secondary',
      'hover:text-text-primary hover:bg-white/[0.05]',
    ].join(' '),

    danger: [
      'bg-transparent text-sem-danger',
      'border border-sem-danger/40',
      'hover:bg-sem-danger/10 hover:border-sem-danger/70',
    ].join(' '),
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      aria-label={ariaLabel}
      style={style}
      className={`${base} ${sizeClass} ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={size === 'sm' ? 18 : 20} strokeWidth={1.5} />}
      {children}
    </button>
  );
}
