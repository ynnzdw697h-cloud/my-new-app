import { useState, useEffect, useTransition, useCallback, useSyncExternalStore } from 'react';
import WeighingDemo from './demo/WeighingDemo';
import FohDemo from './demo/FohDemo';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils } from 'lucide-react';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { TenantProvider } from './context/TenantContext';
import { DEFAULT_TENANT_ID } from './data/tenants';
import LoginFlow from './components/LoginFlow';
import SplashScreen from './components/SplashScreen';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PrepChecklist from './components/PrepChecklist';
import RecipeDatabase from './components/RecipeDatabase';
import PrepTracker from './components/PrepTracker';
import WeeklyTasks from './components/WeeklyTasks';
import ShiftNotes from './components/ShiftNotes';
import ProteinCount from './components/ProteinCount';
import SupplierOrder from './components/SupplierOrder';
import CheckerHub from './components/checker/CheckerHub';
import CheckerDetail from './components/checker/CheckerDetail';
import { useFirestoreSet } from './hooks/useFirestoreSet';
import { STATIONS } from './data/stations';
import { SESSION_KEY } from './data/chefs';

const PAGE_TITLES = {
  dashboard:      'וילה אכדיה',
  prep:           'צ׳ק ליסט יומי',
  recipes:        'ספר המתכונים',
  prep_tracker:   'תפוגה ובזבוז',
  weekly:         'משימות שבועיות',
  shift:          'חוסרים והערות',
  proteins:       'ספירת חיות',
  supplier:       'הזמנות ספקים',
  checker_hub:    'קבלת סחורה',
  checker_detail: 'בדיקת משלוח',
};

// ── Responsive breakpoint hook ──
function subscribe(cb) {
  const mq = window.matchMedia('(min-width: 768px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function useIsTablet() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(min-width: 768px)').matches,
    () => false,
  );
}

// Inner component — rendered only after login, always inside TenantProvider
function AppShell({ user, station, role, tenantId, onLogout }) {
  const [view, setView]                         = useState(role === 'checker' ? 'checker_hub' : 'dashboard');
  const [activeDeliveryId, setActiveDeliveryId] = useState(null);
  const [markReadyRecipe,  setMarkReadyRecipe]   = useState(null);
  const [sidebarOpen, setSidebarOpen]           = useState(false);

  const isTablet    = useIsTablet();
  const stationKey  = station || 'init';
  const [completedTasks, setCompletedTasks]     = useFirestoreSet(`prep_tasks_${stationKey}`);
  const [, startTransition]                     = useTransition();

  const toggleTask = useCallback((taskId) => {
    startTransition(() => {
      setCompletedTasks(prev => {
        const next = new Set(prev);
        next.has(taskId) ? next.delete(taskId) : next.add(taskId);
        return next;
      });
    });
  }, [setCompletedTasks]);

  const openDelivery = useCallback((id) => {
    setActiveDeliveryId(id);
    setView('checker_detail');
  }, []);

  const navigate = useCallback((id) => {
    setView(id);
    setSidebarOpen(false);
  }, []);

  const st          = STATIONS[station];
  const isDashboard = view === 'dashboard';

  const contentArea = (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeInOut' }}
      >
        {view === 'dashboard' && (
          <Dashboard station={station} user={user} completedTasks={completedTasks} onNavigate={navigate} role={role} />
        )}
        {view === 'prep' && (
          <PrepChecklist
            station={station}
            completedTasks={completedTasks}
            onToggle={toggleTask}
            onReset={() => setCompletedTasks(new Set())}
          />
        )}
        {view === 'recipes'        && (
          <RecipeDatabase
            station={station}
            onMarkReady={r => { setMarkReadyRecipe(r); navigate('prep_tracker'); }}
          />
        )}
        {view === 'prep_tracker'   && (
          <PrepTracker
            user={user}
            station={station}
            initialRecipe={markReadyRecipe}
            onClearInitial={() => setMarkReadyRecipe(null)}
          />
        )}
        {view === 'weekly'         && <WeeklyTasks station={station} />}
        {view === 'shift'          && <ShiftNotes user={user} />}
        {view === 'proteins'       && <ProteinCount />}
        {view === 'supplier'       && <SupplierOrder />}
        {view === 'checker_hub'    && <CheckerHub user={user} onOpenDelivery={openDelivery} />}
        {view === 'checker_detail' && <CheckerDetail deliveryId={activeDeliveryId} user={user} onBack={() => navigate('checker_hub')} />}
      </motion.div>
    </AnimatePresence>
  );

  // ── Tablet layout: persistent sidebar + content canvas ──
  if (isTablet) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }} dir="rtl">
        <Sidebar
          currentView={view}
          onNavigate={navigate}
          station={station}
          user={user}
          onLogout={onLogout}
          isOpen={true}
          onClose={() => {}}
        />
        <div className="flex-1 flex flex-col min-w-0" style={{ borderRight: '1px solid var(--border)' }}>
          {/* Tablet top bar — slimmer, no user chip (sidebar has it) */}
          <header
            className="flex-shrink-0 h-14 flex items-center px-6"
            style={{
              background: 'rgba(18,18,18,0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {isDashboard && <Utensils size={16} style={{ color: 'rgba(255,255,255,0.4)', marginLeft: '8px' }} strokeWidth={1.5} />}
            <span className="text-h3 text-text-primary">{PAGE_TITLES[view]}</span>
          </header>
          <main className="flex-1 overflow-y-auto">
            {contentArea}
          </main>
        </div>
      </div>
    );
  }

  // ── Mobile layout: bottom nav + fixed header ──
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }} dir="rtl">

      {/* ── Top header ── */}
      <header
        className="fixed top-0 inset-x-0 z-30 h-16 flex items-center justify-between px-5"
        style={{
          background: 'rgba(18,18,18,0.9)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2.5">
          {isDashboard && <Utensils size={18} style={{ color: 'rgba(255,255,255,0.45)' }} strokeWidth={1.5} />}
          <span className="text-h3 text-text-primary font-black tracking-tight">
            {PAGE_TITLES[view]}
          </span>
        </div>
        <div
          className="flex items-center gap-2 rounded-2xl px-3 py-1.5"
          style={{ background: st.color + '18', border: `1px solid ${st.color}35` }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
          <span className="text-label font-bold" style={{ color: st.color }}>{user}</span>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto" style={{ paddingTop: '64px', paddingBottom: '96px' }}>
        {contentArea}
      </main>

      <BottomNav
        currentView={view}
        onNavigate={navigate}
        station={station}
        onLogout={onLogout}
        role={role}
      />
    </div>
  );
}

// ── Root component ──
function App() {
  const [session, setSession]     = useState(null); // { user, station, role, tenantId }
  const [authReady, setAuthReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.user && parsed.station && STATIONS[parsed.station]) {
          setSession({
            user:     parsed.user,
            station:  parsed.station,
            role:     parsed.role     || 'chef',
            tenantId: parsed.tenantId || DEFAULT_TENANT_ID,
          });
        }
      }
    } catch (_) {
      localStorage.removeItem(SESSION_KEY);
    }
    setAuthReady(true);
  }, []);

  async function handleLogin(displayName, stationId, role, tenantId, firebaseToken) {
    // Sign into Firebase if a custom token was provided (new auth flow)
    if (firebaseToken) {
      try {
        await signInWithCustomToken(auth, firebaseToken);
      } catch (err) {
        console.warn('[Auth] signInWithCustomToken failed, continuing without Firebase session:', err.message);
      }
    }

    const newSession = {
      user:     displayName,
      station:  stationId,
      role:     role     || 'chef',
      tenantId: tenantId || DEFAULT_TENANT_ID,
    };
    setSession(newSession);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
  }

  async function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    try { await signOut(auth); } catch (_) { /* ignore */ }
  }

  // Standalone demo routes — after all hooks, no auth/Firebase needed
  if (window.location.pathname === '/demo/weighing') return <WeighingDemo />;
  if (window.location.pathname === '/demo/foh')      return <FohDemo />;

  if (!authReady) return null;

  if (!session) {
    if (!splashDone) {
      return <SplashScreen onComplete={() => setSplashDone(true)} />;
    }
    return <LoginFlow onLogin={handleLogin} />;
  }

  return (
    <TenantProvider tenantId={session.tenantId}>
      <AppShell
        user={session.user}
        station={session.station}
        role={session.role}
        tenantId={session.tenantId}
        onLogout={handleLogout}
      />
    </TenantProvider>
  );
}

export default App;
