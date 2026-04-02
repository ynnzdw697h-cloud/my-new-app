import { useState } from 'react';
import { STATIONS } from '../data/stations';

const COOKS = [
  'ימסקי',
  'קיידי',
  'שונצה',
  'נועם הנמוך',
  'נועם הגבוה',
  'אורטל',
  'אור',
  'ניצן',
];

export default function LoginFlow({ onLogin }) {
  const [step, setStep] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);

  function pickName(name) {
    setSelectedUser(name);
    setStep(2);
  }

  function pickStation(stationId) {
    onLogin(selectedUser, stationId);
  }

  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900" dir="rtl">

      {/* Logo */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">🍽️</div>
        <h1 className="text-4xl font-black text-white tracking-tight">וילה אכדיה</h1>
        <p className="text-slate-500 text-sm mt-1">{today}</p>
        <div className="mt-4 h-1 w-20 mx-auto rounded-full bg-gradient-to-l from-blue-500 via-red-500 to-emerald-500" />
      </div>

      {step === 1 && (
        <NameStep onSelect={pickName} />
      )}

      {step === 2 && (
        <StationStep
          user={selectedUser}
          onSelect={pickStation}
          onBack={() => setStep(1)}
        />
      )}
    </div>
  );
}

/* ─── Step 1: Name selection ─────────────────────────────────── */
function NameStep({ onSelect }) {
  return (
    <div className="w-full max-w-lg">
      <h2 className="text-center text-slate-300 text-xl font-semibold mb-6">
        מי אתה?
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {COOKS.map(name => (
          <button
            key={name}
            onClick={() => onSelect(name)}
            className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-5
                       text-white font-bold text-base text-center
                       hover:bg-slate-700 hover:border-slate-500 hover:scale-105
                       active:scale-95 transition-all duration-200 shadow-md"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 2: Station selection ──────────────────────────────── */
function StationStep({ user, onSelect, onBack }) {
  return (
    <div className="w-full max-w-xl">
      {/* Selected user banner */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <span>→</span> חזרה
        </button>
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2">
          <span className="text-lg">👤</span>
          <span className="text-white font-bold">{user}</span>
        </div>
      </div>

      <h2 className="text-center text-slate-300 text-xl font-semibold mb-6">
        בחר את הפס שלך
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.values(STATIONS).map(station => (
          <button
            key={station.id}
            onClick={() => onSelect(station.id)}
            className="group relative bg-slate-800 border border-slate-700 rounded-2xl p-8
                       text-center hover:border-slate-500 hover:bg-slate-700 hover:scale-105
                       active:scale-95 transition-all duration-200 shadow-lg hover:shadow-2xl"
          >
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"
              style={{ backgroundColor: station.color }}
            />
            <div className="relative z-10">
              <div className="text-5xl mb-3">{station.emoji}</div>
              <div className="text-xl font-bold text-white">{station.name}</div>
              <div
                className="h-1 w-10 mx-auto rounded-full mt-3"
                style={{ backgroundColor: station.color }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
