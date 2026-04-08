import { useState } from 'react';
import { STATIONS } from '../data/stations';

const MAIN_NAV = [
  { id: 'dashboard', label: 'בית',     Icon: HomeIcon },
  { id: 'prep',      label: 'פריפ',    Icon: CheckIcon },
  { id: 'recipes',   label: 'מתכונים', Icon: BookIcon },
  { id: 'weekly',    label: 'שבועי',   Icon: CalIcon },
  { id: 'shift',     label: 'הערות',   Icon: NoteIcon },
];

const MORE_NAV = [
  { id: 'prep_tracker', label: 'תפוגה ובזבוז',          emoji: '⏳' },
  { id: 'proteins',     label: 'חיות — ספירת סוף יום', emoji: '🐟' },
  { id: 'supplier',     label: 'הזמנות ספקים',          emoji: '🛒' },
];

export default function BottomNav({ currentView, onNavigate, station, onLogout, role }) {
  const [showMore, setShowMore] = useState(false);
  const st = STATIONS[station] || STATIONS['cold'];

  const isChecker = role === 'checker';

  function go(id) {
    onNavigate(id);
    setShowMore(false);
  }

  // Checker gets a simplified 2-tab nav
  if (isChecker) {
    return (
      <nav
        className="fixed bottom-0 inset-x-0 z-30 pb-safe"
        style={{
          background: 'rgba(18,18,18,0.94)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center justify-around max-w-lg mx-auto px-2" style={{ height: '76px' }}>
          {[
            { id: 'checker_hub', label: 'קבלה',  Icon: InboxIcon },
            { id: 'supplier',    label: 'ספקים', Icon: TruckIcon },
          ].map(({ id, label, Icon }) => {
            const active = currentView === id;
            return (
              <button
                key={id}
                onClick={() => go(id)}
                className="flex flex-col items-center gap-1 flex-1 transition-all duration-200 active:scale-90 py-2"
              >
                <div
                  className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200"
                  style={{
                    background: active ? st.color : 'transparent',
                    boxShadow: active ? `0 0 0 1px ${st.color}, 0 0 18px ${st.color}70, 0 0 40px ${st.color}28` : 'none',
                  }}
                >
                  <Icon active={active} color={st.color} />
                </div>
                <span
                  className="text-xs font-semibold transition-colors duration-200"
                  style={{ color: active ? st.color : 'rgba(255,255,255,0.35)' }}
                >
                  {label}
                </span>
              </button>
            );
          })}
          <button
            onClick={onLogout}
            className="flex flex-col items-center gap-1 flex-1 transition-all duration-200 active:scale-90 py-2"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-2xl" style={{ background: 'transparent' }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>יציאה</span>
          </button>
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* More overlay */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowMore(false)}
          />
          <div
            className="fixed bottom-24 inset-x-4 z-50 rounded-3xl overflow-hidden"
            style={{ background: '#1a1a23', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 -8px 40px rgba(0,0,0,0.6)' }}
          >
            <div className="p-2">
              {MORE_NAV.map(item => (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-right transition-all active:scale-[0.97]"
                  style={{
                    background: currentView === item.id ? st.color + '22' : 'transparent',
                    border: currentView === item.id ? `1px solid ${st.color}35` : '1px solid transparent',
                  }}
                >
                  <span
                    className="w-11 h-11 flex items-center justify-center rounded-2xl text-xl flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    {item.emoji}
                  </span>
                  <span className="text-white font-semibold text-base">{item.label}</span>
                </button>
              ))}

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '4px 8px' }} />

              <button
                onClick={() => { setShowMore(false); onLogout(); }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-right transition-all active:scale-[0.97]"
              >
                <span
                  className="w-11 h-11 flex items-center justify-center rounded-2xl text-xl flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  🔓
                </span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }} className="font-medium text-base">
                  התנתק
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Nav bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 pb-safe"
        style={{
          background: 'rgba(18,18,18,0.94)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center justify-around max-w-lg mx-auto px-2" style={{ height: '76px' }}>
          {MAIN_NAV.map(({ id, label, Icon }) => {
            const active = currentView === id;
            return (
              <button
                key={id}
                onClick={() => go(id)}
                className="flex flex-col items-center gap-1 flex-1 transition-all duration-200 active:scale-90 py-2"
              >
                <div
                  className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200"
                  style={{
                    background: active ? st.color : 'transparent',
                    boxShadow: active ? `0 0 0 1px ${st.color}, 0 0 18px ${st.color}70, 0 0 40px ${st.color}28` : 'none',
                  }}
                >
                  <Icon active={active} color={st.color} />
                </div>
                <span
                  className="text-xs font-semibold transition-colors duration-200"
                  style={{ color: active ? st.color : 'rgba(255,255,255,0.35)' }}
                >
                  {label}
                </span>
              </button>
            );
          })}

          {/* More */}
          <button
            onClick={() => setShowMore(v => !v)}
            className="flex flex-col items-center gap-1 flex-1 transition-all duration-200 active:scale-90 py-2"
          >
            <div
              className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200"
              style={{ background: showMore ? 'rgba(255,255,255,0.12)' : 'transparent' }}
            >
              <MoreIcon />
            </div>
            <span
              className="text-xs font-semibold transition-colors duration-200"
              style={{ color: showMore ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)' }}
            >
              עוד
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}

/* ─── Icons ─── */

function HomeIcon({ active }) {
  const c = active ? '#fff' : 'rgba(255,255,255,0.5)';
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  );
}

function CheckIcon({ active }) {
  const c = active ? '#fff' : 'rgba(255,255,255,0.5)';
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  );
}

function BookIcon({ active }) {
  const c = active ? '#fff' : 'rgba(255,255,255,0.5)';
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}

function CalIcon({ active }) {
  const c = active ? '#fff' : 'rgba(255,255,255,0.5)';
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function NoteIcon({ active }) {
  const c = active ? '#fff' : 'rgba(255,255,255,0.5)';
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}

function InboxIcon({ active }) {
  const c = active ? '#fff' : 'rgba(255,255,255,0.5)';
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  );
}

function TruckIcon({ active }) {
  const c = active ? '#fff' : 'rgba(255,255,255,0.5)';
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13"/>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)" stroke="none">
      <circle cx="5"  cy="12" r="2"/>
      <circle cx="12" cy="12" r="2"/>
      <circle cx="19" cy="12" r="2"/>
    </svg>
  );
}
