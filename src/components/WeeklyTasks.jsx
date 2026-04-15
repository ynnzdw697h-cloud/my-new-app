import { useState } from 'react';
import { CalendarDays, RotateCcw, Calendar } from 'lucide-react';
import { WEEKLY_TASKS, DAYS, CATEGORIES } from '../data/weeklyTasks';
import { STATIONS } from '../data/stations';
import { useFirestoreSet } from '../hooks/useFirestoreSet';
import { Card, Button, Chip, EmptyState } from './ui';
import { useHaptic } from '../hooks/useHaptic';

export default function WeeklyTasks({ station }) {
  const [completedWeekly, setCompletedWeekly] = useFirestoreSet(`weekly_${station}`);
  const [dayFilter, setDayFilter]             = useState('הכל');
  const [catFilter, setCatFilter]             = useState('הכל');
  const [stationFilter, setStationFilter]     = useState('הכל');
  const vibrate = useHaptic();

  const st = STATIONS[station];

  function toggleTask(id) {
    vibrate();
    setCompletedWeekly(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allDays     = ['הכל', ...DAYS];
  const allStations = ['הכל', ...Object.values(STATIONS).map(s => s.name)];
  const stationById = Object.fromEntries(Object.values(STATIONS).map(s => [s.id, s]));

  const filtered = WEEKLY_TASKS.filter(t => {
    const matchDay = dayFilter === 'הכל' || t.day === dayFilter;
    const matchCat = catFilter === 'הכל' || t.category === catFilter;
    const matchSt  = stationFilter === 'הכל' || stationById[t.assignedTo]?.name === stationFilter;
    return matchDay && matchCat && matchSt;
  });

  const done = WEEKLY_TASKS.filter(t => completedWeekly.has(t.id)).length;
  const pct  = WEEKLY_TASKS.length ? Math.round((done / WEEKLY_TASKS.length) * 100) : 0;

  return (
    <div className="p-5 md:p-6 space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-h1 text-text-primary flex items-center gap-2 mb-1">
            <CalendarDays size={20} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.4)' }} />
            משימות שבועיות
          </h2>
          <p className="text-body text-text-tertiary">ניקוי ותחזוקה שוטפת</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={() => { vibrate(20); setCompletedWeekly(new Set()); }}
          >
            איפוס
          </Button>
          <div className="text-left">
            <div className="text-meta text-text-tertiary">הושלמו השבוע</div>
            <div className="text-display font-black" style={{ color: st.color }}>{pct}%</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <Card padded={false}>
        <div className="px-5 py-4">
          <div className="flex justify-between text-label mb-3">
            <span className="text-text-primary font-bold">{done} הושלמו</span>
            <span className="text-text-tertiary">{WEEKLY_TASKS.length - done} נותרו</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: st.color, boxShadow: `0 0 8px ${st.color}55` }}
            />
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="space-y-3">
        <FilterRow label="יום"      options={allDays}     value={dayFilter}     onChange={setDayFilter}     color={st.color} />
        <FilterRow label="קטגוריה" options={CATEGORIES}  value={catFilter}     onChange={setCatFilter}     color={st.color} />
        <FilterRow label="תחנה"    options={allStations} value={stationFilter} onChange={setStationFilter} color={st.color} />
      </div>

      {/* Task groups */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="לא נמצאו משימות"
          description="שנה את הפילטרים לראות משימות"
        />
      ) : dayFilter === 'הכל' ? (
        DAYS.map(day => {
          const dayTasks = filtered.filter(t => t.day === day);
          if (!dayTasks.length) return null;
          return (
            <DayGroup key={day} day={day} tasks={dayTasks}
              completedWeekly={completedWeekly} onToggle={toggleTask} stationById={stationById} />
          );
        })
      ) : (
        <DayGroup day={dayFilter} tasks={filtered}
          completedWeekly={completedWeekly} onToggle={toggleTask} stationById={stationById} />
      )}
    </div>
  );
}

function FilterRow({ label, options, value, onChange, color }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-label text-text-tertiary w-16 flex-shrink-0">{label}:</span>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className="px-3 h-8 rounded-xl text-label font-semibold transition-all duration-150 active:scale-95 press"
            style={
              value === opt
                ? { background: color, color: '#0E0E0E' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.08)' }
            }
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function DayGroup({ day, tasks, completedWeekly, onToggle, stationById }) {
  if (!tasks.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-h3 text-text-primary flex items-center gap-2 px-1">
        <Calendar size={15} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.3)' }} />
        {day}
        <span className="text-meta text-text-tertiary font-normal">({tasks.length})</span>
      </h3>
      <div className="space-y-2">
        {tasks.map(task => {
          const isDone      = completedWeekly.has(task.id);
          const taskStation = stationById[task.assignedTo];
          return (
            <Card
              key={task.id}
              tappable
              stationColor={taskStation?.color}
              onClick={() => onToggle(task.id)}
              className={isDone ? 'opacity-50' : ''}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 border-2 flex items-center justify-center mt-0.5 transition-all duration-200"
                  style={isDone
                    ? { backgroundColor: taskStation?.color, borderColor: taskStation?.color }
                    : { borderColor: 'rgba(255,255,255,0.25)' }
                  }
                >
                  {isDone && (
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="#0E0E0E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-body font-semibold ${isDone ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
                    {task.task}
                  </p>
                  {task.notes && (
                    <p className="text-meta text-text-tertiary mt-1">{task.notes}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    {taskStation && (
                      <Chip variant="station" stationColor={taskStation.color}>
                        {taskStation.name}
                      </Chip>
                    )}
                    <Chip>{task.category}</Chip>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
