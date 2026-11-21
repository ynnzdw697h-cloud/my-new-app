import { useEffect, useRef } from 'react';

/**
 * useBackClose(open, onClose)
 *
 * Makes the phone's "back" button close whatever is open (a screen, a recipe,
 * the search, a bottom sheet) instead of leaving the app.
 *
 * While `open` is true we keep one browser-history entry for it. Pressing
 * back removes that entry and calls onClose. If the layer is closed in the
 * app instead (a button), we remove the entry ourselves, so history never
 * piles up. One shared stack handles several open layers at once.
 */

let stack = [];          // open layers, last one is on top: { onClose, dead }
let pendingBacks = 0;    // history.back() calls we made and still wait for
let queue = [];          // actions waiting for pendingBacks to reach 0
let listening = false;

function run(action) {
  if (pendingBacks > 0) queue.push(action);
  else action();
}

function flush() {
  while (pendingBacks === 0 && queue.length) queue.shift()();
}

function goBack(times) {
  for (let i = 0; i < times; i++) {
    pendingBacks += 1;
    window.history.back();
  }
}

function onPopState() {
  if (pendingBacks > 0) {
    pendingBacks -= 1;
    flush();
    return;
  }
  const top = stack.pop();
  if (!top) return;
  if (top.dead) { goBack(1); return; } // skip a layer that was already closed in the app
  top.onClose();
}

function ensureListener() {
  if (listening) return;
  window.addEventListener('popstate', onPopState);
  listening = true;
}

export function useBackClose(open, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    ensureListener();
    const layer = { onClose: () => closeRef.current?.(), dead: false };
    let pushed = false;

    // Delay by a tick so React StrictMode's test mount/unmount does nothing.
    const timer = setTimeout(() => {
      run(() => {
        stack.push(layer);
        window.history.pushState({ layer: true }, '');
        pushed = true;
      });
    }, 0);

    return () => {
      clearTimeout(timer);
      run(() => {
        if (!pushed) return;
        const i = stack.indexOf(layer);
        if (i === -1) return; // already removed by the back button
        if (i !== stack.length - 1) { layer.dead = true; return; } // not on top: mark it, skipped later
        stack.pop();
        let extra = 0;
        while (stack.length && stack[stack.length - 1].dead) { stack.pop(); extra += 1; }
        goBack(1 + extra);
      });
    };
  }, [open]);
}
