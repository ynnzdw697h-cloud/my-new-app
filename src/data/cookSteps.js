// Helpers for step-by-step cooking (timers) — steps may be plain strings or { text, seconds, note }.

const UNIT_SECONDS = [
  [/^(שעות|שעה)$/, 3600],
  [/^(דקות|דקה|דק׳|דק')$/, 60],
  [/^(שניות|שנייה|שניה|שנ׳)$/, 1],
];

// Find the first duration written in the text: "8 דקות", "30 שניות", "2-3 דקות", "שעתיים"
export function detectSeconds(text = '') {
  if (/שעתיים/.test(text)) return 7200;
  const m = text.match(/(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*(שעות|שעה|דקות|דקה|דק׳|דק'|שניות|שנייה|שניה|שנ׳)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  const unit = UNIT_SECONDS.find(([re]) => re.test(m[2]));
  return unit ? Math.round(n * unit[1]) : null;
}

export function normalizeStep(s) {
  if (typeof s === 'string') return { text: s, seconds: detectSeconds(s), note: '' };
  const text = s?.text || '';
  return {
    text,
    seconds: s && 'seconds' in s ? (s.seconds || null) : detectSeconds(text),
    note: s?.note || '',
  };
}

export function formatClock(total) {
  const t = Math.max(0, Math.round(total));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Short label for chips: "8 דק׳", "30 שנ׳", "1:30 דק׳"
export function formatDuration(total) {
  if (total >= 3600 && total % 3600 === 0) return `${total / 3600} שעות`;
  if (total < 60) return `${total} שנ׳`;
  if (total % 60 === 0) return `${total / 60} דק׳`;
  return `${formatClock(total)} דק׳`;
}
