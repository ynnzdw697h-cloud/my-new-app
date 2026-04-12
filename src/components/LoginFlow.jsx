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
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
          style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <UtensilsCrossed size={36} style={{ color: 'rgba(255,255,255,0.7)' }} strokeWidth={1.25} />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight">וילה אכדיה</h1>
        <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{today}</p>
        <div
          className="h-0.5 w-16 mx-auto mt-4 rounded-full"
          style={{ background: 'linear-gradient(90deg, #3b82f6, #ef4444, #10b981)' }}
        />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
            <ChefStep onSelect={pickChef} />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
            <PinStep chef={selectedChef} onSuccess={onPinSuccess} onBack={() => setStep(1)} />
          </motion.div>
        )}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
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
        {CHEFS.map(chef => (
          <button
            key={chef.id}
            onClick={() => onSelect(chef)}
            className="glow-btn rounded-2xl px-4 py-5 text-white font-bold text-base text-center"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex items-center justify-center mb-1.5">
              <ChefHat size={22} style={{ color: 'rgba(255,255,255,0.5)' }} strokeWidth={1.5} />
            </div>
            {chef.displayName}
          </button>
        ))}
      </div>
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
      // Network error — fall back to client-side PIN check so the app still works
      if (entered === chef.pin) {
        onSuccess({ token: null, tenantId: 'villa-acadia', role: chef.role || 'chef', displayName: chef.displayName });
      } else {
        setError(true);
        setTimeout(() => { setPin(''); setError(false); }, 700);
      }
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
              boxShadow: i < pin.length && !error ? '0 0 10px #3B82F6aa' : 'none',
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
                className="rounded-2xl h-20 flex items-center justify-center text-2xl active:scale-90 transition-transform"
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
                className="rounded-2xl h-20 flex items-center justify-center text-lg active:scale-90 transition-transform font-black"
                style={{
                  background: pin.length === 4 ? '#3B82F6' : 'rgba(255,255,255,0.06)',
                  color: pin.length === 4 ? '#fff' : 'rgba(255,255,255,0.25)',
                  boxShadow: pin.length === 4 ? '0 0 18px #3B82F688' : 'none',
                  transition: 'all 0.2s ease',
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
              className="rounded-2xl h-20 flex items-center justify-center text-2xl font-bold active:scale-90 transition-transform"
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
          className="flex items-center gap-1.5 text-sm font-medium"
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
            className="glow-btn w-full group relative rounded-3xl p-6 flex items-center gap-5 overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              border: `1px solid ${station.color}30`,
              boxShadow: `0 4px 20px ${station.color}12`,
              '--gc':  station.color,
              '--gca': station.color + '55',
              '--gcb': station.color + '1a',
            }}
          >
            <div className="absolute inset-0 opacity-0 group-active:opacity-10 transition-opacity" style={{ background: station.color }} />
            <span
              className="relative z-10 w-16 h-16 flex items-center justify-center rounded-2xl flex-shrink-0"
              style={{ background: station.color + '18', border: `1px solid ${station.color}30`, color: station.color }}
            >
              {STATION_ICONS[station.id] || <PackageCheck size={36} strokeWidth={1.25} />}
            </span>
            <div className="relative z-10 text-right">
              <div className="text-white font-black text-xl">{station.name}</div>
              <div className="h-1 w-8 rounded-full mt-2" style={{ background: station.color }} />
            </div>
            <svg className="mr-auto relative z-10 opacity-30" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
