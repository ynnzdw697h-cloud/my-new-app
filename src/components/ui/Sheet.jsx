import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Whether a field inside a sheet may grab focus on open.
 * On a phone it must not: the keyboard would pop up and cover half the form.
 */
export function canAutoFocus() {
  return typeof window !== 'undefined'
    && !!window.matchMedia
    && window.matchMedia('(min-width: 768px)').matches;
}

/**
 * Sheet — the one bottom sheet for every screen. Centered modal on tablet (≥768px).
 *
 * title:   string (also the accessible name)
 * onClose: backdrop tap or Escape
 * noPad:   remove default padding (compose your own)
 *
 * Max height is 90dvh; the content scrolls inside, so a save button is never
 * pushed under the keyboard. The bottom padding clears the iPhone home bar.
 */
export function Sheet({ open, onClose, title, children, noPad = false }) {
  const panelRef = useRef(null);

  // Escape closes
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Move focus into the sheet (unless a field already took it)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />

          {/* Panel — bottom sheet on mobile, centered modal on tablet */}
          {/* Positioning lives on a static wrapper: framer-motion's `y` animation
              overwrites `transform`, which used to cancel the md:-translate centering. */}
          <div
            className={[
              'fixed z-50 pointer-events-none',
              // Mobile: bottom sheet
              'bottom-0 inset-x-0',
              // Tablet: centered modal
              'md:inset-0 md:flex md:items-center md:justify-center md:p-4',
            ].join(' ')}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={title || undefined}
              tabIndex={-1}
              dir="rtl"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={[
                'pointer-events-auto bg-bg-elevated rounded-t-3xl outline-none',
                'flex flex-col max-h-[90dvh]',
                'md:w-full md:max-w-[560px] md:rounded-3xl',
              ].join(' ')}
              style={{
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.55)',
              }}
            >
              <div
                className={[
                  'flex-1 min-h-0 overflow-y-auto overscroll-contain',
                  noPad ? '' : 'p-6',
                ].join(' ')}
                style={{ paddingBottom: noPad ? undefined : 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
              >
                {title && (
                  <h2 className="text-h2 text-text-primary mb-5 text-right">{title}</h2>
                )}

                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
