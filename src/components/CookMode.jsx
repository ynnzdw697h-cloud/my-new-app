import { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { formatClock, formatDuration } from '../data/cookSteps';

// Step-by-step cooking: one step at a time, big text, a timer when the step has a time.
// Timers keep running while you move to the next step.

function beep(ctxRef) {
  try { navigator.vibrate?.([300, 150, 300, 150, 600]); } catch (_) { /* ignore */ }
  const ctx = ctxRef.current;
  if (!ctx) return;
  try {
    [0, 0.45, 0.9].forEach(t => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.4);
    });
  } catch (_) { /* ignore */ }
}

export default function CookMode({ title, steps, color, onClose }) {
  const [idx, setIdx]       = useState(0);
  const [timers, setTimers] = useState({}); // { [step]: { endAt, left, done } }
  const [now, setNow]       = useState(Date.now());
  const [ringing, setRinging] = useState(null);
  const audioRef            = useRef(null);
  const timersRef           = useRef(timers);
  useEffect(() => { timersRef.current = timers; }, [timers]);

  const anyRunning = Object.values(timers).some(t => t.endAt);

  useEffect(() => {
    if (!anyRunning) return undefined;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const finished = Object.entries(timersRef.current).filter(([, v]) => v.endAt && v.endAt <= t);
      if (finished.length) {
        setTimers(prev => {
          const next = { ...prev };
          finished.forEach(([k]) => { next[k] = { ...next[k], endAt: null, left: 0, done: true }; });
          return next;
        });
        setRinging(Number(finished[0][0]));
        beep(audioRef);
      }
    }, 250);
    return () => clearInterval(id);
  }, [anyRunning]);

  // Keep ringing every 3 seconds until the cook taps the banner (stops by itself after 2 minutes)
  useEffect(() => {
    if (ringing === null) return undefined;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      if (n > 40) { clearInterval(id); return; }
      beep(audioRef);
    }, 3000);
    return () => clearInterval(id);
  }, [ringing]);

  const step  = steps[idx];
  const total = steps.length;
  const left  = i => {
    const t = timers[i];
    if (!t) return steps[i].seconds;
    return t.endAt ? Math.max(0, Math.ceil((t.endAt - now) / 1000)) : t.left;
  };

  function startTimer(i) {
    if (!audioRef.current) {
      try { audioRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { /* ignore */ }
    }
    audioRef.current?.resume?.();
    const secs = timers[i]?.left > 0 ? timers[i].left : steps[i].seconds;
    setNow(Date.now());
    setTimers(prev => ({ ...prev, [i]: { endAt: Date.now() + secs * 1000, left: secs, done: false } }));
    setRinging(null);
  }
  function pauseTimer(i) {
    setTimers(prev => ({ ...prev, [i]: { endAt: null, left: Math.max(0, Math.ceil((prev[i].endAt - Date.now()) / 1000)), done: false } }));
  }
  function resetTimer(i) {
    setTimers(prev => { const n = { ...prev }; delete n[i]; return n; });
    setRinging(null);
  }

  const running = Object.entries(timers).filter(([k, v]) => v.endAt && Number(k) !== idx);
  const t = timers[idx];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" dir="rtl" style={{ background: 'var(--bg)' }} role="dialog" aria-label="הכנה שלב אחרי שלב">
      <div className="h-14 flex items-center gap-2 px-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button type="button" onClick={onClose} aria-label="סגור" className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ color: 'var(--text)' }}>
          <X size={26} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-base truncate" style={{ color: 'var(--text-2)' }}>{title}</p>
          <p className="text-lg font-semibold leading-tight" style={{ color: 'var(--text)' }}>שלב {idx + 1} מתוך {total}</p>
        </div>
      </div>

      <div className="flex gap-1 px-3 pt-3 flex-shrink-0" aria-hidden="true">
        {steps.map((_, i) => (
          <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i <= idx ? color : 'rgba(255,255,255,0.12)' }} />
        ))}
      </div>

      {(ringing !== null || running.length > 0) && (
        <div className="px-3 pt-3 space-y-2 flex-shrink-0">
          {ringing !== null && (
            <button type="button" onClick={() => setRinging(null)} className="w-full min-h-[56px] rounded-xl text-lg font-semibold" style={{ background: 'rgba(245,158,11,0.18)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)' }}>
              הטיימר של שלב {ringing + 1} הסתיים. לחץ לסגירה
            </button>
          )}
          {running.map(([k, v]) => (
            <button key={k} type="button" onClick={() => setIdx(Number(k))} className="w-full min-h-[48px] rounded-xl flex items-center justify-between px-4 text-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <span className="flex items-center gap-2"><Timer size={18} /> שלב {Number(k) + 1} רץ</span>
              <span className="font-semibold tabular-nums" dir="ltr">{formatClock(Math.max(0, Math.ceil((v.endAt - now) / 1000)))}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <p className="leading-snug font-semibold" style={{ color: 'var(--text)', fontSize: 28 }}>{step.text}</p>
        {step.note && (
          <p className="mt-4 text-xl rounded-xl px-4 py-3" style={{ background: 'rgba(245,158,11,0.10)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.30)' }}>{step.note}</p>
        )}

        {step.seconds ? (
          <div className="mt-6 rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-base mb-1" style={{ color: 'var(--text-2)' }}>טיימר · {formatDuration(step.seconds)}</p>
            <p className="font-bold tabular-nums" dir="ltr" style={{ fontSize: 56, lineHeight: 1.1, color: t?.done ? '#fbbf24' : 'var(--text)' }}>{formatClock(left(idx))}</p>
            <div className="flex gap-2 mt-4">
              {t?.endAt ? (
                <button type="button" onClick={() => pauseTimer(idx)} className="flex-1 min-h-[56px] rounded-xl flex items-center justify-center gap-2 text-lg font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text)' }}>
                  <Pause size={22} /> עצור
                </button>
              ) : (
                <button type="button" onClick={() => startTimer(idx)} className="flex-1 min-h-[56px] rounded-xl flex items-center justify-center gap-2 text-lg font-semibold" style={{ background: color, color: '#fff' }}>
                  <Play size={22} /> {t && !t.done && t.left > 0 && t.left < step.seconds ? 'המשך' : 'הפעל טיימר'}
                </button>
              )}
              {t && (
                <button type="button" onClick={() => resetTimer(idx)} aria-label="אפס טיימר" className="w-14 min-h-[56px] rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text)' }}>
                  <RotateCcw size={22} />
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex gap-3 px-4 pt-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <button
          type="button"
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="flex-1 min-h-[64px] rounded-xl text-xl font-semibold disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text)' }}
        >הקודם</button>
        <button
          type="button"
          onClick={() => (idx === total - 1 ? onClose() : setIdx(i => i + 1))}
          className="flex-[2] min-h-[64px] rounded-xl text-xl font-semibold"
          style={{ background: color, color: '#fff' }}
        >{idx === total - 1 ? 'סיימתי' : 'הבא'}</button>
      </div>
    </div>
  );
}
