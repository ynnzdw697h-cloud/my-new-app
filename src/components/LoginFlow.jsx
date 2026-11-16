import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, Snowflake, Flame, PackageCheck } from 'lucide-react';
import { STATIONS } from '../data/stations';
import { CHEFS } from '../data/chefs';

const STATION_ICONS = {
  cold:    <Snowflake    size={36} strokeWidth={1.25} />,
  hot:     <Flame        size={36} strokeWidth={1.25} />,
  checker: <PackageCheck size={36} strokeWidth={1.25} />,
};

export default function LoginFlow({ onLogin }) {
  const [step, setStep]                 = useState(1); // 1=pin, 2=welcome + station
  const [selectedChef, setSelectedChef] = useState(null);
  const [authPayload, setAuthPayload]   = useState(null); // { token, tenantId, role, chefId }

  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // The PIN alone identifies the user — the server tells us who it is.
  function onPinSuccess(payload) {
    const chef = CHEFS.find(c => c.id === payload.chefId)
      || { id: payload.chefId, displayName: payload.displayName, role: payload.role };
    setSelectedChef(chef);
    setAuthPayload(payload);
    if (chef.role === 'checker') {
      onLogin(chef.displayName, 'checker', 'checker', payload.tenantId, payload.token);
    } else {
      setStep(2);
    }
  }

  function logoutBack() {
    setSelectedChef(null);
    setAuthPayload(null);
    setStep(1);
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
            <PinStep onSuccess={onPinSuccess} />
          </motion.div>
        )}
        {step === 2 && selectedChef && (
          <motion.div key="step2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="w-full flex justify-center">
            <StationStep user={selectedChef.displayName} allowed={selectedChef.stations} onSelect={pickStation} onBack={logoutBack} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Step 1: PIN pad (the PIN identifies the user) ─── */
function PinStep({ onSuccess }) {
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
        body:    JSON.stringify({ pin: entered }),
      });
      const data = await res.json();
      if (res.ok) {
        setError(false);
        onSuccess(data); // passes { token, chefId, tenantId, role, displayName }
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
      <p className="text-xl font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>הכנס קוד אישי</p>

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

/* ─── Step 2: Welcome + station selection ─── */
function StationStep({ user, allowed, onSelect, onBack }) {
  const stations = Object.values(STATIONS).filter(s => !allowed || allowed.includes(s.id));
  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 min-h-[48px] px-1 text-base font-medium"
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
          לא אני
        </button>
      </div>

      <h2 className="text-center font-bold text-3xl text-white mb-2">ברוך הבא {user}</h2>
      <p className="text-center font-semibold text-lg mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>
        בחר את הפס שלך
      </p>

      <div className="space-y-3">
        {stations.map(station => (
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
