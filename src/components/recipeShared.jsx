import { useState, useRef } from 'react';
import {
  Soup, CookingPot, FlaskConical, Carrot, Croissant, Container, ChefHat, Wheat, Leaf, Salad,
  UtensilsCrossed, CakeSlice, ChevronRight, ChevronDown, Sun, Moon, ImagePlus,
} from 'lucide-react';

// ─── Category icons ───
export const CAT_META = {
  'ציר':     { Icon: Soup },
  'רטבים':   { Icon: CookingPot },
  'מותססים': { Icon: FlaskConical },
  'כבושים':  { Icon: Carrot },
  'בצקים':   { Icon: Croissant },
  'ממרחים':  { Icon: Container },
  'הכנות':   { Icon: ChefHat },
  'אורז':    { Icon: Wheat },
  'תוספות':  { Icon: Leaf },
  'סלטים':   { Icon: Salad },
};
export const DISH_CAT_META = {
  'סלטים':   { Icon: Salad },
  'עיקריות': { Icon: UtensilsCrossed },
  'קינוחים': { Icon: CakeSlice },
};
export const DEFAULT_META = { Icon: UtensilsCrossed };

export function fmt(n) {
  if (n === 0) return '0';
  return parseFloat((Math.round(n * 1000) / 1000).toFixed(3)).toString();
}

export function foodCostColor(pct) {
  if (pct < 25) return '#10B981';
  if (pct < 35) return '#F59E0B';
  return '#EF4444';
}

/* ─── Compress image to base64 using Canvas ─── */
export function compressImage(file, maxWidth = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('לא ניתן לקרוא את הקובץ'));
    img.src = url;
  });
}

/* ════════════════════════════════════════════════════
   Sticky top bar: always-available back button + recipe name
   (sits under the app header on phones, at the top on tablets)
════════════════════════════════════════════════════ */
export function DetailTopBar({ title, onBack, wakeLock, stationColor }) {
  const { supported, off, toggle } = wakeLock;
  return (
    <div
      className="sticky top-16 md:top-0 z-20 h-14 flex items-center gap-1 px-2"
      style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="חזרה"
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ color: 'var(--text)' }}
      >
        <ChevronRight size={26} strokeWidth={2.25} />
      </button>
      <h2 className="flex-1 min-w-0 truncate text-xl font-bold" style={{ color: 'var(--text)' }}>{title}</h2>
      {supported && (
        <button
          type="button"
          onClick={toggle}
          aria-label={off ? 'המסך נשאר דולק: כבוי. לחץ להפעלה' : 'המסך נשאר דולק. לחץ לכיבוי'}
          aria-pressed={!off}
          className="h-12 px-3 rounded-xl flex items-center gap-1.5 flex-shrink-0 text-base font-semibold"
          style={{ color: off ? 'var(--text-2)' : stationColor }}
        >
          {off ? <Moon size={22} /> : <Sun size={22} />}
          <span>{off ? 'רגיל' : 'מסך דולק'}</span>
        </button>
      )}
    </div>
  );
}

/* Folded section (cost, description, FOH…) */
export function FoldSection({ title, icon: Icon, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full min-h-[56px] px-4 flex items-center gap-3 text-right"
      >
        {Icon && <Icon size={20} style={{ color: 'var(--text-2)' }} />}
        <span className="flex-1 text-lg font-semibold" style={{ color: 'var(--text)' }}>{title}</span>
        <ChevronDown size={22} style={{ color: 'var(--text-2)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>{children}</div>}
    </div>
  );
}

/* Plain card with a heading */
export function Block({ title, icon: Icon, aside, children }) {
  return (
    <section className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="min-h-[52px] px-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        {Icon && <Icon size={20} style={{ color: 'var(--text-2)' }} />}
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{title}</h3>
        {aside && <span className="mr-auto">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export function ScaleBadge({ factor, color }) {
  return (
    <span className="text-base font-semibold px-2.5 py-1 rounded-lg" style={{ background: color + '22', color }}>
      <span dir="ltr">×{fmt(factor)}</span>
    </span>
  );
}

export function StepList({ steps, color }) {
  return (
    <div className="px-4 py-4 space-y-5">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3">
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-base font-semibold"
            style={{ background: color, color: '#fff' }}
          >
            {i + 1}
          </div>
          <p className="text-lg leading-relaxed" style={{ color: 'var(--text)' }}>{step}</p>
        </div>
      ))}
    </div>
  );
}

/* Quick-pick chips: every button 48px tall */
export function QuickPicks({ options, isActive, onPick, color, label }) {
  return (
    <div className="flex gap-2">
      {options.map(o => {
        const active = isActive(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onPick(o)}
            aria-pressed={active}
            className="flex-1 min-h-[48px] rounded-xl text-lg font-semibold"
            style={{
              background: active ? color : 'rgba(255,255,255,0.08)',
              color: active ? '#fff' : 'var(--text)',
            }}
          >
            <span dir="ltr">{label(o)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function StepperButton({ children, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-semibold flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text)' }}
    >{children}</button>
  );
}

/* Image upload button + hidden input. Calls onUpload(file). */
export function ImageUploadButton({ hasImage, uploading, error, onFile }) {
  const fileRef = useRef();
  return (
    <div>
      <button
        type="button"
        onClick={() => fileRef.current.click()}
        disabled={uploading}
        className="w-full min-h-[48px] rounded-xl flex items-center justify-center gap-2 text-lg font-semibold"
        style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text)' }}
      >
        <ImagePlus size={20} />
        {uploading ? 'מעלה...' : hasImage ? 'החלף תמונה' : 'הוסף תמונה'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {error && <p className="mt-2 text-base font-semibold" style={{ color: 'var(--danger)' }}>שגיאה: {error}</p>}
    </div>
  );
}

/* Header image (only when a photo exists — otherwise no empty box) */
export function HeroImage({ url, alt }) {
  if (!url) return null;
  return <img src={url} alt={alt} className="w-full object-cover" style={{ height: 180 }} />;
}

export function MetaLine({ parts }) {
  return (
    <p className="px-4 pt-3 text-base" style={{ color: 'var(--text-2)' }}>
      {parts.filter(Boolean).join(' · ')}
    </p>
  );
}
