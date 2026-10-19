import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import WeighingDemo from './demo/WeighingDemo';
import FohDemo from './demo/FohDemo';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Utensils, Search } from 'lucide-react';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { TenantProvider } from './context/TenantContext';
import { DEFAULT_TENANT_ID } from './data/tenants';
import LoginFlow from './components/LoginFlow';
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
import GlobalSearch from './components/GlobalSearch';
import { usePrepState } from './hooks/usePrepState';
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
  const [searchOpen,       setSearchOpen]        = useState(false);
  // What the search asked to open on the next screen
  const [recipeTarget,     setRecipeTarget]      = useState(null); // { kind, item }
  const [focusTaskId,      setFocusTaskId]       = useState(null);
  const [focusMissingId,   setFocusMissingId]    = useState(null);
  const isTablet    = useIsTablet();
  const prep        = usePrepState(station);

  const openDelivery = useCallback((id) => {
    setActiveDeliveryId(id);
    setView('checker_detail');
  }, []);

  const navigate = useCallback((id) => {
    setView(id);
  }, []);

  const onSearchPick = useCallback((type, payload) => {
    if (type === 'recipe')  { setRecipeTarget(payload);       setView('recipes'); }
    if (type === 'task')    { setFocusTaskId(payload.id);     setView('prep'); }
    if (type === 'missing') { setFocusMissingId(payload.id);  setView('shift'); }
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const st          = STATIONS[station];
  const isDashboard = view === 'dashboard';
  const canSearch   = role !== 'checker';

  const searchButton = canSearch && (
    <button
      onClick={() => setSearchOpen(true)}
      aria-label="חיפוש"
      className="w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center text-text-primary transition-colors duration-150 active:bg-white/10"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <Search size={22} strokeWidth={1.75} />
    </button>
  );

  const searchOverlay = searchOpen && (
    <GlobalSearch
      prep={prep}
      stationName={st.name}
      stationColor={st.color}
      onClose={closeSearch}
      onPick={onSearchPick}
    />
  );

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
          <Dashboard station={station} user={user} prep={prep} onNavigate={navigate} role={role} />
        )}
        {view === 'prep' && (
          <PrepChecklist station={station} prep={prep} focusTaskId={focusTaskId} onFocused={() => setFocusTaskId(null)} />
        )}
        {view === 'recipes'        && (
          <RecipeDatabase
            station={station}
            onMarkReady={r => { setMarkReadyRecipe(r); navigate('prep_tracker'); }}
            openTarget={recipeTarget}
            onOpenedTarget={() => setRecipeTarget(null)}
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
        {view === 'shift'          && <ShiftNotes user={user} focusId={focusMissingId} onFocused={() => setFocusMissingId(null)} />}
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
          role={role}
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
            <div className="mr-auto">{searchButton}</div>
          </header>
          <main className="flex-1 overflow-y-auto">
            {contentArea}
          </main>
        </div>
        {searchOverlay}
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
        <div className="flex items-center gap-2.5 min-w-0">
          {isDashboard && <Utensils size={18} style={{ color: 'rgba(255,255,255,0.45)' }} strokeWidth={1.5} />}
          <span className="text-h3 text-text-primary font-black tracking-tight truncate">
            {PAGE_TITLES[view]}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {searchButton}
          <div
            className="flex items-center gap-2 rounded-2xl px-3 py-1.5"
            style={{ background: st.color + '18', border: `1px solid ${st.color}35` }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
            <span className="text-label font-bold" style={{ color: st.color }}>{user}</span>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1" style={{ paddingTop: '64px', paddingBottom: '96px' }}>
        {contentArea}
      </main>

      {searchOverlay}

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

  if (!session) return <LoginFlow onLogin={handleLogin} />;

  return (
    <MotionConfig reducedMotion="user">
    <TenantProvider tenantId={session.tenantId}>
      <AppShell
        user={session.user}
        station={session.station}
        role={session.role}
        tenantId={session.tenantId}
        onLogout={handleLogout}
      />
    </TenantProvider>
    </MotionConfig>
  );
}

export default App;
