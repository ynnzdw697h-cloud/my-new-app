import { STATIONS } from '../data/stations';
import { PREP_TASKS } from '../data/prepTasks';
import { RECIPES } from '../data/recipes';
import { WEEKLY_TASKS } from '../data/weeklyTasks';

export default function Dashboard({ station, user, completedTasks, onNavigate }) {
  const st = STATIONS[station];
  const myTasks = PREP_TASKS[station] || [];
  const done  = myTasks.filter(t => completedTasks.has(t.id)).length;
  const total = myTasks.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const myRecipes = RECIPES.filter(r => r.station === station);
  const myWeekly  = WEEKLY_TASKS.filter(t => t.assignedTo === station);

  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const pendingTasks = myTasks.filter(t => !completedTasks.has(t.id));

  return (
    <div className="px-4 py-5 space-y-4 max-w-xl mx-auto" dir="rtl">

      {/* ── Hero card ── */}
      <div
        className="relative rounded-3xl overflow-hidden p-6"
        style={{
          background: `linear-gradient(135deg, ${st.color}28 0%, ${st.color}0a 60%, #16161e 100%)`,
          border: `1px solid ${st.color}30`,
          boxShadow: `0 8px 40px ${st.color}18`,
        }}
      >
        {/* Glow blob */}
        <div
          className="absolute -top-8 -left-8 w-40 h-40 rounded-full opacity-20 pointer-events-none"
          style={{ background: st.color, filter: 'blur(50px)' }}
        />

        <div className="relative z-10">
          <p className="text-sm font-medium mb-1" style={{ color: st.color + 'bb' }}>{today}</p>
          <h1 className="text-3xl font-black text-white leading-tight">
            שלום, {user} {st.emoji}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {st.name} — {done === total && total > 0 ? 'כל המשימות הושלמו 🎉' : `נותרו ${total - done} משימות`}
          </p>

          {/* Progress */}
          <div className="mt-5">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {done} / {total} משימות
              </span>
              <span className="text-4xl font-black" style={{ color: st.color, lineHeight: 1 }}>
                {pct}%
              </span>
            </div>
            <div
              className="h-2 w-full rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${st.color}cc, ${st.color})`,
                  boxShadow: `0 0 12px ${st.color}80`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat row ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="משימות"
          value={`${done}/${total}`}
          sub="פריפ"
          color={st.color}
          onClick={() => onNavigate('prep')}
        />
        <StatCard
          label="מתכונים"
          value={myRecipes.length}
          sub="במאגר"
          color={st.color}
          onClick={() => onNavigate('recipes')}
        />
        <StatCard
          label="שבועי"
          value={myWeekly.length}
          sub="משימות"
          color={st.color}
          onClick={() => onNavigate('weekly')}
        />
      </div>

      {/* ── Pending tasks ── */}
      <SectionCard title="משימות ממתינות" icon="⏳" onClick={() => onNavigate('prep')}>
        {pendingTasks.length === 0 ? (
          <div
            className="flex items-center gap-3 py-3 px-1 rounded-2xl"
          >
            <span className="text-2xl">✅</span>
            <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
              כל המשימות הושלמו!
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingTasks.slice(0, 5).map(task => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-2xl px-4 py-3 gap-2"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <span className="text-sm font-medium text-white truncate">{task.task}</span>
                {task.estimatedTime && (
                  <span
                    className="text-xs flex-shrink-0 rounded-xl px-2.5 py-1 font-semibold"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}
                  >
                    {task.estimatedTime}
                  </span>
                )}
              </div>
            ))}
            {pendingTasks.length > 5 && (
              <p className="text-center text-xs pt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                + עוד {pendingTasks.length - 5} משימות
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {/* ── Quick actions ── */}
      <div>
        <p className="text-xs font-bold mb-3 px-1" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
          פעולות נוספות
        </p>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            emoji="🐟"
            label="ספירת חיות"
            sub="סוף יום"
            color="#f59e0b"
            onClick={() => onNavigate('proteins')}
          />
          <QuickAction
            emoji="🛒"
            label="הזמנות ספקים"
            sub="עלה עלה, דגים, יבש"
            color="#8b5cf6"
            onClick={() => onNavigate('supplier')}
          />
        </div>
      </div>

      {/* ── Station status ── */}
      <SectionCard title="סטטוס תחנות" icon="📊">
        <div className="space-y-3">
          {Object.values(STATIONS).map(s => {
            const tasks    = PREP_TASKS[s.id] || [];
            const doneN    = tasks.filter(t => completedTasks.has(t.id)).length;
            const totalN   = tasks.length;
            const p        = totalN > 0 ? Math.round((doneN / totalN) * 100) : 0;
            return (
              <div key={s.id}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    <span>{s.emoji}</span> {s.name}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>{p}%</span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${p}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

    </div>
  );
}

/* ─── Sub-components ─── */

function StatCard({ label, value, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="glow-btn rounded-2xl p-4 text-right w-full"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        '--gc': color,
        '--gca': color + '50',
        '--gcb': color + '18',
      }}
    >
      <div className="text-2xl font-black mb-0.5" style={{ color }}>
        {value}
      </div>
      <div className="text-white text-sm font-semibold leading-tight">{label}</div>
      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</div>
    </button>
  );
}

function SectionCard({ title, icon, children, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`rounded-3xl p-5 w-full text-right ${onClick ? 'glow-btn' : ''}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <span className="text-white font-bold text-base">{title}</span>
        {onClick && (
          <span className="mr-auto text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>הצג הכל ←</span>
        )}
      </div>
      {children}
    </Wrapper>
  );
}

function QuickAction({ emoji, label, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="glow-btn rounded-3xl p-5 text-right w-full"
      style={{
        background: color + '12',
        border: `1px solid ${color}25`,
        '--gc': color,
        '--gca': color + '50',
        '--gcb': color + '18',
      }}
    >
      <span
        className="inline-flex items-center justify-center w-12 h-12 rounded-2xl text-2xl mb-3"
        style={{ background: color + '20' }}
      >
        {emoji}
      </span>
      <div className="text-white font-bold text-sm leading-tight">{label}</div>
      <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</div>
    </button>
  );
}
