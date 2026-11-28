import { CHEFS } from './chefs';
import { SCHEDULE_CHEFS } from './schedule';

// The team list kept in the database (managed from "סידור עבודה" > "צוות") replaces the
// built-in list in memory. It runs once after login, before the app screens are shown,
// and edits the two shared arrays in place so every screen sees the same people.
//   list: [{ id, displayName, stations, admin, active }]
export function applyRoster(list) {
  for (const c of list || []) {
    const i = CHEFS.findIndex(x => x.id === c.id);
    if (c.active === false) {
      if (i >= 0) CHEFS.splice(i, 1);
      continue;
    }
    const entry = {
      id: c.id,
      displayName: c.displayName,
      emoji: CHEFS[i]?.emoji || '👨‍🍳',
      role: c.admin ? 'admin' : 'chef',
      stations: c.stations && c.stations.length ? c.stations : ['hot', 'cold'],
    };
    if (i >= 0) CHEFS[i] = entry; else CHEFS.push(entry);
  }
  SCHEDULE_CHEFS.splice(0, SCHEDULE_CHEFS.length, ...CHEFS.filter(c => c.role !== 'checker'));
}
