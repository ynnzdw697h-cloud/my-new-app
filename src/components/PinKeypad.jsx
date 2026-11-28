import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';

// Four dots and a phone keypad (1-2-3 left to right, even on an RTL page).
// Same look as the login screen. The parent owns the digits.
export default function PinKeypad({ value, onChange, onComplete, disabled = false, error = false }) {
  function press(d) {
    if (disabled || value.length >= 4) return;
    const next = value + d;
    onChange(next);
    if (next.length === 4) onComplete?.(next);
  }
  const keys = ['1','2','3','4','5','6','7','8','9','','0','del'];
  return (
    <div className="w-full max-w-xs flex flex-col items-center gap-6">
      <motion.div
        animate={error ? { x: [-8, 8, -6, 6, -4, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex gap-4"
      >
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="w-4 h-4 rounded-full transition-colors duration-200"
            style={{ background: i < value.length ? (error ? '#ef4444' : '#3B82F6') : 'rgba(255,255,255,0.15)' }}
          />
        ))}
      </motion.div>
      <div className="grid grid-cols-3 gap-4 w-full" dir="ltr">
        {keys.map((k, i) => {
          if (k === '') return <div key={i} />;
          if (k === 'del') {
            return (
              <button
                key={i} type="button" disabled={disabled}
                onClick={() => onChange(value.slice(0, -1))}
                aria-label="מחק ספרה"
                className="rounded-xl h-20 flex items-center justify-center transition-colors duration-150 active:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
              >
                <Delete size={26} strokeWidth={1.75} aria-hidden="true" />
              </button>
            );
          }
          return (
            <button
              key={i} type="button" disabled={disabled}
              onClick={() => press(k)}
              className="rounded-xl h-20 flex items-center justify-center text-2xl font-semibold transition-colors duration-150 active:bg-white/10"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'white' }}
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
