import { useEffect } from 'react';

// Scroll a just-opened item into view and outline it for a moment.
// Retries briefly, because the page transition and Firestore data may still be on the way.
export function useFocusFlash(id, onDone) {
  useEffect(() => {
    if (id == null) return;
    let tries = 0;
    let timer;
    const find = () => {
      const el = document.querySelector(`[data-focus-id="${CSS.escape(String(id))}"]`);
      if (!el && ++tries < 8) { timer = setTimeout(find, 250); return; }
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.style.transition = 'box-shadow 0.25s';
        el.style.boxShadow = 'inset 0 0 0 2px #3B82F6';
        setTimeout(() => { el.style.boxShadow = ''; }, 1600);
      }
      onDone?.();
    };
    timer = setTimeout(find, 350);
    return () => clearTimeout(timer);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
}
