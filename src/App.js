import { useState } from 'react';
import LoginFlow from './components/LoginFlow';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PrepChecklist from './components/PrepChecklist';
import RecipeDatabase from './components/RecipeDatabase';
import WeeklyTasks from './components/WeeklyTasks';
import { useLocalStorageSet } from './hooks/useLocalStorageSet';

function App() {
  const [user, setUser] = useState(null);
  const [station, setStation] = useState(null);
  const [view, setView] = useState('dashboard');

  // Keys are per-station so two cooks on the same station share progress
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

  if (!user || !station) {
    return <LoginFlow onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-900" dir="rtl">
      <Sidebar
        currentView={view}
        onNavigate={setView}
        station={station}
        user={user}
        onChangeCook={handleChangeCook}
      />

      <main className="flex-1 overflow-y-auto">
        {view === 'dashboard' && (
          <Dashboard
            station={station}
            completedTasks={completedTasks}
            onNavigate={setView}
          />
        )}
        {view === 'prep' && (
          <PrepChecklist
            station={station}
            completedTasks={completedTasks}
            onToggle={toggleTask}
            onReset={resetDailyTasks}
          />
        )}
        {view === 'recipes' && (
          <RecipeDatabase station={station} />
        )}
        {view === 'weekly' && (
          <WeeklyTasks station={station} />
        )}
      </main>
    </div>
  );
}

export default App;
