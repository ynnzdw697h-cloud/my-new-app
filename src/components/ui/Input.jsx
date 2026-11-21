/**
 * Input — kitchen text/number field.
 * Height 56px, text 18px (iOS zooms the page on fields under 16px),
 * white focus border, no glow.
 * Never use placeholder as label — always pass label prop.
 */
export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  className = '',
  hint,
  error,
  ...rest
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-base text-text-secondary px-1">{label}</label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={[
          'w-full h-14 px-4 rounded-2xl',
          'bg-bg-inset text-text-primary text-lg',
          'border border-border',
          'outline-none',
          'focus:border-white/60',
          'transition-colors duration-150',
          'disabled:opacity-40',
          'placeholder:text-text-tertiary',
          error ? 'border-sem-danger focus:border-sem-danger' : '',
        ].join(' ')}
        {...rest}
      />
      {hint && !error && (
        <span className="text-base text-text-tertiary px-1">{hint}</span>
      )}
      {error && (
        <span className="text-base text-sem-danger px-1">{error}</span>
      )}
    </div>
  );
}
