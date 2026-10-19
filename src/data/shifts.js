import { getServiceDay } from '../hooks/usePrepState';

// The kitchen has two shifts, matching the checklist sections.
// Before SHIFT_CHANGE_HOUR it's the morning shift, after it the afternoon shift.
export const SHIFT_CHANGE_HOUR = 16;
export const SHIFTS = ['בוקר', 'צהריים'];

export function getCurrentShift(now = new Date()) {
  const h = now.getHours();
  // 00:00–04:00 still belongs to yesterday's afternoon shift (service day rolls over at 04:00).
  return h >= SHIFT_CHANGE_HOUR || h < 4 ? 'צהריים' : 'בוקר';
}

// Service day + shift that something created at `ms` (a Date.now() id) belongs to.
export function slotOf(ms) {
  const d = new Date(ms);
  return { day: getServiceDay(d), shift: getCurrentShift(d) };
}

export function shiftOf(ms) {
  return getCurrentShift(new Date(ms));
}

export function addDays(isoDay, n) {
  const [y, m, d] = isoDay.split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

// The shift that came right before (day, shift).
export function previousSlot(day, shift) {
  return shift === 'צהריים' ? { day, shift: 'בוקר' } : { day: addDays(day, -1), shift: 'צהריים' };
}

// "יום ב׳ · 19.10"
const DAY_LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
export function dayLabel(isoDay) {
  const [y, m, d] = isoDay.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `יום ${DAY_LETTERS[date.getDay()]} · ${d}.${m}`;
}

export function nowLabel() {
  return new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

// Firestore doc ids (under tenants/{tenantId}/kitchen/), all used with useFirestoreArray.
export const LOG_DOCS = {
  faults:        'equipment_faults',                   // [{ id, text, author, time, day, shift, status: 'open'|'fixed', fixedBy, fixedTime, fixedDay }]
  handoverReads: (day, shift) => `handover_reads_${day}_${shift}`, // [{ name, time }]
  temps:         (station, day) => `prep_temps_${station}_${day}`, // [{ taskId, value, min, max, by, time, outOfRange }]
  announcements: 'announcements',                      // [{ id, text, author, time, day, seenBy: [{ name, time }], removed?: true }]
};
