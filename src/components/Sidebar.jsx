import { Home, ClipboardList, BookOpen, CalendarDays, FileText, Fish, ShoppingCart, LogOut, X } from 'lucide-react';
import { STATIONS } from '../data/stations';

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'בית',                 Icon: Home },
  { id: 'prep',         label: "צ'ק ליסט יומי",       Icon: ClipboardList },
  { id: 'recipes',      label: 'מתכונים',             Icon: BookOpen },
  { id: 'weekly',       label: 'משימות שבועיות',      Icon: CalendarDays },
  { id: 'shift',        label: 'חוסרים והערות',       Icon: FileText },
  { id: 'proteins',     label: 'חיות — ספירת סוף יום', Icon: Fish },
  { id: 'supplier',     label: 'הזמנות ספקים',        Icon: ShoppingCart },
];

export default function Sidebar({ currentView, onNavigate, station, user, onLogout, isOpen, onClose }) {
  const st = STATIONS[station] || STATIONS['cold'];

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
            style={{ background: 'rgba(212,237,49,0.10)', border: '1px solid rgba(212,237,49,0.20)' }}
          >
            <span style={{ fontSize: '20px' }}>🍽️</span>
          </div>
          <div>
            <div className="text-h3 text-text-primary font-black leading-tight">וילה אכדיה</div>
            <div className="text-meta text-text-tertiary">מטבח</div>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="סגור תפריט"
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center
                     transition-all duration-150 active:scale-90 press"
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
            <div className="text-meta text-text-tertiary leading-none mb-0.5">טבח</div>
            <div className="text-label text-text-primary font-bold truncate">{user}</div>
          </div>
        </div>

        <div
          className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
          style={{ background: st.color + '12', border: `1px solid ${st.color}30` }}
        >
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: st.color, boxShadow: `0 0 8px ${st.color}70` }}
          />
          <div>
            <div className="text-meta leading-none mb-0.5" style={{ color: st.color + 'AA' }}>תחנה</div>
            <div className="text-label font-bold" style={{ color: st.color }}>{st.name}</div>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = currentView === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-right
                         transition-all duration-150 active:scale-[0.98] press"
              style={
                active
                  ? { background: st.color + '1A', border: `1px solid ${st.color}35` }
                  : { background: 'transparent', border: '1px solid transparent' }
              }
            >
              <Icon
                size={18}
                strokeWidth={1.5}
                style={{ color: active ? st.color : 'rgba(255,255,255,0.45)', flexShrink: 0 }}
              />
              <span
                className="text-body font-semibold"
                style={{ color: active ? st.color : 'rgba(255,255,255,0.65)' }}
              >
                {label}
              </span>
              {active && (
                <div
                  className="mr-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: st.color }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Logout ── */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={onLogout}
          aria-label="התנתק"
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-right
                     transition-all duration-150 active:scale-[0.98] press"
          style={{ background: 'transparent', border: '1px solid transparent' }}
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
