import { motion } from 'framer-motion';
import { ClipboardList, BookOpen, ChevronLeft, Moon as MoonIcon, Camera, PackageCheck, ShoppingCart, Fish, BarChart3, Sparkles } from 'lucide-react';
import { useRef, useEffect, useState, useCallback } from 'react';
import { STATIONS } from '../data/stations';
import { PREP_TASKS } from '../data/prepTasks';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useTenantId } from '../context/TenantContext';

/* ── Time-of-day helpers ── */
function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

const GREETING = {
  morning:   'בוקר טוב,',
  afternoon: 'צהריים טובים,',
  evening:   'ערב טוב,',
};

const TIME_PALETTE = {
  morning:   { primary: '#F59E0B', glow: 'rgba(245,158,11,0.28)', bg: 'rgba(245,158,11,0.10)' },
  afternoon: { primary: '#F97316', glow: 'rgba(249,115,22,0.24)', bg: 'rgba(249,115,22,0.09)' },
  evening:   { primary: '#3B82F6', glow: 'rgba(59,130,246,0.24)', bg: 'rgba(59,130,246,0.09)' },
};

/* ── Sun SVG (rotating rays) ── */
function Sun() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 24, ease: 'linear', repeat: Infinity }}
      style={{ width: 120, height: 120, position: 'relative' }}
    >
      {/* Rays */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: 3, height: 28,
            marginLeft: -1.5, marginTop: -60,
            borderRadius: 99,
            background: 'rgba(251,191,36,0.7)',
            transformOrigin: '50% 60px',
            transform: `rotate(${i * 45}deg)`,
          }}
        />
      ))}
      {/* Core */}
      <div
        style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: 52, height: 52,
          marginTop: -26, marginLeft: -26,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #FDE68A 30%, #F59E0B 100%)',
          boxShadow: '0 0 28px rgba(251,191,36,0.7), 0 0 60px rgba(245,158,11,0.4)',
        }}
      />
    </motion.div>
  );
}

/* ── Moon (lucide icon + glow) ── */
function Moon() {
  return (
    <div style={{ width: 100, height: 100, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'absolute',
          width: 90, height: 90,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(147,197,253,0.22) 0%, transparent 70%)',
        }}
      />
      <motion.div
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
        style={{ filter: 'drop-shadow(0 0 14px rgba(147,197,253,0.75))' }}
      >
        <MoonIcon size={52} style={{ color: '#93c5fd' }} strokeWidth={1.25} />
      </motion.div>
    </div>
  );
}

/* ── Compress image to base64 ── */
function compressImage(file, maxWidth = 300, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('שגיאה בקריאת התמונה'));
    img.src = url;
  });
}

/* ── Hook: load/save chef avatars from Firestore ── */
function useChefAvatars() {
  const tenantId              = useTenantId();
  const [avatars, setAvatars] = useState({});
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'tenants', tenantId, 'kitchen', 'chef_avatars'), snap => {
      if (snap.exists()) setAvatars(snap.data());
    });
    return unsub;
  }, [tenantId]);
  const saveAvatar = useCallback(async (name, data) => {
    await setDoc(doc(db, 'tenants', tenantId, 'kitchen', 'chef_avatars'), { [name]: data }, { merge: true });
  }, [tenantId]);
  return { avatars, saveAvatar };
}

/* ── Avatar — shows photo or initials, tap to change ── */
function Avatar({ name, color, avatarData, onUpload }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [cropUrl, setCropUrl]     = useState(null);

  // Support both legacy string format and new { url, x, y } format
  const avatarUrl = avatarData?.url || (typeof avatarData === 'string' ? avatarData : null);
  const objX      = avatarData?.x ?? 50;
  const objY      = avatarData?.y ?? 50;

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await compressImage(file, 600, 0.88);
      setCropUrl(base64);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleCropConfirm({ x, y }) {
    await onUpload({ url: cropUrl, x, y });
    setCropUrl(null);
  }

  return (
    <>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => fileRef.current.click()}
          style={{
            width: 48, height: 48,
            borderRadius: '50%',
            overflow: 'hidden',
            border: `2px solid ${color}55`,
            boxShadow: `0 0 14px ${color}40`,
            cursor: 'pointer',
            background: color + '25',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${objX}% ${objY}%` }}
            />
          ) : (
            <span style={{ fontSize: 20, fontWeight: 900, color }}>{name ? name.slice(0, 1) : '?'}</span>
          )}
        </motion.button>

        {/* Camera badge */}
        <div
          style={{
            position: 'absolute', bottom: -2, left: -2,
            width: 18, height: 18, borderRadius: '50%',
            background: color, border: '2px solid #121212',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {uploading ? <span style={{ fontSize: 7, color: '#fff' }}>…</span> : <Camera size={9} style={{ color: '#fff' }} strokeWidth={2} />}
        </div>

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      </div>

      {cropUrl && (
        <CropModal
          url={cropUrl}
          color={color}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropUrl(null)}
        />
      )}
    </>
  );
}

/* ── Crop Modal — drag to position face in the circle ── */
function CropModal({ url, color, onConfirm, onCancel }) {
  const [pos, setPos]     = useState({ x: 50, y: 50 });
  const [saving, setSaving] = useState(false);
  const dragRef           = useRef(null);

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, posX: pos.x, posY: pos.y };
  }

  function onPointerMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    // 0.3 → each 100px drag shifts position ~30%
    const s  = 0.3;
    setPos({
      x: Math.max(0, Math.min(100, dragRef.current.posX - dx * s)),
      y: Math.max(0, Math.min(100, dragRef.current.posY - dy * s)),
    });
  }

  async function handleSave() {
    setSaving(true);
    await onConfirm(pos);
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 p-6"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(14px)' }}
      dir="rtl"
    >
      <p className="text-white font-bold text-lg">מרכז את התמונה</p>
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>גרור כדי למקם את הפנים</p>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { dragRef.current = null; }}
        style={{
          width: 220, height: 220,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `3px solid ${color}`,
          boxShadow: `0 0 40px ${color}55`,
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <img
          src={url}
          alt=""
          draggable={false}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            objectPosition: `${pos.x}% ${pos.y}%`,
            pointerEvents: 'none',
          }}
        />
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={onCancel}
          className="flex-1 rounded-2xl py-3.5 font-bold text-sm"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
        >
          ביטול
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-2xl py-3.5 font-bold text-sm"
          style={{ background: color, color: '#fff', opacity: saving ? 0.7 : 1, boxShadow: `0 0 20px ${color}60` }}
        >
          {saving ? '...' : 'שמור'}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Shared Hero Card
════════════════════════════════════════════ */
function HeroCard({ user, st, tod, palette, avatars, saveAvatar, done, total, pct, showProgress }) {
  const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', month: 'long', day: 'numeric' });
  const isDay = tod !== 'evening';

  return (
    <div
      className="relative rounded-3xl overflow-hidden p-6"
      style={{
        background: `linear-gradient(135deg, ${palette.bg} 0%, rgba(255,255,255,0.02) 70%, #16161e 100%)`,
        border: `1px solid ${palette.primary}28`,
        boxShadow: `0 8px 40px ${palette.glow}`,
      }}
    >
      <div style={{ position: 'absolute', top: isDay ? -30 : -20, left: isDay ? -30 : -20, opacity: 0.9, pointerEvents: 'none' }}>
        {isDay ? <Sun /> : <Moon />}
      </div>
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20 pointer-events-none" style={{ background: palette.primary, filter: 'blur(55px)' }} />

      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      >
        <p className="text-xs font-medium mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{today}</p>
        <div className="flex items-center gap-3 mb-1">
          <Avatar name={user} color={palette.primary} avatarData={avatars[user]} onUpload={data => saveAvatar(user, data)} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>{GREETING[tod]}</p>
            <h1 className="text-2xl font-black leading-tight" style={{ color: palette.primary }}>{user}</h1>
          </div>
        </div>

        {showProgress && (
          <>
            <p className="mt-2 text-sm flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: palette.primary, display: 'inline-block', flexShrink: 0 }} />
              {st.name} — {done === total && total > 0 ? (
                <span className="inline-flex items-center gap-1">
                  כל המשימות הושלמו
                  <Sparkles size={12} strokeWidth={1.5} style={{ color: palette.primary }} />
                </span>
              ) : `נותרו ${total - done} משימות`}
            </p>
            <div className="mt-5">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{done} / {total} משימות</span>
                <span className="text-4xl font-black" style={{ color: palette.primary, lineHeight: 1 }}>{pct}%</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
                  style={{ background: `linear-gradient(90deg, ${palette.primary}cc, ${palette.primary})`, boxShadow: `0 0 12px ${palette.primary}80` }}
                />
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Main Dashboard
════════════════════════════════════════════ */
export default function Dashboard({ station, user, completedTasks, onNavigate, role }) {
  const st       = STATIONS[station];
  const tod      = getTimeOfDay();
  const palette  = TIME_PALETTE[tod];
  const { avatars, saveAvatar } = useChefAvatars();

  const myTasks   = PREP_TASKS[station] || [];
  const done      = myTasks.filter(t => completedTasks.has(t.id)).length;
  const total     = myTasks.length;
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;

  const pending   = myTasks.filter(t => !completedTasks.has(t.id));

  const isChecker = role === 'checker';

  /* ── Checker / Manager view ── */
  if (isChecker) {
    return (
      <div className="px-4 py-5 space-y-4 max-w-xl mx-auto" dir="rtl">
        <HeroCard
          user={user} st={st} tod={tod} palette={palette}
          avatars={avatars} saveAvatar={saveAvatar}
          done={0} total={0} pct={0} showProgress={false}
        />

        {/* Quick actions */}
        <div>
          <p className="text-xs font-bold mb-3 px-1" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
            פעולות ניהול
          </p>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction Icon={PackageCheck} label="קבלת סחורה"    sub="סריקה ובדיקה"       color="#10b981" onClick={() => onNavigate('checker_hub')} />
            <QuickAction Icon={ShoppingCart} label="הזמנות ספקים"  sub="עלה עלה, דגים, יבש" color="#8b5cf6" onClick={() => onNavigate('supplier')} />
            <QuickAction Icon={Fish}         label="ספירת חיות"    sub="סוף יום"            color="#f59e0b" onClick={() => onNavigate('proteins')} />
          </div>
        </div>

        {/* All-station status */}
        <SectionCard title="סטטוס תחנות" Icon={BarChart3}>
          <div className="space-y-3">
            {Object.values(STATIONS).filter(s => s.id !== 'checker').map(s => {
              const tasks  = PREP_TASKS[s.id] || [];
              const doneN  = tasks.filter(t => completedTasks.has(t.id)).length;
              const totalN = tasks.length;
              const p      = totalN > 0 ? Math.round((doneN / totalN) * 100) : 0;
              const statusColor = p === 100 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444';
              return (
                <div key={s.id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-white flex items-center gap-1.5">
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                      {s.name}
                    </span>
                    <span style={{ color: statusColor, fontWeight: 700 }}>{p}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${p}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      style={{ backgroundColor: statusColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    );
  }

  /* ── Line Cook view ── */
  return (
    <div className="px-4 py-5 max-w-xl mx-auto" dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <HeroCard
        user={user} st={st} tod={tod} palette={palette}
        avatars={avatars} saveAvatar={saveAvatar}
        done={done} total={total} pct={pct} showProgress
      />

      {/* Urgent alert — visible only when there are pending tasks */}
      <UrgentAlertBanner pending={pending} />

      {/* Cockpit nav cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <CockpitCard
          Icon={ClipboardList}
          label="משימות יומיות"
          sub="נהל את משימות ההכנה של התחנה"
          onClick={() => onNavigate('prep')}
        />
        <CockpitCard
          Icon={BookOpen}
          label="ספר מתכונים"
          sub="עיין בכל המתכונים של התחנה"
          onClick={() => onNavigate('recipes')}
        />
      </div>
    </div>
  );
}

/* ─── Urgent Alert Banner ─── */
function UrgentAlertBanner({ pending }) {
  if (!pending || pending.length === 0) return null;
  const topTask = pending[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        background: '#0f0f0f',
        border: '1px solid rgba(239,68,68,0.28)',
        borderRadius: 14,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 0 0 1px rgba(239,68,68,0.08), 0 4px 24px rgba(239,68,68,0.08)',
      }}
    >
      {/* Pulsing dot */}
      <div style={{ position: 'relative', flexShrink: 0, width: 10, height: 10 }}>
        <motion.div
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity }}
          style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', position: 'absolute' }}
        />
        <motion.div
          animate={{ scale: [1, 1.9, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.6, ease: 'easeOut', repeat: Infinity }}
          style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', position: 'absolute' }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.7)', marginBottom: 2 }}>
          דרוש לסרוויס
        </p>
        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {topTask.task}
          {topTask.estimatedTime && (
            <span style={{ color: 'rgba(255,255,255,0.38)', fontWeight: 400 }}> — {topTask.estimatedTime}</span>
          )}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Cockpit Nav Card ─── */
function CockpitCard({ Icon, label, sub, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileTap={{ scale: 0.98 }}
      animate={{ borderColor: hovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)' }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'relative',
        minHeight: 116,
        width: '100%',
        borderRadius: 20,
        padding: '22px 24px',
        textAlign: 'right',
        background: '#161616',
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      {/* Left — chevron */}
      <ChevronLeft size={18} style={{ color: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />

      {/* Center — text (fills space, RTL so it's on the right visually) */}
      <div style={{ flex: 1, textAlign: 'right' }}>
        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 5 }}>
          {label}
        </p>
        <p style={{ fontSize: '0.75rem', fontWeight: 400, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.01em' }}>
          {sub}
        </p>
      </div>

      {/* Right — icon (top-right in RTL = visually top-left of the card) */}
      <div style={{ flexShrink: 0, padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} style={{ color: '#60a5fa' }} strokeWidth={1.5} />
      </div>
    </motion.button>
  );
}

/* ─── Sub-components ─── */
function SectionCard({ title, Icon, children, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`rounded-3xl p-5 w-full text-right ${onClick ? 'glow-btn' : ''}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={16} style={{ color: 'rgba(255,255,255,0.4)' }} strokeWidth={1.5} />}
        <span className="text-white font-bold text-base">{title}</span>
        {onClick && <span className="mr-auto text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>הצג הכל ←</span>}
      </div>
      {children}
    </Wrapper>
  );
}

function QuickAction({ Icon, label, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="glow-btn rounded-3xl p-5 text-right w-full"
      style={{ background: color + '12', border: `1px solid ${color}25`, '--gc': color, '--gca': color + '50', '--gcb': color + '18' }}
    >
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3" style={{ background: color + '20' }}>
        {Icon && <Icon size={22} style={{ color }} strokeWidth={1.5} />}
      </span>
      <div className="text-white font-bold text-sm leading-tight">{label}</div>
      <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</div>
    </button>
  );
}
