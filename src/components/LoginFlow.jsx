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
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-5"
      style={{ background: 'var(--bg)' }}
      dir="rtl"
    >
      {/* Logo */}
      <div className="text-center mb-10">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5"
          style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          🍽️
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight">וילה אכדיה</h1>
        <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{today}</p>
        <div
          className="h-0.5 w-16 mx-auto mt-4 rounded-full"
          style={{ background: 'linear-gradient(90deg, #3b82f6, #ef4444, #10b981)' }}
        />
      </div>

      {step === 1 && <NameStep onSelect={pickName} />}
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

function NameStep({ onSelect }) {
  return (
    <div className="w-full max-w-md">
      <p
        className="text-center font-semibold text-lg mb-6"
        style={{ color: 'rgba(255,255,255,0.6)' }}
      >
        מי אתה?
      </p>
      <div className="grid grid-cols-2 gap-3">
        {COOKS.map(name => (
          <button
            key={name}
            onClick={() => onSelect(name)}
            className="rounded-2xl px-4 py-5 text-white font-bold text-base text-center
                       active:scale-95 transition-all duration-150"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function StationStep({ user, onSelect, onBack }) {
  return (
    <div className="w-full max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors active:scale-95"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
          חזרה
        </button>

        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-2"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)' }}
        >
          <span className="text-base">👤</span>
          <span className="text-white font-bold text-sm">{user}</span>
        </div>
      </div>

      <p
        className="text-center font-semibold text-lg mb-6"
        style={{ color: 'rgba(255,255,255,0.6)' }}
      >
        בחר את הפס שלך
      </p>

      <div className="space-y-3">
        {Object.values(STATIONS).map(station => (
          <button
            key={station.id}
            onClick={() => onSelect(station.id)}
            className="w-full group relative rounded-3xl p-6 flex items-center gap-5
                       active:scale-[0.98] transition-all duration-150 overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              border: `1px solid ${station.color}30`,
              boxShadow: `0 4px 20px ${station.color}12`,
            }}
          >
            {/* BG glow */}
            <div
              className="absolute inset-0 opacity-0 group-active:opacity-10 transition-opacity"
              style={{ background: station.color }}
            />

            <span
              className="relative z-10 text-4xl w-16 h-16 flex items-center justify-center rounded-2xl flex-shrink-0"
              style={{ background: station.color + '18', border: `1px solid ${station.color}30` }}
            >
              {station.emoji}
            </span>

            <div className="relative z-10 text-right">
              <div className="text-white font-black text-xl">{station.name}</div>
              <div
                className="h-1 w-8 rounded-full mt-2"
                style={{ background: station.color }}
              />
            </div>

            {/* Arrow */}
            <svg
              className="mr-auto relative z-10 opacity-30"
              width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"
            >
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
