import { STATIONS } from '../data/stations';
import { PREP_TASKS } from '../data/prepTasks';
import { RECIPES } from '../data/recipes';
import { WEEKLY_TASKS } from '../data/weeklyTasks';

export default function Dashboard({ station, completedTasks, onNavigate }) {
  const st = STATIONS[station];
  const myTasks = PREP_TASKS[station] || [];
  const done = myTasks.filter(t => completedTasks.has(t.id)).length;
  const total = myTasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const myRecipes = RECIPES.filter(r => r.station === station);
  const myWeekly = WEEKLY_TASKS.filter(t => t.assignedTo === station);

  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      {/* Welcome Header */}
      <div
        className="rounded-2xl p-4 md:p-6 border"
        style={{ borderColor: st.color + '40', background: `linear-gradient(135deg, ${st.color}15, ${st.color}05)` }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-3xl mb-1">{st.emoji}</div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              שלום, <span style={{ color: st.color }}>{st.name}</span>
            </h1>
            <p className="text-slate-400 mt-1 text-sm">{today}</p>
          </div>
          <div className="text-left">
            <div className="text-slate-400 text-sm mb-1">התקדמות יומית</div>
            <div className="text-4xl md:text-5xl font-black" style={{ color: st.color }}>{pct}%</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>{done} מתוך {total} משימות הושלמו</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: st.color }}
            ></div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon="📋"
          label="משימות פריפ"
          value={`${done}/${total}`}
          sub="הושלמו היום"
          color={st.color}
          onClick={() => onNavigate('prep')}
        />
        <StatCard
          icon="📖"
          label="מתכונים"
          value={myRecipes.length}
          sub="במאגר שלך"
          color={st.color}
          onClick={() => onNavigate('recipes')}
        />
        <StatCard
          icon="📅"
          label="משימות שבועיות"
          value={myWeekly.length}
          sub="השבוע"
          color={st.color}
          onClick={() => onNavigate('weekly')}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Next pending tasks */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span>📋</span> משימות ממתינות
          </h3>
          <div className="space-y-2">
            {myTasks
              .filter(t => !completedTasks.has(t.id))
              .slice(0, 4)
              .map(task => (
                <div key={task.id} className="flex items-center justify-between bg-slate-700 rounded-xl px-4 py-2.5 gap-2">
                  <span className="text-slate-300 text-sm min-w-0 truncate">{task.task}</span>
                  <span className="text-slate-400 text-xs font-medium bg-slate-600 px-2 py-0.5 rounded-lg flex-shrink-0">
                    {task.estimatedTime}
                  </span>
                </div>
              ))}
            {myTasks.filter(t => !completedTasks.has(t.id)).length === 0 && (
              <div className="text-emerald-400 text-sm flex items-center gap-2 py-2">
                <span>✅</span> כל המשימות הושלמו!
              </div>
            )}
          </div>
        </div>

        {/* All stations status */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span>📊</span> סטטוס כל התחנות
          </h3>
          <div className="space-y-3">
            {Object.values(STATIONS).map(s => {
              const tasks = PREP_TASKS[s.id] || [];
              const doneCount = tasks.filter(t => completedTasks.has(t.id)).length;
              const totalCount = tasks.length;
              const p = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
              return (
                <div key={s.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 flex items-center gap-1">
                      {s.emoji} {s.name}
                    </span>
                    <span className="text-slate-400">{p}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${p}%`, backgroundColor: s.color }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-slate-800 border border-slate-700 rounded-2xl p-5 text-right
                 hover:border-slate-600 hover:bg-slate-750 transition-all duration-150 w-full group"
    >
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-3xl font-black text-white mb-1" style={{ color }}>{value}</div>
      <div className="text-slate-300 font-medium text-sm">{label}</div>
      <div className="text-slate-500 text-xs mt-0.5">{sub}</div>
    </button>
  );
}
