import { STATIONS } from '../data/stations';

export default function StationSelect({ onSelect }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" dir="rtl">

      {/* Header */}
      <div className="text-center mb-12">
        <div
          className="w-24 h-24 mx-auto mb-5 rounded-3xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span style={{ fontSize: '48px', lineHeight: 1 }}>🍽️</span>
        </div>
        <h1 className="text-display text-text-primary mb-2 tracking-tight">
          מטבח מקצועי
        </h1>
        <p className="text-body text-text-tertiary">
          מערכת ניהול מטבח
        </p>
        <div className="mt-5 h-0.5 w-20 mx-auto rounded-full bg-gradient-to-l from-station-cold via-station-hot to-station-checker" />
      </div>

      {/* Station cards */}
      <div className="w-full max-w-3xl">
        <h2 className="text-center text-text-secondary text-h3 mb-8 font-medium">
          בחר את התחנה שלך
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Object.values(STATIONS).map((station) => (
            <button
              key={station.id}
              onClick={() => onSelect(station.id)}
              className="group relative rounded-3xl p-8 text-center
                         transition-all duration-300 active:scale-[0.97] glow-btn cursor-pointer"
              style={{
                background: 'var(--bg-surface)',
                border: `1px solid var(--border)`,
                '--gc': station.color,
                '--gca': station.color + '55',
                '--gcb': station.color + '1A',
              }}
            >
              {/* Station color glow fill */}
              <div
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-[0.07] transition-opacity duration-300"
                style={{ backgroundColor: station.color }}
              />

              <div className="relative z-10">
                {/* Station identity: dot + name, no emoji */}
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: station.color + '1A', border: `1px solid ${station.color}35` }}
                >
                  <div
                    className="w-5 h-5 rounded-full"
                    style={{ background: station.color, boxShadow: `0 0 16px ${station.color}80` }}
                  />
                </div>
                <h3 className="text-h2 text-text-primary mb-3">{station.name}</h3>
                <div
                  className="h-0.5 w-10 mx-auto rounded-full"
                  style={{ backgroundColor: station.color }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-12 text-meta text-text-disabled">
        {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}
