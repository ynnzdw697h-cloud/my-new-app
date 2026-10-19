import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, User, Snowflake, Flame, PackageCheck, ChefHat } from 'lucide-react';
import { STATIONS } from '../data/stations';
import { CHEFS } from '../data/chefs';

const STATION_ICONS = {
  cold:    <Snowflake    size={36} strokeWidth={1.25} />,
  hot:     <Flame        size={36} strokeWidth={1.25} />,
  checker: <PackageCheck size={36} strokeWidth={1.25} />,
};

export default function LoginFlow({ onLogin }) {
  const [step, setStep]                 = useState(1); // 1=pick chef, 2=pin, 3=station
  const [selectedChef, setSelectedChef] = useState(null);
  const [authPayload, setAuthPayload]   = useState(null); // { token, tenantId, role }

  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  function pickChef(chef) {
    setSelectedChef(chef);
    setStep(2);
  }

  function onPinSuccess(payload) {
    setAuthPayload(payload);
    if (payload.role === 'checker') {
      onLogin(selectedChef.displayName, 'checker', 'checker', payload.tenantId, payload.token);
    } else {
      setStep(3);
    }
  }

  function pickStation(stationId) {
    onLogin(
      selectedChef.displayName,
      stationId,
      selectedChef.role || 'chef',
      authPayload?.tenantId,
      authPayload?.token,
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-5"
      style={{ background: 'var(--bg)' }}
      dir="rtl"
    >
      {/* Logo */}
      <div className="text-center mb-10">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <UtensilsCrossed size={36} style={{ color: 'rgba(255,255,255,0.7)' }} strokeWidth={1.25} />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">וילה אכדיה</h1>
        <p className="text-base mt-2" style={{ color: 'rgba(255,255,255,0.62)' }}>{today}</p>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="w-full flex justify-center">
            <ChefStep onSelect={pickChef} />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="w-full flex justify-center">
            <PinStep chef={selectedChef} onSuccess={onPinSuccess} onBack={() => setStep(1)} />
          </motion.div>
        )}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="w-full flex justify-center">
            <StationStep user={selectedChef.displayName} onSelect={pickStation} onBack={() => setStep(2)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Step 1: Pick chef ─── */
function ChefStep({ onSelect }) {
  return (
    <div className="w-full max-w-md">
      <p className="text-center font-bold text-xl mb-6" style={{ color: 'rgba(255,255,255,0.85)' }}>
        מי אתה?
      </p>
      <div className="grid grid-cols-2 gap-3">
        {CHEFS.filter(c => c.role !== 'checker').map(chef => (
          <button
            key={chef.id}
            onClick={() => onSelect(chef)}
            className="rounded-xl px-4 py-5 min-h-[88px] text-white font-semibold text-lg text-center transition-colors duration-150 active:bg-white/10"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-center mb-1.5">
              <ChefHat size={22} style={{ color: 'rgba(255,255,255,0.5)' }} strokeWidth={1.5} />
            </div>
            {chef.displayName}
          </button>
        ))}
      </div>

      {CHEFS.some(c => c.role === 'checker') && (
        <>
          <p className="text-center text-sm font-semibold mt-7 mb-3 text-text-tertiary">קבלת סחורה</p>
          {CHEFS.filter(c => c.role === 'checker').map(chef => (
            <button
              key={chef.id}
              onClick={() => onSelect(chef)}
              className="w-full rounded-xl px-4 min-h-[64px] flex items-center justify-center gap-2.5 text-white font-semibold text-lg transition-colors duration-150 active:bg-white/10"
              style={{ background: 'var(--bg-card)', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              <PackageCheck size={22} style={{ color: '#10B981' }} strokeWidth={1.75} aria-hidden="true" />
              {chef.displayName}
            </button>
          ))}
        </>
      )}
    </div>
  );
}

/* ─── Step 2: PIN pad ─── */
function PinStep({ chef, onSuccess, onBack }) {
  const [pin, setPin]         = useState('');
  const [error, setError]     = useState(false);
  const [loading, setLoading] = useState(false);

  function press(digit) {
    if (pin.length >= 4 || loading) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) validate(next);
  }

  function del() {
    if (loading) return;
    setPin(p => p.slice(0, -1));
    setError(false);
  }

  async function validate(entered) {
    setLoading(true);
    try {
      const res  = await fetch('/api/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ chefId: chef.id, pin: entered }),
      });
      const data = await res.json();
      if (res.ok) {
        setError(false);
        onSuccess(data); // passes { token, tenantId, role, displayName }
      } else {
        setError(true);
        setTimeout(() => { setPin(''); setError(false); }, 700);
      }
    } catch {
      // Network error — PINs are only checked server-side, so just reject and let them retry
      setError(true);
      setTimeout(() => { setPin(''); setError(false); }, 700);
    } finally {
      setLoading(false);
    }
  }

  const PAD = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['del','0','ok'],
  ];

  return (
    <div className="w-full max-w-xs flex flex-col items-center gap-7">
      {/* Back */}
      <div className="w-full flex items-center justify-between gap-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-medium min-h-[44px] px-2"
          style={{ color: 'rgba(255,255,255,0.62)' }}
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
          <ChefHat size={16} style={{ color: 'rgba(255,255,255,0.5)' }} strokeWidth={1.5} />
          <span className="text-white font-bold text-sm">{chef.displayName}</span>
        </div>
      </div>

      <p className="text-xl font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>הכנס קוד PIN</p>

      {/* Dots */}
      <motion.div
        animate={error ? { x: [-8, 8, -6, 6, -4, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex gap-4"
      >
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className="w-4 h-4 rounded-full transition-all duration-200"
            style={{
              background: i < pin.length
                ? (error ? '#ef4444' : '#3B82F6')
                : 'rgba(255,255,255,0.15)',
              boxShadow: i < pin.length && !error ? 'none' : 'none',
            }}
          />
        ))}
      </motion.div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-4 w-full">
        {PAD.flat().map((key, i) => {
          if (key === 'del') {
            return (
              <button
                key={i}
                onClick={del}
                aria-label="מחק ספרה"
                className="rounded-xl h-20 flex items-center justify-center text-2xl transition-colors duration-150 active:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
              >
                ⌫
              </button>
            );
          }
          if (key === 'ok') {
            return (
              <button
                key={i}
                onClick={() => pin.length === 4 && !loading && validate(pin)}
                aria-label="אישור"
                className="rounded-xl h-20 flex items-center justify-center text-2xl font-bold"
                style={{
                  background: pin.length === 4 ? '#3B82F6' : 'rgba(255,255,255,0.06)',
                  color: pin.length === 4 ? '#fff' : 'rgba(255,255,255,0.5)',
                  transition: 'background-color 0.15s, color 0.15s',
                }}
              >
                ✓
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => press(key)}
              className="rounded-xl h-20 flex items-center justify-center text-2xl font-semibold transition-colors duration-150 active:bg-white/10"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'white' }}
            >
              {key}
            </button>
          );
        })}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="text-sm font-semibold"
          style={{ color: '#ef4444' }}
        >
          קוד שגוי — נסה שוב
        </motion.p>
      )}
    </div>
  );
}

/* ─── Step 3: Station selection ─── */
function StationStep({ user, onSelect, onBack }) {
  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 min-h-[48px] px-1 text-base font-medium"
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
          חזרה
        </button>
        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-2"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)' }}
        >
          <User size={16} style={{ color: 'rgba(255,255,255,0.5)' }} strokeWidth={1.5} />
          <span className="text-white font-bold text-sm">{user}</span>
        </div>
      </div>

      <p className="text-center font-bold text-xl mb-6" style={{ color: 'rgba(255,255,255,0.85)' }}>
        בחר את הפס שלך
      </p>

      <div className="space-y-3">
        {Object.values(STATIONS).map(station => (
          <button
            key={station.id}
            onClick={() => onSelect(station.id)}
            className="w-full rounded-xl p-5 min-h-[96px] flex items-center gap-5 transition-colors duration-150 active:bg-white/10"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <span
              className="w-16 h-16 flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: station.color + '18', border: `1px solid ${station.color}30`, color: station.color }}
            >
              {STATION_ICONS[station.id] || <PackageCheck size={36} strokeWidth={1.25} />}
            </span>
            <div className="text-right text-white font-semibold text-xl">{station.name}</div>
            <svg className="mr-auto opacity-30" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
