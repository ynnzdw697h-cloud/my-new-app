import { allSlots, autoAssign, blockReason, scheduleWarnings, countFor } from './scheduler';
import { defaultTemplate, defaultProfile, slotKey, parseSlotKey } from '../data/schedule';

const prof = (ratings, extra = {}) => ({ ...defaultProfile(), ratings, ...extra });
// availability helper: list of "d-shift" keys the cook can work; prefer list gets 2
const av = (can, prefer = []) => {
  const shifts = {};
  can.forEach(k => { shifts[k] = 1; });
  prefer.forEach(k => { shifts[k] = 2; });
  return { shifts };
};
const everyShift = () => Array.from({ length: 7 }, (_, d) => [`${d}-morning`, `${d}-evening`]).flat();

describe('allSlots', () => {
  it('default template has 4 stations x 2 shifts x 7 days', () => {
    expect(allSlots(defaultTemplate())).toHaveLength(56);
  });
});

describe('blockReason', () => {
  const slot = { key: slotKey(1, 'morning', 'hot', 0), day: 1, shift: 'morning', station: 'hot' };
  const base = { profiles: { a: prof({ hot: 8 }) }, availability: { a: av(['1-morning']) }, assignments: {} };

  it('allows an available cook who works the station', () => {
    expect(blockReason('a', slot, base)).toBeNull();
  });
  it('blocks a station the cook does not work', () => {
    expect(blockReason('a', { ...slot, station: 'cold' }, base)).toMatch('לא עובד');
  });
  it('blocks a shift marked as not available', () => {
    expect(blockReason('a', { ...slot, day: 2, key: slotKey(2, 'morning', 'hot', 0) }, base)).toMatch('לא יכול');
  });
  it('blocks a cook who did not submit', () => {
    expect(blockReason('a', slot, { ...base, availability: {} })).toMatch('לא הגיש');
  });
  it('blocks morning after closing the evening before', () => {
    const ctx = { ...base, availability: { a: av(['0-evening', '1-morning']) }, assignments: { [slotKey(0, 'evening', 'hot', 0)]: { chefId: 'a' } } };
    expect(blockReason('a', slot, ctx)).toMatch('סגר');
  });
  it('blocks two stations in the same shift', () => {
    const ctx = { ...base, profiles: { a: prof({ hot: 8, cold: 8 }) }, assignments: { [slotKey(1, 'morning', 'cold', 0)]: { chefId: 'a' } } };
    expect(blockReason('a', slot, ctx)).toMatch('כבר משובץ');
  });
  it('blocks over the maximum', () => {
    const ctx = { ...base, profiles: { a: prof({ hot: 8 }, { max: 1 }) }, availability: { a: av(['1-morning', '3-morning']) }, assignments: { [slotKey(3, 'morning', 'hot', 0)]: { chefId: 'a' } } };
    expect(blockReason('a', slot, ctx)).toMatch('מקסימום');
  });
});

describe('autoAssign', () => {
  const template = defaultTemplate();
  const profiles = {
    noa:  prof({ hot: 9, cold: 7, checker: 8 }),
    itay: prof({ hot: 8, cold: 5 }),
    maya: prof({ cold: 8, checker: 6 }),
    omer: prof({ checker: 9 }),
    ron:  prof({ hot: 6, cold: 6 }),
    tom:  prof({ cold: 5 }),
  };
  const availability = {
    noa: av(everyShift().filter((_, i) => i % 2 === 0)),
    itay: av(everyShift(), ['0-evening']),
    maya: av(everyShift()),
    omer: av(everyShift()),
    ron: av(everyShift().slice(0, 7)),
    // tom did not submit
  };

  it('never places anyone in a slot they cannot take', () => {
    const { assignments } = autoAssign({ template, assignments: {}, profiles, availability });
    for (const [k, a] of Object.entries(assignments)) {
      const slot = { key: k, ...parseSlotKey(k) };
      expect(blockReason(a.chefId, slot, { profiles, availability, assignments })).toBeNull();
    }
    expect(Object.values(assignments).some(a => a.chefId === 'tom')).toBe(false);
  });

  it('keeps manual placements and marks new ones as auto', () => {
    const manual = { [slotKey(0, 'evening', 'hot', 0)]: { chefId: 'itay', auto: false } };
    const { assignments } = autoAssign({ template, assignments: manual, profiles, availability });
    expect(assignments[slotKey(0, 'evening', 'hot', 0)]).toEqual({ chefId: 'itay', auto: false });
    expect(Object.values(assignments).filter(a => a.auto).every(a => a.reason)).toBe(true);
  });

  it('respects max shifts', () => {
    const { assignments } = autoAssign({ template, assignments: {}, profiles, availability });
    for (const id of Object.keys(profiles)) expect(countFor(assignments, id)).toBeLessThanOrEqual(profiles[id].max);
  });

  it('reports slots it could not fill', () => {
    const { filled, unfilled } = autoAssign({ template, assignments: {}, profiles, availability });
    expect(filled + unfilled.length).toBe(56);
    expect(unfilled.length).toBeGreaterThan(0); // 5 cooks x max 6 < 56
  });
});

describe('scheduleWarnings', () => {
  it('flags a manual placement that breaks a rule', () => {
    const template = { days: Array.from({ length: 7 }, (_, d) => (d === 0 ? { morning: { hot: 1 }, evening: {} } : { morning: {}, evening: {} })) };
    const profiles = { a: prof({ hot: 5 }) };
    const w = scheduleWarnings({ template, assignments: { [slotKey(0, 'morning', 'hot', 0)]: { chefId: 'a' } }, profiles, availability: { a: av([]) } });
    expect(w.some(x => x.level === 'error')).toBe(true);
    expect(w.some(x => x.text.includes('בכיר'))).toBe(true);
  });
});

describe('submission deadline', () => {
  const { deadlineDate, submissionWeek } = require('../data/schedule');
  const dl = { day: 4, hour: 12 }; // Thursday 12:00 of the week before
  it('deadline for week of Sun 6.12.2026 is Thu 3.12 at 12:00', () => {
    const d = deadlineDate('2026-12-06', dl);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()]).toEqual([2026, 12, 3, 12]);
  });
  it('before the deadline cooks submit for next week', () => {
    expect(submissionWeek(new Date(2026, 11, 3, 11, 59), dl)).toBe('2026-12-06');
  });
  it('after the deadline cooks submit for the week after', () => {
    expect(submissionWeek(new Date(2026, 11, 3, 12, 0), dl)).toBe('2026-12-13');
  });
});

describe('published schedule', () => {
  test('only approved placements are published', () => {
    const { publishedSlots } = require('./scheduler');
    expect(publishedSlots({ '0-morning-hot-0': { chefId: 'ofek' }, '0-morning-cold-0': { chefId: 'keshem', auto: true } }))
      .toEqual({ '0-morning-hot-0': 'ofek' });
  });
  test('a cook sees their shifts in order, with who else works', () => {
    const { shiftsOf } = require('./scheduler');
    const slots = { '2-evening-hot-0': 'ofek', '0-evening-cold-0': 'ofek', '0-evening-hot-0': 'keshem', '0-morning-hot-0': 'ofek', '2-morning-hot-0': 'keshem' };
    const mine = shiftsOf(slots, 'ofek');
    expect(mine.map(s => `${s.day}-${s.shift}-${s.station}`)).toEqual(['0-morning-hot', '0-evening-cold', '2-evening-hot']);
    expect(mine[1].mates).toEqual(['keshem']);
    expect(mine[2].mates).toEqual([]);
  });
});
