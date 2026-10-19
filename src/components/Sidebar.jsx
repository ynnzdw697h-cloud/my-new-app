import { Home, ClipboardList, BookOpen, CalendarDays, FileText, Fish, ShoppingCart, LogOut, X, Timer, PackageCheck, UtensilsCrossed, NotebookText, Megaphone } from 'lucide-react';
import { STATIONS } from '../data/stations';
import { navForProfile } from './BottomNav';

// Full labels + icons for the tablet sidebar; which items appear (and their order)
// comes from the same role profile as the mobile bottom nav.
const NAV_META = {
  dashboard:    { label: 'בית',              Icon: Home },
  prep:         { label: "צ'ק ליסט יומי",    Icon: ClipboardList },
  recipes:      { label: 'מתכונים',          Icon: BookOpen },
  weekly:       { label: 'משימות שבועיות',   Icon: CalendarDays },
  shift:        { label: 'חוסרים והערות',    Icon: FileText },
  shift_log:    { label: 'יומן משמרת',       Icon: NotebookText },
  announcements:{ label: 'הודעות לצוות',     Icon: Megaphone },
  prep_tracker: { label: 'תפוגה ובזבוז',     Icon: Timer },
  proteins:     { label: 'ספירת חיות',       Icon: Fish },
  supplier:     { label: 'הזמנות ספקים',     Icon: ShoppingCart },
  checker_hub:  { label: 'קבלת סחורה',       Icon: PackageCheck },
};

export default function Sidebar({ currentView, onNavigate, station, user, onLogout, role, isOpen, onClose }) {
  const st = STATIONS[station] || STATIONS['cold'];
  const { main, more } = navForProfile(role);
  const navItems = [...main, ...more].map(i => ({ id: i.id, ...NAV_META[i.id] }));

  return (
    <aside
      dir="rtl"
      className={`
        w-72 flex flex-col flex-shrink-0
        fixed top-0 right-0 h-full z-50
        transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
      style={{
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center justify-between px-5 py-5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <UtensilsCrossed size={20} strokeWidth={1.75} style={{ color: 'rgba(255,255,255,0.75)' }} aria-hidden="true" />
          </div>
          <div>
            <div className="text-h3 text-text-primary font-bold leading-tight">וילה אכדיה</div>
            <div className="text-meta text-text-tertiary">מטבח</div>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="סגור תפריט"
          className="md:hidden w-12 h-12 rounded-xl flex items-center justify-center
                     transition-colors duration-150 active:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <X size={17} strokeWidth={2} style={{ color: 'rgba(255,255,255,0.5)' }} />
        </button>
      </div>

      {/* ── User + Station ── */}
      <div className="px-4 py-4 space-y-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <span className="text-label text-text-secondary font-bold">{user?.[0]}</span>
          </div>
          <div className="min-w-0">
            <div className="text-meta text-text-tertiary leading-none mb-0.5">{role === 'checker' ? 'משתמש' : 'טבח'}</div>
            <div className="text-label text-text-primary font-bold truncate">{user}</div>
          </div>
        </div>

        {role !== 'checker' && <div
          className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
          style={{ background: st.color + '12', border: `1px solid ${st.color}30` }}
        >
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: st.color }}
          />
          <div>
            <div className="text-meta leading-none mb-0.5" style={{ color: st.color + 'AA' }}>תחנה</div>
            <div className="text-label font-bold" style={{ color: st.color }}>{st.name}</div>
          </div>
        </div>}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map(({ id, label, Icon }) => {
          const active = currentView === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={active ? 'page' : undefined}
              className="w-full flex items-center gap-3 px-4 min-h-[52px] rounded-xl text-right
                         transition-colors duration-150 active:bg-white/10"
              style={{ background: active ? 'rgba(255,255,255,0.07)' : 'transparent' }}
            >
              <Icon
                size={18}
                strokeWidth={1.5}
                style={{ color: active ? st.color : 'rgba(255,255,255,0.62)', flexShrink: 0 }}
              />
              <span
                className="text-body font-semibold"
                style={{ color: active ? '#fff' : 'rgba(255,255,255,0.65)' }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Logout ── */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={onLogout}
          aria-label="התנתק"
          className="w-full flex items-center gap-3 px-4 min-h-[52px] rounded-xl text-right
                     transition-colors duration-150"
          style={{ background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={18} strokeWidth={1.5} style={{ color: 'rgba(248,113,113,0.7)', flexShrink: 0 }} />
          <span className="text-body font-semibold" style={{ color: 'rgba(248,113,113,0.7)' }}>התנתק</span>
        </button>
      </div>
    </aside>
  );
}
