import { useState } from 'react';
import LoginFlow from './components/LoginFlow';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PrepChecklist from './components/PrepChecklist';
import RecipeDatabase from './components/RecipeDatabase';
import WeeklyTasks from './components/WeeklyTasks';
import { useLocalStorageSet } from './hooks/useLocalStorageSet';
import { STATIONS } from './data/stations';

function App() {
  const [user, setUser] = useState(null);
  const [station, setStation] = useState(null);
  const [view, setView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const stationKey = station || 'init';
  const [completedTasks, setCompletedTasks] = useLocalStorageSet(`kitchen_prep_tasks_${stationKey}`);

  function handleLogin(name, stationId) {
    setUser(name);
    setStation(stationId);
    setView('dashboard');
  }

  function handleChangeCook() {
    setUser(null);
    setStation(null);
  }

  function toggleTask(taskId) {
    setCompletedTasks(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  }

  function resetDailyTasks() {
    setCompletedTasks(new Set());
  }

  function navigate(v) {
    setView(v);
    setSidebarOpen(false); // close sidebar on mobile after tap
  }

  if (!user || !station) {
    return <LoginFlow onLogin={handleLogin} />;
  }

  const st = STATIONS[station];

  return (
    <div className="flex min-h-screen bg-slate-900" dir="rtl">

      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar
        currentView={view}
        onNavigate={navigate}
        station={station}
        user={user}
        onChangeCook={handleChangeCook}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto min-w-0 pt-14 md:pt-0">

        {/* Mobile top bar */}
        <div
          className="md:hidden fixed top-0 inset-x-0 z-30 h-14
                     bg-slate-900 border-b border-slate-700
                     flex items-center justify-between px-4"
          dir="rtl"
        >
          {/* Hamburger — right side (RTL start) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="פתח תפריט"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* App name center */}
          <span className="text-white font-bold text-base absolute right-1/2 translate-x-1/2">
            וילה אכדיה
          </span>

          {/* Station badge — left side */}
          <div
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 border text-sm font-semibold"
            style={{ borderColor: st.color + '60', backgroundColor: st.color + '15', color: st.color }}
          >
            <span>{st.emoji}</span>
            <span>{st.name}</span>
          </div>
        </div>

        {/* Page content */}
        {view === 'dashboard' && (
          <Dashboard station={station} completedTasks={completedTasks} onNavigate={navigate} />
        )}
        {view === 'prep' && (
          <PrepChecklist
            station={station}
            completedTasks={completedTasks}
            onToggle={toggleTask}
            onReset={resetDailyTasks}
          />
        )}
        {view === 'recipes' && <RecipeDatabase station={station} />}
        {view === 'weekly' && <WeeklyTasks station={station} />}
      </main>
    </div>
  );
}

export default App;
