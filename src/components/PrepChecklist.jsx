import { STATIONS } from '../data/stations';
import { PREP_TASKS } from '../data/prepTasks';
import { useLocalStorageSet } from '../hooks/useLocalStorageSet';

const SHIFTS = ['הכנות בוקר', 'הכנות צהריים'];
const SHIFT_KEYS = { 'הכנות בוקר': 'בוקר', 'הכנות צהריים': 'צהריים' };
const SHIFT_ICONS = { 'הכנות בוקר': '🌅', 'הכנות צהריים': '☀️' };

export default function PrepChecklist({ station, completedTasks, onToggle, onReset }) {
  const [completedSubs, setCompletedSubs] = useLocalStorageSet(`kitchen_prep_subs_${station}`);

  const st = STATIONS[station];
  const tasks = PREP_TASKS[station] || [];

  // ── Progress: count every checkbox (parent + sub-items) ──
  const allIds = tasks.flatMap(t => t.subItems ? t.subItems.map(s => s.id) : [t.id]);
  const doneCount = allIds.filter(id => completedTasks.has(id) || completedSubs.has(id)).length;
  const pct = allIds.length > 0 ? Math.round((doneCount / allIds.length) * 100) : 0;

  // Parent-level done count for the summary line
  const parentDone = tasks.filter(t =>
    t.subItems ? t.subItems.every(s => completedSubs.has(s.id)) : completedTasks.has(t.id)
  ).length;

  function toggleSub(id) {
    setCompletedSubs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleReset() {
    setCompletedSubs(new Set());
    onReset();
  }

  const applyFilter = (list) => list;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5" dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <span>📋</span> צ׳ק ליסט יומי
          </h2>
          <p className="text-slate-400 mt-1">{st.emoji} {st.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 border border-slate-700
                       text-slate-400 hover:text-white hover:border-slate-500 transition-all duration-150"
          >
            🔄 איפוס יום
          </button>
          <div
            className="px-5 py-3 rounded-2xl border text-left"
            style={{ borderColor: st.color + '50', backgroundColor: st.color + '15' }}
          >
            <div className="text-slate-400 text-xs mb-0.5">התקדמות</div>
          <div className="text-4xl font-black leading-none" style={{ color: st.color }}>{pct}%</div>
          </div>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
        <div className="flex justify-between items-end mb-3">
          <div>
            <span className="text-white font-bold text-lg">{parentDone}</span>
            <span className="text-slate-400 text-sm"> / {tasks.length} משימות הושלמו</span>
          </div>
          <span className="text-slate-500 text-sm">{doneCount} / {allIds.length} סה״כ</span>
        </div>
        <div className="relative h-5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 right-0 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, backgroundColor: st.color }}
          />
          {allIds.map((_, i) => {
            const pos = ((i + 1) / allIds.length) * 100;
            return (
              <div
                key={i}
                className="absolute inset-y-0 w-px bg-slate-900 opacity-30"
                style={{ right: `${pos}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-slate-600 text-xs">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>

      {/* ── Shift Sections ── */}
      {SHIFTS.map(shiftLabel => {
        const shiftKey = SHIFT_KEYS[shiftLabel];
        const shiftTasks = applyFilter(tasks.filter(t => t.shift === shiftKey));
        if (shiftTasks.length === 0) return null;

        const shiftAllIds = shiftTasks.flatMap(t => t.subItems ? t.subItems.map(s => s.id) : [t.id]);
        const shiftDone = shiftAllIds.filter(id => completedTasks.has(id) || completedSubs.has(id)).length;
        const shiftPct = shiftAllIds.length > 0 ? Math.round((shiftDone / shiftAllIds.length) * 100) : 0;

        return (
          <section key={shiftLabel}>
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{SHIFT_ICONS[shiftLabel]}</span>
              <div>
                <h3 className="text-white font-black text-xl">{shiftLabel}</h3>
                <span className="text-slate-500 text-xs">{shiftDone}/{shiftAllIds.length} פריטים • {shiftPct}%</span>
              </div>
              {shiftPct === 100 && (
                <span className="mr-auto text-xs font-bold text-emerald-400 bg-emerald-900 px-3 py-1 rounded-xl">
                  ✓ הושלם
                </span>
              )}
            </div>

            {/* Thin shift progress */}
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-4">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${shiftPct}%`, backgroundColor: st.color }}
              />
            </div>

            {/* Task Cards */}
            <div className="space-y-3">
              {shiftTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isDone={task.subItems
                    ? task.subItems.every(s => completedSubs.has(s.id))
                    : completedTasks.has(task.id)
                  }
                  completedSubs={completedSubs}
                  stationColor={st.color}
                  onToggle={() => !task.subItems && onToggle(task.id)}
                  onToggleSub={toggleSub}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* ── Completion Banner ── */}
      {pct === 100 && (
        <div className="bg-emerald-900 border border-emerald-600 rounded-2xl p-6 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <div className="text-emerald-300 font-black text-2xl">כל המשימות הושלמו!</div>
          <div className="text-emerald-400 text-sm mt-2">עבודה מעולה! הפריפ היומי הושלם.</div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, isDone, completedSubs, stationColor, onToggle, onToggleSub }) {
  const hasSubItems = !!task.subItems;

  return (
    <div
      className={`bg-slate-800 border rounded-2xl overflow-hidden transition-all duration-200
        ${isDone ? 'border-slate-700 opacity-60' : 'border-slate-700 hover:border-slate-600'}`}
    >
      {/* Category label */}
      <div className="flex items-center gap-2 px-5 pt-3 pb-1">
        <span className="text-base">{task.categoryIcon}</span>
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: stationColor + 'cc' }}
        >
          {task.category}
        </span>
      </div>

      {/* Main row */}
      <div
        className={`flex items-start gap-4 px-5 pb-4 pt-1 select-none ${!hasSubItems ? 'cursor-pointer' : ''}`}
        onClick={!hasSubItems ? onToggle : undefined}
      >
        {/* Large Checkbox */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-200 mt-0.5"
          style={isDone
            ? { backgroundColor: stationColor, borderColor: stationColor }
            : { borderColor: '#475569' }
          }
        >
          {isDone && (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-base leading-snug ${isDone ? 'line-through text-slate-500' : 'text-white'}`}>
            {task.task}
          </div>
          {task.details ? (
            <div className="text-slate-400 text-sm mt-0.5">{task.details}</div>
          ) : null}
          <div className="text-slate-600 text-xs mt-1">⏱ {task.estimatedTime}</div>
        </div>

      </div>

      {/* Sub-items */}
      {hasSubItems && (
        <div className="border-t border-slate-700 mx-5 mb-4 pt-3">
          <div className="grid grid-cols-2 gap-2">
            {task.subItems.map(sub => {
              const subDone = completedSubs.has(sub.id);
              return (
                <div
                  key={sub.id}
                  onClick={() => onToggleSub(sub.id)}
                  className={`flex items-center gap-2.5 cursor-pointer select-none rounded-xl px-3 py-2.5
                    transition-all duration-150
                    ${subDone ? 'bg-slate-700/40' : 'bg-slate-700/70 hover:bg-slate-700'}`}
                >
                  {/* Sub checkbox */}
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200"
                    style={subDone
                      ? { backgroundColor: stationColor, borderColor: stationColor }
                      : { borderColor: '#475569' }
                    }
                  >
                    {subDone && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`flex-1 font-medium text-sm ${subDone ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {sub.label}
                  </span>
                  {sub.unit ? (
                    <span
                      className="text-xs px-2 py-0.5 rounded-lg font-medium flex-shrink-0"
                      style={{ backgroundColor: stationColor + '20', color: stationColor }}
                    >
                      {sub.unit}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
