// Weekly schedule logic: which cook may take which slot, auto-assign, and warnings.
// Pure functions, no Firestore. Used by the board for highlighting, manual placement and auto-fill.
import { SCHEDULE_SHIFTS, SCHEDULE_STATIONS, SCHEDULE_STATION_INFO, slotKey, parseSlotKey, shiftKey, AVAIL } from '../data/schedule';

export const SENIOR_LEVEL = 7;

// All slots the template asks for, in board order.
export function allSlots(template) {
  const out = [];
  template.days.forEach((day, d) => {
    SCHEDULE_SHIFTS.forEach(({ id: shift }) => {
      SCHEDULE_STATIONS.forEach(station => {
        const n = Number(day?.[shift]?.[station] || 0);
        for (let i = 0; i < n; i++) out.push({ key: slotKey(d, shift, station, i), day: d, shift, station });
      });
    });
  });
  return out;
}

// assignments: { [slotKey]: { chefId, auto?, reason? } }
export function countFor(assignments, chefId) {
  return Object.values(assignments).filter(a => a?.chefId === chefId).length;
}

function cookShifts(assignments, chefId, ignoreKey) {
  const set = new Set();
  for (const [k, a] of Object.entries(assignments)) {
    if (k === ignoreKey || a?.chefId !== chefId) continue;
    const { day, shift } = parseSlotKey(k);
    set.add(shiftKey(day, shift));
  }
  return set;
}

/**
 * Why `chefId` can't take `slot` (null = allowed).
 * ctx: { profiles: {chefId: profile}, availability: {chefId: {shifts}}, assignments }
 */
export function blockReason(chefId, slot, ctx, ignoreKey = slot.key) {
  const profile = ctx.profiles[chefId];
  if (!profile || profile.inSchedule === false) return 'לא בסידור';
  if (!(profile.ratings?.[slot.station] > 0)) return 'לא עובד בפס הזה';
  const avail = ctx.availability[chefId];
  if (!avail) return 'לא הגיש משמרות';
  if (!(avail.shifts?.[shiftKey(slot.day, slot.shift)] > 0)) return 'סימן שלא יכול';
  const mine = cookShifts(ctx.assignments, chefId, ignoreKey);
  if (mine.has(shiftKey(slot.day, slot.shift))) return 'כבר משובץ במשמרת הזו';
  if (slot.shift === 'morning' && mine.has(shiftKey(slot.day - 1, 'evening'))) return 'סגר משמרת ערב יום קודם';
  if (slot.shift === 'evening' && mine.has(shiftKey(slot.day + 1, 'morning'))) return 'פותח משמרת בוקר למחרת';
  const max = Number(profile.max ?? 6);
  if (mine.size >= max) return `הגיע למקסימום (${max})`;
  return null;
}

export function availabilityOf(chefId, slot, ctx) {
  return ctx.availability[chefId]?.shifts?.[shiftKey(slot.day, slot.shift)] || AVAIL.NO;
}

const isWeekend = day => day >= 5;

// Score of a cook for a slot (higher = better). boosts: { chefId: { station: number } } from the AI note reading.
function score(chefId, slot, ctx, boosts) {
  const p = ctx.profiles[chefId];
  const count = countFor(ctx.assignments, chefId);
  let s = p.ratings[slot.station];
  if (availabilityOf(chefId, slot, ctx) === AVAIL.PREFER) s += 3;
  if (count < Number(p.min || 0)) s += 2;
  s -= count * 1.5;
  if (isWeekend(slot.day)) {
    const weekends = Object.entries(ctx.assignments).filter(([k, a]) => a?.chefId === chefId && isWeekend(parseSlotKey(k).day)).length;
    s -= weekends * 1.5;
  }
  s += Number(boosts?.[chefId]?.[slot.station] || 0);
  return s;
}

function reasonFor(chefId, slot, ctx) {
  const p = ctx.profiles[chefId];
  const parts = [`רמה ${p.ratings[slot.station]}`];
  if (availabilityOf(chefId, slot, ctx) === AVAIL.PREFER) parts.push('ביקש להעדיף');
  parts.push(`${countFor(ctx.assignments, chefId)}/${p.max ?? 6} משמרות`);
  return parts.join(' · ');
}

/**
 * Fill empty slots. Existing assignments (manual or earlier) are kept as they are.
 * Returns { assignments, filled: number, unfilled: slot[] }.
 */
export function autoAssign({ template, assignments, profiles, availability, boosts = {} }) {
  const result = { ...assignments };
  const ctx = { profiles, availability, assignments: result };
  const chefIds = Object.keys(profiles);
  let empty = allSlots(template).filter(s => !result[s.key]);
  const unfilled = [];
  let filled = 0;

  const candidates = slot => chefIds.filter(id => !blockReason(id, slot, ctx));
  while (empty.length) {
    // Hardest slot first: the one with the fewest possible cooks
    empty.sort((a, b) => candidates(a).length - candidates(b).length);
    const slot = empty.shift();
    const list = candidates(slot);
    if (!list.length) { unfilled.push(slot); continue; }
    list.sort((a, b) => score(b, slot, ctx, boosts) - score(a, slot, ctx, boosts) || a.localeCompare(b));
    const chefId = list[0];
    result[slot.key] = { chefId, auto: true, reason: '' };
    result[slot.key].reason = reasonFor(chefId, slot, ctx);
    filled++;
  }
  return { assignments: result, filled, unfilled };
}

/**
 * Warnings for the current board (manual or auto). Each: { level: 'error'|'warn', text, key? }
 */
export function scheduleWarnings({ template, assignments, profiles, availability, chefName = id => id }) {
  const out = [];
  const slots = allSlots(template);
  const ctx = { profiles, availability, assignments };
  const label = (d, shift) => `יום ${['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'][d]} ${SCHEDULE_SHIFTS.find(s => s.id === shift).name}`;

  for (const slot of slots) {
    const a = assignments[slot.key];
    if (!a) { out.push({ level: 'warn', key: slot.key, text: `${label(slot.day, slot.shift)}, ${SCHEDULE_STATION_INFO[slot.station]?.name}: לא משובץ` }); continue; }
    const why = blockReason(a.chefId, slot, ctx);
    if (why) out.push({ level: 'error', key: slot.key, text: `${chefName(a.chefId)} ב${label(slot.day, slot.shift)}: ${why}` });
  }
  // Each shift with people needs at least one senior cook
  for (let d = 0; d < 7; d++) {
    for (const { id: shift } of SCHEDULE_SHIFTS) {
      const here = slots.filter(s => s.day === d && s.shift === shift && assignments[s.key]);
      if (!here.length) continue;
      const hasSenior = here.some(s => {
        const p = profiles[assignments[s.key].chefId];
        return p && (p.senior || p.ratings?.[s.station] >= SENIOR_LEVEL);
      });
      if (!hasSenior) out.push({ level: 'warn', text: `${label(d, shift)}: אין טבח בכיר (רמה ${SENIOR_LEVEL}+)` });
    }
  }
  // Minimum shifts asked by the manager
  for (const [id, p] of Object.entries(profiles)) {
    if (p.inSchedule === false || !availability[id]) continue;
    const n = countFor(assignments, id);
    if (n < Number(p.min || 0)) out.push({ level: 'warn', text: `${chefName(id)}: ${n} משמרות, פחות מהמינימום (${p.min})` });
  }
  return out;
}

// ── Published schedule ──
// The published board is { slots: { [slotKey]: chefId }, publishedAt }.
export function publishedSlots(assignments) {
  return Object.fromEntries(Object.entries(assignments).filter(([, a]) => a?.chefId && !a.auto).map(([k, a]) => [k, a.chefId]));
}
// One cook's shifts in a published week, in order, with who else works that shift.
export function shiftsOf(slots, chefId) {
  const mine = Object.entries(slots || {}).filter(([, id]) => id === chefId).map(([key]) => parseSlotKey(key));
  const shiftOrder = { morning: 0, evening: 1 };
  return mine
    .sort((a, b) => a.day - b.day || shiftOrder[a.shift] - shiftOrder[b.shift])
    .map(s => ({
      ...s,
      mates: Object.entries(slots)
        .filter(([key, id]) => id !== chefId && key.startsWith(`${s.day}-${s.shift}-`))
        .map(([, id]) => id)
        .filter((id, i, all) => all.indexOf(id) === i),
    }));
}
