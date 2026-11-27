import { addDays } from './shifts';
import { CHEFS } from './chefs';
import { STATIONS } from './stations';

// Weekly work schedule (סידור עבודה).
// Separate from SHIFTS in shifts.js (used by the checklist / shift log): the schedule
// names the two shifts משמרת בוקר / משמרת ערב.
export const SCHEDULE_SHIFTS = [
  { id: 'morning', name: 'משמרת בוקר', short: 'בוקר', start: '07:45' },
  { id: 'evening', name: 'משמרת ערב',  short: 'ערב',  start: '14:45' },
];
// Usual arrival time of a shift ("07:45")
export const defaultStart = shiftId => SCHEDULE_SHIFTS.find(s => s.id === shiftId)?.start || '';
// Arrival time of a shift on one day: the day's own time if the managers changed it, else the usual one.
// times: { "<day>-<shiftId>": "HH:MM" }
export const shiftStart = (times, day, shiftId) => times?.[`${day}-${shiftId}`] || defaultStart(shiftId);
// "07:45" -> "7:45"
export const fmtTime = t => (t ? t.replace(/^0(\d)/, '$1') : '');
export const SCHEDULE_STATIONS = ['hot', 'cold', 'air', 'checker'];
// Station names/colors for the schedule. פס אוויר exists only in the schedule
// (not in the login station picker), so it is defined here and not in stations.js.
export const SCHEDULE_STATION_INFO = {
  hot:     { name: STATIONS.hot.name,     color: STATIONS.hot.color },
  cold:    { name: STATIONS.cold.name,    color: STATIONS.cold.color },
  air:     { name: 'פס אוויר',             color: '#8B5CF6' },
  checker: { name: STATIONS.checker.name, color: STATIONS.checker.color },
};
export const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const DAY_LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

// Availability values a cook submits for each shift
export const AVAIL = { NO: 0, CAN: 1, PREFER: 2 };
export const AVAIL_LABELS = ['לא יכול', 'יכול', 'מעדיף'];

// Cooks that can appear in the schedule (everyone who logs in with a PIN and works a station)
export const SCHEDULE_CHEFS = CHEFS.filter(c => c.role !== 'checker');

export function iso(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

// The Sunday (ISO yyyy-mm-dd) of the week that contains `date`. Weeks start on Sunday.
export function weekStartOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return iso(d);
}
export function nextWeekStart(date = new Date()) {
  return addDays(weekStartOf(date), 7);
}
export function weekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}
// "29.11–5.12"
export function weekLabel(weekStart) {
  const short = isoDay => { const [, m, d] = isoDay.split('-').map(Number); return `${d}.${m}`; };
  return `${short(weekStart)}–${short(addDays(weekStart, 6))}`;
}
export function shortDate(isoDay) {
  const [, m, d] = isoDay.split('-').map(Number);
  return `${d}.${m}`;
}

// Key of one shift in a week: "<dayIndex>-<shiftId>", e.g. "5-evening"
export const shiftKey = (dayIndex, shiftId) => `${dayIndex}-${shiftId}`;
// Key of one slot on the board: "<dayIndex>-<shiftId>-<station>-<n>"
export const slotKey = (dayIndex, shiftId, station, n) => `${dayIndex}-${shiftId}-${station}-${n}`;
export function parseSlotKey(key) {
  const [d, shift, station, n] = key.split('-');
  return { day: Number(d), shift, station, n: Number(n) };
}

// Default staffing: one cook per station in every shift. Managers change it on the template screen.
// Shape: { days: [ { morning: {hot, cold, air, checker}, evening: {...} } x7 ], deadline: { day, hour } }
export function defaultTemplate() {
  const shift = () => ({ hot: 1, cold: 1, air: 1, checker: 1 });
  return {
    days: Array.from({ length: 7 }, () => ({ morning: shift(), evening: shift() })),
    deadline: { day: 4, hour: 12 }, // Thursday 12:00, for the following week
  };
}

// Cook profile (manager only). ratings: station -> 1..10, missing = does not work that station.
export function defaultProfile() {
  return { ratings: {}, note: '', min: 0, max: 6, senior: false, inSchedule: true };
}

// ── Firestore locations ──
// Public (cooks read/write): tenants/{tenantId}/kitchen/{docId}
export const PUBLIC_DOCS = {
  availability: (week, chefId) => `shift_avail_${week}_${chefId}`, // { chefId, name, shifts: {"0-morning": 0|1|2}, wanted, note, submittedAt }
  published:    week           => `schedule_published_${week}`,   // { week, slots: { [slotKey]: chefId }, details: { [slotKey]: { time, note } }, times: { [shiftKey]: 'HH:MM' }, publishedAt }
  settings:     'schedule_settings',                                  // { deadline: {day, hour} }, copied from the manager template so cooks can see it
};
// Manager only: tenantsAdmin/{tenantId}/schedule/{docId}
export const ADMIN_DOCS = {
  profiles: 'profiles',                 // { [chefId]: profile }
  template: 'template',                 // defaultTemplate() shape
  draft:    week => `draft_${week}`,    // { assignments: { [slotKey]: { chefId, auto, reason, time, note } }, times: { [shiftKey]: 'HH:MM' }, updatedAt }
};

// ── Submission deadline ──
// The deadline for week `weekStart` is on `deadline.day` at `deadline.hour` in the week BEFORE it.
export function deadlineDate(weekStart, deadline = { day: 4, hour: 12 }) {
  const [y, m, d] = addDays(weekStart, -7 + Number(deadline.day ?? 4)).split('-').map(Number);
  return new Date(y, m - 1, d, Number(deadline.hour ?? 12), 0, 0);
}
// The week cooks submit for now: next week, or the week after once next week's deadline has passed.
export function submissionWeek(now = new Date(), deadline) {
  const next = nextWeekStart(now);
  return now < deadlineDate(next, deadline) ? next : addDays(next, 7);
}
// "חמישי 12:00"
export function deadlineLabel(deadline = { day: 4, hour: 12 }) {
  return `${DAY_NAMES[Number(deadline.day ?? 4)]} ${String(Number(deadline.hour ?? 12)).padStart(2, '0')}:00`;
}
