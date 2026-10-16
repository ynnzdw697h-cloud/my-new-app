import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTenantId } from '../context/TenantContext';
import { useFirestoreSet } from './useFirestoreSet';
import { useFirestoreArray } from './useFirestoreArray';
import { PREP_TASKS } from '../data/prepTasks';

// A kitchen "service day" rolls over at 04:00, so late closing shifts
// still count toward the day they started.
const DAY_ROLLOVER_HOUR = 4;

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getServiceDay(now = new Date()) {
  const d = new Date(now);
  if (d.getHours() < DAY_ROLLOVER_HOUR) d.setDate(d.getDate() - 1);
  return toISODate(d);
}

// Sunday that starts the service week containing `isoDay` (weekly tasks reset on it).
export function getWeekStart(isoDay) {
  const [y, m, d] = isoDay.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - date.getDay());
  return toISODate(date);
}

// 0 = Sunday … 6 = Saturday, for the service day.
export function getDayIndex(isoDay) {
  const [y, m, d] = isoDay.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

function previousDay(isoDay) {
  const [y, m, d] = isoDay.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d - 1));
}

// Re-checks the clock every minute so an open tablet resets itself overnight.
export function useServiceDay() {
  const [day, setDay] = useState(getServiceDay);
  useEffect(() => {
    const t = setInterval(() => setDay(getServiceDay()), 60_000);
    return () => clearInterval(t);
  }, []);
  return day;
}

// Single source of truth for prep progress. Counts every checkable item:
// a task without sub-items is one item, a task with sub-items counts each sub-item.
export function computePrepProgress(station, completedTasks, completedSubs, customTasks, hiddenIds) {
  const staticTasks = (PREP_TASKS[station] || []).filter(t => !hiddenIds.has(t.id));
  const allTasks    = [...staticTasks, ...customTasks];

  const isItemDone = id => completedTasks.has(id) || completedSubs.has(id);
  const isTaskDone = t => (t.subItems ? t.subItems.every(s => completedSubs.has(s.id)) : completedTasks.has(t.id));
  const itemIds    = tasks => tasks.flatMap(t => (t.subItems ? t.subItems.map(s => s.id) : [t.id]));

  const allIds = itemIds(allTasks);
  const done   = allIds.filter(isItemDone).length;
  const total  = allIds.length;
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0;

  const shiftProgress = shiftKey => {
    const tasks = allTasks.filter(t => t.shift === shiftKey);
    const ids   = itemIds(tasks);
    const d     = ids.filter(isItemDone).length;
    return { tasks, done: d, total: ids.length, pct: ids.length ? Math.round((d / ids.length) * 100) : 0 };
  };

  return {
    allTasks,
    done,
    total,
    pct,
    pendingTasks: allTasks.filter(t => !isTaskDone(t)),
    isTaskDone,
    shiftProgress,
  };
}

// Consecutive service days on which the station reached 100%.
function useStationStreak(station, day, pct) {
  const tenantId = useTenantId();
  const docId    = `prep_streak_${station}`;
  const [streak, setStreak] = useState({ count: 0, best: 0, lastDay: null });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!station) return;
    setLoaded(false);
    return onSnapshot(doc(db, 'tenants', tenantId, 'kitchen', docId), snap => {
      if (snap.exists()) setStreak({ count: 0, best: 0, lastDay: null, ...snap.data() });
      setLoaded(true);
    }, err => console.error('[Firestore] error on', docId, err.code, err.message));
  }, [tenantId, docId, station]);

  useEffect(() => {
    // Wait for the stored streak before extending it, or a cached 100% would reset it to 1.
    if (!loaded || !station || pct < 100 || streak.lastDay === day) return;
    const count = streak.lastDay === previousDay(day) ? streak.count + 1 : 1;
    const next  = { count, best: Math.max(streak.best || 0, count), lastDay: day };
    setStreak(next);
    setDoc(doc(db, 'tenants', tenantId, 'kitchen', docId), next)
      .catch(err => console.error('[Firestore] write FAILED:', docId, err.code, err.message));
  }, [loaded, pct, day, station, streak, tenantId, docId]);

  // A streak is alive if it was extended today or yesterday.
  const alive = streak.lastDay === day || streak.lastDay === previousDay(day);
  return {
    count:       alive ? streak.count : 0,
    best:        streak.best || 0,
    doneToday:   streak.lastDay === day,
  };
}

// Everything the prep screens need for one station, keyed by service day
// so the checklist starts clean every morning automatically.
export function usePrepState(station) {
  const day        = useServiceDay();
  const stationKey = station || 'init';

  const [completedTasks, setCompletedTasks] = useFirestoreSet(`prep_tasks_${stationKey}_${day}`);
  const [completedSubs,  setCompletedSubs]  = useFirestoreSet(`prep_subs_${stationKey}_${day}`);
  const [customTasks,    setCustomTasks]    = useFirestoreArray(`custom_prep_${stationKey}`);
  const [hiddenIds,      setHiddenIds]      = useFirestoreSet(`hidden_prep_${stationKey}`);

  const progress = computePrepProgress(station, completedTasks, completedSubs, customTasks, hiddenIds);
  const streak   = useStationStreak(station, day, progress.pct);

  const toggleTask = useCallback(id => {
    setCompletedTasks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, [setCompletedTasks]);

  const toggleSub = useCallback(id => {
    setCompletedSubs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, [setCompletedSubs]);

  const resetDay = useCallback(() => {
    setCompletedTasks(new Set());
    setCompletedSubs(new Set());
  }, [setCompletedTasks, setCompletedSubs]);

  return {
    day,
    completedTasks,
    completedSubs,
    customTasks,
    setCustomTasks,
    hiddenIds,
    setHiddenIds,
    toggleTask,
    toggleSub,
    resetDay,
    progress,
    streak,
  };
}
