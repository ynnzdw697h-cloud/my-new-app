/**
 * Input — kitchen text/number field.
 * Height 56px min, rounded-2xl, accent focus ring.
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
        <label className="text-label text-text-secondary px-1">{label}</label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={[
          'w-full h-14 px-4 rounded-2xl',
          'bg-bg-inset text-text-primary text-body',
          'border border-border',
          'outline-none',
          'focus:border-accent focus:shadow-[0_0_0_3px_rgba(212,237,49,0.18)]',
          'transition-all duration-200',
          'disabled:opacity-40',
          'placeholder:text-text-tertiary',
          error ? 'border-sem-danger focus:border-sem-danger focus:shadow-[0_0_0_3px_rgba(248,113,113,0.18)]' : '',
        ].join(' ')}
        {...rest}
      />
      {hint && !error && (
        <span className="text-meta text-text-tertiary px-1">{hint}</span>
      )}
      {error && (
        <span className="text-meta text-sem-danger px-1">{error}</span>
      )}
    </div>
  );
}
