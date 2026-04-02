import { STATIONS } from '../data/stations';

export default function StationSelect({ onSelect }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" dir="rtl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🍽️</div>
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
          מטבח מקצועי
        </h1>
        <p className="text-slate-400 text-lg">
          מערכת ניהול מטבח
        </p>
        <div className="mt-4 h-1 w-24 mx-auto rounded-full bg-gradient-to-l from-blue-500 via-red-500 to-emerald-500"></div>
      </div>

      {/* Station Cards */}
      <div className="w-full max-w-3xl">
        <h2 className="text-center text-slate-300 text-xl mb-8 font-medium">
          בחר את התחנה שלך
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(STATIONS).map((station) => (
            <button
              key={station.id}
              onClick={() => onSelect(station.id)}
              className="group relative bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center
                         hover:border-slate-500 hover:bg-slate-700 hover:scale-105
                         transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl"
            >
              {/* Glow effect on hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                style={{ backgroundColor: station.color }}
              ></div>

              <div className="relative z-10">
                <div className="text-6xl mb-4">{station.emoji}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{station.name}</h3>
                <div
                  className="h-1 w-12 mx-auto rounded-full mt-3"
                  style={{ backgroundColor: station.color }}
                ></div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-12 text-slate-600 text-sm">
        {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}
