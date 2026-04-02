import { STATIONS } from '../data/stations';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'דשבורד',          icon: '🏠' },
  { id: 'prep',      label: 'רשימת פריפ',       icon: '📋' },
  { id: 'recipes',   label: 'מתכונים',          icon: '📖' },
  { id: 'weekly',    label: 'משימות שבועיות',   icon: '📅' },
];

export default function Sidebar({ currentView, onNavigate, station, user, onChangeCook }) {
  const st = STATIONS[station];

  return (
    <aside className="w-64 bg-slate-900 border-l border-slate-700 flex flex-col min-h-screen" dir="rtl">

      {/* Logo */}
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🍽️</span>
          <div>
            <div className="text-white font-bold text-lg leading-tight">וילה אכדיה</div>
            <div className="text-slate-500 text-xs">מערכת ניהול מטבח</div>
          </div>
        </div>
      </div>

      {/* Cook + Station */}
      <div className="p-4 border-b border-slate-700 space-y-3">
        {/* Cook name */}
        <div className="flex items-center gap-2.5 bg-slate-800 rounded-xl px-3 py-2.5 border border-slate-700">
          <span className="text-xl">👤</span>
          <div className="min-w-0">
            <div className="text-slate-500 text-xs leading-none mb-0.5">טבח</div>
            <div className="text-white font-bold text-sm truncate">{user}</div>
          </div>
        </div>

        {/* Station badge */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 border"
          style={{ borderColor: st.color + '60', backgroundColor: st.color + '15' }}
        >
          <span className="text-xl">{st.emoji}</span>
          <div>
            <div className="text-slate-400 text-xs leading-none mb-0.5">תחנה</div>
            <div className="text-white font-semibold text-sm">{st.name}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-all duration-150
              ${currentView === item.id
                ? 'bg-slate-700 text-white font-semibold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
            {currentView === item.id && (
              <div
                className="mr-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: st.color }}
              />
            )}
          </button>
        ))}
      </nav>

      {/* Change Cook */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={onChangeCook}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                     text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-150"
        >
          <span className="text-xl">🔄</span>
          <span>החלף טבח</span>
        </button>
      </div>

    </aside>
  );
}
