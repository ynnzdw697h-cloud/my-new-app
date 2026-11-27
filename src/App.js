import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import WeighingDemo from './demo/WeighingDemo';
import FohDemo from './demo/FohDemo';
import { motion, MotionConfig } from 'framer-motion';
import { Utensils, Search, ArrowRight, Check, LogOut } from 'lucide-react';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { TenantProvider } from './context/TenantContext';
import { DEFAULT_TENANT_ID } from './data/tenants';
import LoginFlow from './components/LoginFlow';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PrepChecklist, { dueInfo, minutesNow } from './components/PrepChecklist';
import RecipeDatabase from './components/RecipeDatabase';
import PrepTracker from './components/PrepTracker';
import WeeklyTasks from './components/WeeklyTasks';
import ShiftNotes, { missingStatus } from './components/ShiftNotes';
import ShiftLog from './components/ShiftLog';
import Announcements from './components/Announcements';
import ProteinCount from './components/ProteinCount';
import SupplierOrder from './components/SupplierOrder';
import CheckerHub from './components/checker/CheckerHub';
import CheckerDetail from './components/checker/CheckerDetail';
import GlobalSearch from './components/GlobalSearch';
import ScheduleAdmin from './components/schedule/ScheduleAdmin';
import ShiftSubmit from './components/schedule/ShiftSubmit';
import TeamSchedule from './components/schedule/TeamSchedule';
import ErrorBoundary from './components/ErrorBoundary';
import { Sheet } from './components/ui/Sheet';
import { useBackClose } from './hooks/useBackClose';
import { usePrepState } from './hooks/usePrepState';
import { useFirestoreArray } from './hooks/useFirestoreArray';
import { LOG_DOCS } from './data/shifts';
import { STATIONS } from './data/stations';
import { SESSION_KEY, CHEFS } from './data/chefs';

const PAGE_TITLES = {
  dashboard:      'וילה אכדיה',
  prep:           'צ׳ק ליסט יומי',
  recipes:        'ספר המתכונים',
  prep_tracker:   'תפוגה ובזבוז',
  weekly:         'משימות שבועיות',
  shift:          'חוסרים והערות',
  shift_log:      'יומן משמרת',
  announcements:  'הודעות לצוות',
  proteins:       'ספירת חיות',
  supplier:       'הזמנות ספקים',
  checker_hub:    'קבלת סחורה',
  checker_detail: 'בדיקת משלוח',
  schedule:       'בניית סידור',
  team_schedule:  'סידור עבודה',
  shift_submit:   'הגשת משמרות',
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

// Phone: the page itself scrolls. Tablet: the <main> panel scrolls.
// Runs after React has swapped in the new screen.
function scrollToTop() {
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    document.querySelector('main')?.scrollTo(0, 0);
  });
}

// The last screen is kept for this tab only, so a refresh stays on the same screen.
const VIEW_KEY = 'villa_akadia_view';
function homeFor(role) { return role === 'checker' ? 'checker_hub' : 'dashboard'; }
function loadView(user, role) {
  try {
    const v = JSON.parse(sessionStorage.getItem(VIEW_KEY) || 'null');
    if (!v || v.user !== user || !PAGE_TITLES[v.view] || v.view === 'checker_detail') return homeFor(role);
    if ((role === 'checker') !== v.view.startsWith('checker')) return homeFor(role);
    return v.view;
  } catch (_) {
    return homeFor(role);
  }
}

// Last station a user worked on (shown first at the next login)
export function lastStationKey(user) { return `villa_akadia_last_station:${user}`; }

// Inner component — rendered only after login, always inside TenantProvider
function AppShell({ user, station, role, tenantId, onLogout, onChangeStation }) {
  const home = homeFor(role);
  const [view, setView]                         = useState(() => loadView(user, role));
  const [stationOpen,      setStationOpen]       = useState(false);
  const [activeDeliveryId, setActiveDeliveryId] = useState(null);
  const [markReadyRecipe,  setMarkReadyRecipe]   = useState(null);
  const [searchOpen,       setSearchOpen]        = useState(false);
  // What the search asked to open on the next screen
  const [recipeTarget,     setRecipeTarget]      = useState(null); // { kind, item }
  const [focusTaskId,      setFocusTaskId]       = useState(null);
  const [focusMissingId,   setFocusMissingId]    = useState(null);
  // Set when a recipe was opened from a checklist row, so "back" returns to that row
  const [recipeFromTask,   setRecipeFromTask]   = useState(null);
  const isTablet    = useIsTablet();
  const prep        = usePrepState(station);

  // Small dots in the menu: something is waiting on that screen
  const [missingItems]  = useFirestoreArray('missing_items');
  const [announcements] = useFirestoreArray(LOG_DOCS.announcements);
  const [nowMin, setNowMin] = useState(minutesNow);
  useEffect(() => {
    const id = setInterval(() => setNowMin(minutesNow()), 60000);
    return () => clearInterval(id);
  }, []);
  const badges = {
    shift: missingItems.some(i => missingStatus(i) === 'reported'),
    announcements: announcements.some(a => !a.removed && ![a.author, ...(a.seenBy || []).map(s => s.name)].includes(user)),
    prep: prep.progress.pendingTasks.some(t => dueInfo(t, false, nowMin)?.late),
  };

  const openDelivery = useCallback((id) => {
    setActiveDeliveryId(id);
    setView('checker_detail');
    scrollToTop();
  }, []);

  // Menu / tile navigation always opens the new screen at its top.
  // (Search picks use setView directly so they can scroll to the found item.)
  const navigate = useCallback((id) => {
    setView(id);
    setRecipeFromTask(null);
    scrollToTop();
  }, []);

  // "מתכון" button on a checklist row
  const openRecipeFromTask = useCallback((target, taskId) => {
    setRecipeTarget(target);
    setRecipeFromTask(taskId);
    setView('recipes');
    scrollToTop();
  }, []);

  const backToChecklist = useCallback(() => {
    setFocusTaskId(recipeFromTask);
    setRecipeFromTask(null);
    setView('prep');
  }, [recipeFromTask]);

  const onSearchPick = useCallback((type, payload) => {
    setRecipeFromTask(null);
    if (type === 'recipe')  { setRecipeTarget(payload);       setView('recipes'); }
    if (type === 'task')    { setFocusTaskId(payload.id);     setView('prep'); }
    if (type === 'missing') { setFocusMissingId(payload.id);  setView('shift'); }
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Phone "back" button: closes search / sheet first, then returns to the home screen.
  // From the home screen it leaves the app.
  useBackClose(searchOpen, closeSearch);
  useBackClose(view !== home, useCallback(() => { setView(home); setRecipeFromTask(null); }, [home]));
  useBackClose(stationOpen, useCallback(() => setStationOpen(false), []));
  useEffect(() => {
    try { sessionStorage.setItem(VIEW_KEY, JSON.stringify({ user, view })); } catch (_) { /* ignore */ }
  }, [user, view]);

  // Stations this user may work on (the checker has no choice)
  const allowedStations = role === 'checker'
    ? []
    : (CHEFS.find(c => c.displayName === user)?.stations || [station]).filter(id => STATIONS[id]);

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

  const userChip = (
    <button
      onClick={() => setStationOpen(true)}
      aria-label={`${user}, ${st.name}. החלפת פס`}
      className="flex items-center gap-2 rounded-2xl px-3 min-h-[48px] transition-colors duration-150 active:bg-white/10"
      style={{ background: st.color + '18', border: `1px solid ${st.color}35` }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
      <span className="text-label font-bold" style={{ color: st.color }}>{user}</span>
    </button>
  );

  const stationSheet = (
    <Sheet open={stationOpen} onClose={() => setStationOpen(false)} title={user}>
      {allowedStations.length > 1 && (
        <div className="space-y-2 mb-3">
          {allowedStations.map(id => {
            const s = STATIONS[id];
            const current = id === station;
            return (
              <button
                key={id}
                onClick={() => { setStationOpen(false); if (!current) onChangeStation(id); }}
                aria-current={current ? 'true' : undefined}
                className="w-full flex items-center gap-4 px-4 min-h-[64px] rounded-xl text-right text-lg font-medium transition-colors duration-150 active:bg-white/10"
                style={{ background: current ? s.color + '18' : 'var(--bg-card)', border: `1px solid ${current ? s.color + '60' : 'var(--border)'}` }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span className="text-text-primary">{s.name}</span>
                {current && <Check size={20} strokeWidth={2} className="mr-auto" style={{ color: s.color }} aria-label="הפס הנוכחי" />}
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={() => { setStationOpen(false); onLogout(); }}
        className="w-full flex items-center gap-4 px-4 min-h-[64px] rounded-xl text-right text-lg font-medium transition-colors duration-150 active:bg-white/10"
        style={{ border: '1px solid var(--border)', color: 'rgba(255,255,255,0.8)' }}
      >
        <LogOut size={20} strokeWidth={1.5} aria-hidden="true" />
        התנתק
      </button>
    </Sheet>
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
    <motion.div
      key={view}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
    >
      <ErrorBoundary key={view} onHome={() => navigate(home)}>
        {view === 'dashboard' && (
          <Dashboard station={station} user={user} prep={prep} onNavigate={navigate} role={role} />
        )}
        {view === 'prep' && (
          <PrepChecklist station={station} prep={prep} user={user} focusTaskId={focusTaskId} onFocused={() => setFocusTaskId(null)} onOpenRecipe={openRecipeFromTask} />
        )}
        {view === 'recipes' && recipeFromTask && (
          <div className="sticky md:top-0 z-20 px-4 py-2" style={{ top: isTablet ? 0 : 'calc(64px + env(safe-area-inset-top, 0px))', background: 'rgba(18,18,18,0.94)', borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={backToChecklist}
              className="flex items-center gap-2 min-h-[48px] text-lg font-medium text-text-primary"
            >
              <ArrowRight size={20} strokeWidth={1.75} aria-hidden="true" />
              חזרה לצ׳ק ליסט
            </button>
          </div>
        )}
        {view === 'recipes'        && (
          <RecipeDatabase
            station={station}
            role={role}
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
        {view === 'shift_log'      && <ShiftLog user={user} />}
        {view === 'announcements'  && <Announcements user={user} />}
        {view === 'proteins'       && <ProteinCount />}
        {view === 'supplier'       && <SupplierOrder />}
        {view === 'schedule'       && role === 'admin' && <ScheduleAdmin />}
        {view === 'shift_submit'   && role !== 'checker' && <ShiftSubmit user={user} />}
        {view === 'team_schedule'  && role !== 'checker' && <TeamSchedule user={user} />}
        {view === 'checker_hub'    && <CheckerHub user={user} onOpenDelivery={openDelivery} />}
        {view === 'checker_detail' && <CheckerDetail deliveryId={activeDeliveryId} user={user} onBack={() => navigate('checker_hub')} />}
      </ErrorBoundary>
    </motion.div>
  );

  // ── Tablet layout: persistent sidebar + content canvas ──
  if (isTablet) {
    return (
      <div className="flex overflow-hidden" style={{ background: 'var(--bg)', height: '100dvh' }} dir="rtl">
        <Sidebar
          currentView={view}
          onNavigate={navigate}
          station={station}
          user={user}
          onLogout={onLogout}
          role={role}
          isOpen={true}
          onClose={() => {}}
          badges={badges}
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
            <div className="mr-auto flex items-center gap-2">{searchButton}{userChip}</div>
          </header>
          <main className="flex-1 overflow-y-auto">
            {contentArea}
          </main>
        </div>
        {searchOverlay}
        {stationSheet}
      </div>
    );
  }

  // ── Mobile layout: bottom nav + fixed header ──
  return (
    <div className="flex flex-col" style={{ background: 'var(--bg)', minHeight: '100dvh' }} dir="rtl">

      {/* ── Top header ── */}
      <header
        className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5"
        style={{
          height: 'calc(64px + env(safe-area-inset-top, 0px))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
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
          {userChip}
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1" style={{ paddingTop: 'calc(64px + env(safe-area-inset-top, 0px))', paddingBottom: '96px' }}>
        {contentArea}
      </main>

      {searchOverlay}
      {stationSheet}

      <BottomNav
        currentView={view}
        onNavigate={navigate}
        station={station}
        onLogout={onLogout}
        role={role}
        badges={badges}
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

  function saveSession(newSession) {
    setSession(newSession);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    try { localStorage.setItem(lastStationKey(newSession.user), newSession.station); } catch (_) { /* ignore */ }
  }

  // Switch station without logging in again
  function handleChangeStation(stationId) {
    if (!session || !STATIONS[stationId]) return;
    saveSession({ ...session, station: stationId });
  }

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
    saveSession(newSession);
  }

  async function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    try { sessionStorage.removeItem(VIEW_KEY); } catch (_) { /* ignore */ }
    setSession(null);
    try { await signOut(auth); } catch (_) { /* ignore */ }
  }

  // Standalone demo routes — after all hooks, no auth/Firebase needed
  if (window.location.pathname === '/demo/weighing') return <WeighingDemo />;
  if (window.location.pathname === '/demo/foh')      return <FohDemo />;

  if (!authReady) return null;

  if (!session) return <MotionConfig reducedMotion="user"><LoginFlow onLogin={handleLogin} /></MotionConfig>;

  return (
    <MotionConfig reducedMotion="user">
    <TenantProvider tenantId={session.tenantId}>
      <AppShell
        user={session.user}
        station={session.station}
        role={session.role}
        tenantId={session.tenantId}
        onLogout={handleLogout}
        onChangeStation={handleChangeStation}
      />
    </TenantProvider>
    </MotionConfig>
  );
}

// Last safety net: if the whole app fails, show "refresh" instead of a black page
function AppRoot() {
  return (
    <ErrorBoundary root>
      <App />
    </ErrorBoundary>
  );
}

export default AppRoot;
