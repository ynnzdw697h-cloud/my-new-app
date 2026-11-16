import { motion, AnimatePresence } from 'framer-motion';

/**
 * Sheet — bottom sheet for mobile, centered modal for tablet (≥768px).
 * Replaces all alert()/confirm() usage.
 *
 * title: string
 * onClose: called on backdrop tap or swipe-down
 * noPad: remove default padding (compose your own)
 */
export function Sheet({ open, onClose, title, children, noPad = false }) {
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
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={[
              'pointer-events-auto rounded-t-3xl',
              'md:w-full md:max-w-[560px] md:rounded-3xl',
              noPad ? '' : 'p-6',
            ].join(' ')}
            style={{
              background: '#1F1F24',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.55)',
            }}
          >
            {/* Drag handle — mobile only */}
            <div
              className="md:hidden w-10 h-1 rounded-full mx-auto mb-5"
              style={{ background: 'rgba(255,255,255,0.18)' }}
            />

            {title && (
              <h2 className="text-h2 text-text-primary mb-5 text-right">{title}</h2>
            )}

            {children}
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
