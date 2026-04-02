import { useState } from 'react';
import { WEEKLY_TASKS, DAYS, CATEGORIES } from '../data/weeklyTasks';
import { STATIONS } from '../data/stations';
import { useFirestoreSet } from '../hooks/useFirestoreSet';

export default function WeeklyTasks({ station }) {
  const [completedWeekly, setCompletedWeekly] = useFirestoreSet(`weekly_${station}`);
  const [dayFilter, setDayFilter] = useState('הכל');
  const [catFilter, setCatFilter] = useState('הכל');
  const [stationFilter, setStationFilter] = useState('הכל');

  const st = STATIONS[station];

  function toggleTask(id) {
    setCompletedWeekly(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allDays = ['הכל', ...DAYS];
  const allStations = ['הכל', ...Object.values(STATIONS).map(s => s.name)];
  const stationById = Object.fromEntries(Object.values(STATIONS).map(s => [s.id, s]));

  const filtered = WEEKLY_TASKS.filter(t => {
    const matchDay = dayFilter === 'הכל' || t.day === dayFilter;
    const matchCat = catFilter === 'הכל' || t.category === catFilter;
    const matchSt = stationFilter === 'הכל' || stationById[t.assignedTo]?.name === stationFilter;
    return matchDay && matchCat && matchSt;
  });

  const done = WEEKLY_TASKS.filter(t => completedWeekly.has(t.id)).length;
  const pct = Math.round((done / WEEKLY_TASKS.length) * 100);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-1">
            <span>📅</span> משימות שבועיות
          </h2>
          <p className="text-slate-400">ניקוי ותחזוקה שוטפת</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCompletedWeekly(new Set())}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 border border-slate-700
                       text-slate-400 hover:text-white hover:border-slate-500 transition-all duration-150"
          >
            🔄 איפוס שבוע
          </button>
          <div className="text-left">
            <div className="text-slate-400 text-sm">הושלמו השבוע</div>
            <div className="text-3xl font-black" style={{ color: st.color }}>{pct}%</div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
        <div className="flex justify-between text-sm text-slate-400 mb-3">
          <span className="font-medium text-white">{done} הושלמו</span>
          <span>{WEEKLY_TASKS.length - done} נותרו</span>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: st.color }}
          ></div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <FilterRow label="יום" options={allDays} value={dayFilter} onChange={setDayFilter} color={st.color} />
        <FilterRow label="קטגוריה" options={CATEGORIES} value={catFilter} onChange={setCatFilter} color={st.color} />
        <FilterRow label="תחנה" options={allStations} value={stationFilter} onChange={setStationFilter} color={st.color} />
      </div>

      {/* Tasks by Day */}
      {dayFilter === 'הכל' ? (
        DAYS.map(day => {
          const dayTasks = filtered.filter(t => t.day === day);
          if (dayTasks.length === 0) return null;
          return (
            <DayGroup
              key={day}
              day={day}
              tasks={dayTasks}
              completedWeekly={completedWeekly}
              onToggle={toggleTask}
              stationById={stationById}
            />
          );
        })
      ) : (
        <DayGroup
          day={dayFilter}
          tasks={filtered}
          completedWeekly={completedWeekly}
          onToggle={toggleTask}
          stationById={stationById}
        />
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <div className="text-4xl mb-3">📅</div>
          <div>לא נמצאו משימות</div>
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, options, value, onChange, color }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-slate-400 text-sm w-16 flex-shrink-0">{label}:</span>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
              ${value === opt
                ? 'text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            style={value === opt ? { backgroundColor: color } : {}}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function DayGroup({ day, tasks, completedWeekly, onToggle, stationById }) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
        <span className="text-slate-500">📆</span> {day}
        <span className="text-slate-500 text-sm font-normal">({tasks.length} משימות)</span>
      </h3>
      <div className="space-y-3">
        {tasks.map(task => {
          const isDone = completedWeekly.has(task.id);
          const taskStation = stationById[task.assignedTo];
          return (
            <div
              key={task.id}
              onClick={() => onToggle(task.id)}
              className={`bg-slate-800 border rounded-2xl px-5 py-4 cursor-pointer transition-all duration-200
                          ${isDone ? 'opacity-50 border-slate-700' : 'border-slate-700 hover:border-slate-600'}`}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 border-2 flex items-center justify-center mt-0.5"
                  style={isDone
                    ? { backgroundColor: taskStation?.color, borderColor: taskStation?.color }
                    : { borderColor: '#475569' }
                  }
                >
                  {isDone && <span className="text-white text-xs font-bold">✓</span>}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${isDone ? 'line-through text-slate-500' : 'text-white'}`}>
                    {task.task}
                  </div>
                  {task.notes && (
                    <div className="text-slate-500 text-sm mt-1">{task.notes}</div>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {/* Station badge */}
                    {taskStation && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-lg font-medium"
                        style={{ backgroundColor: taskStation.color + '25', color: taskStation.color }}
                      >
                        {taskStation.emoji} {taskStation.name}
                      </span>
                    )}
                    {/* Category */}
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-700 text-slate-400">
                      {task.category}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
