import { motion } from 'framer-motion';
import { useRef, useEffect, useState, useCallback } from 'react';
import { STATIONS } from '../data/stations';
import { PREP_TASKS } from '../data/prepTasks';
import { RECIPES } from '../data/recipes';
import { WEEKLY_TASKS } from '../data/weeklyTasks';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

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

/* ── Moon SVG (static, soft glow) ── */
function Moon() {
  return (
    <div style={{ width: 100, height: 100, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          width: 90, height: 90,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(147,197,253,0.25) 0%, transparent 70%)',
        }}
      />
      {/* Crescent via clip */}
      <motion.div
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
        style={{ position: 'relative', width: 50, height: 50 }}
      >
        <div
          style={{
            width: 50, height: 50,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 40%, #E0F2FE, #BAE6FD)',
            boxShadow: '0 0 20px rgba(147,197,253,0.6), 0 0 50px rgba(59,130,246,0.25)',
          }}
        />
        {/* Overlay circle to create crescent */}
        <div
          style={{
            position: 'absolute',
            top: -4, right: -8,
            width: 44, height: 44,
            borderRadius: '50%',
            background: '#121212',
          }}
        />
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
  const [avatars, setAvatars] = useState({});
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'kitchen', 'chef_avatars'), snap => {
      if (snap.exists()) setAvatars(snap.data());
    });
    return unsub;
  }, []);
  const saveAvatar = useCallback(async (name, base64) => {
    await setDoc(doc(db, 'kitchen', 'chef_avatars'), { [name]: base64 }, { merge: true });
  }, []);
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
            fontSize: 9, pointerEvents: 'none',
          }}
        >
          {uploading ? '…' : '📷'}
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
   Main Dashboard
════════════════════════════════════════════ */
export default function Dashboard({ station, user, completedTasks, onNavigate }) {
  const st       = STATIONS[station];
  const tod      = getTimeOfDay();
  const palette  = TIME_PALETTE[tod];
  const { avatars, saveAvatar } = useChefAvatars();

  const myTasks   = PREP_TASKS[station] || [];
  const done      = myTasks.filter(t => completedTasks.has(t.id)).length;
  const total     = myTasks.length;
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;

  const myRecipes = RECIPES.filter(r => r.station === station);
  const myWeekly  = WEEKLY_TASKS.filter(t => t.assignedTo === station);
  const pending   = myTasks.filter(t => !completedTasks.has(t.id));

  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const isDay = tod !== 'evening';

  return (
    <div className="px-4 py-5 space-y-4 max-w-xl mx-auto" dir="rtl">

      {/* ── Hero card ── */}
      <div
        className="relative rounded-3xl overflow-hidden p-6"
        style={{
          background: `linear-gradient(135deg, ${palette.bg} 0%, rgba(255,255,255,0.02) 70%, #16161e 100%)`,
          border: `1px solid ${palette.primary}28`,
          boxShadow: `0 8px 40px ${palette.glow}`,
        }}
      >
        {/* Sun / Moon — top-left, partially clipped */}
        <div
          style={{
            position: 'absolute',
            top: isDay ? -30 : -20,
            left: isDay ? -30 : -20,
            opacity: 0.9,
            pointerEvents: 'none',
          }}
        >
          {isDay ? <Sun /> : <Moon />}
        </div>

        {/* Ambient glow blob */}
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20 pointer-events-none"
          style={{ background: palette.primary, filter: 'blur(55px)' }}
        />

        {/* Content — slide down + fade in */}
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Date */}
          <p className="text-xs font-medium mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{today}</p>

          {/* Avatar + Greeting */}
          <div className="flex items-center gap-3 mb-1">
            <Avatar name={user} color={palette.primary} avatarData={avatars[user]} onUpload={data => saveAvatar(user, data)} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {GREETING[tod]}
              </p>
              <h1 className="text-2xl font-black leading-tight" style={{ color: palette.primary }}>
                {user}
              </h1>
            </div>
          </div>

          <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {st.emoji} {st.name} — {done === total && total > 0 ? 'כל המשימות הושלמו 🎉' : `נותרו ${total - done} משימות`}
          </p>

          {/* Progress */}
          <div className="mt-5">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {done} / {total} משימות
              </span>
              <span className="text-4xl font-black" style={{ color: palette.primary, lineHeight: 1 }}>
                {pct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
                style={{
                  background: `linear-gradient(90deg, ${palette.primary}cc, ${palette.primary})`,
                  boxShadow: `0 0 12px ${palette.primary}80`,
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Stat row ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="משימות" value={`${done}/${total}`} sub="פריפ"    color={st.color} onClick={() => onNavigate('prep')} />
        <StatCard label="מתכונים" value={myRecipes.length}  sub="במאגר"   color={st.color} onClick={() => onNavigate('recipes')} />
        <StatCard label="שבועי"   value={myWeekly.length}   sub="משימות"  color={st.color} onClick={() => onNavigate('weekly')} />
      </div>

      {/* ── Pending tasks ── */}
      <SectionCard title="משימות ממתינות" icon="⏳" onClick={() => onNavigate('prep')}>
        {pending.length === 0 ? (
          <div className="flex items-center gap-3 py-3 px-1">
            <span className="text-2xl">✅</span>
            <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>כל המשימות הושלמו!</span>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.slice(0, 5).map(task => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-2xl px-4 py-3 gap-2"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <span className="text-sm font-medium text-white truncate">{task.task}</span>
                {task.estimatedTime && (
                  <span
                    className="text-xs flex-shrink-0 rounded-xl px-2.5 py-1 font-semibold"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}
                  >
                    {task.estimatedTime}
                  </span>
                )}
              </div>
            ))}
            {pending.length > 5 && (
              <p className="text-center text-xs pt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                + עוד {pending.length - 5} משימות
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {/* ── Quick actions ── */}
      <div>
        <p className="text-xs font-bold mb-3 px-1" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
          פעולות נוספות
        </p>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction emoji="🐟" label="ספירת חיות"    sub="סוף יום"            color="#f59e0b" onClick={() => onNavigate('proteins')} />
          <QuickAction emoji="🛒" label="הזמנות ספקים"  sub="עלה עלה, דגים, יבש" color="#8b5cf6" onClick={() => onNavigate('supplier')} />
        </div>
      </div>

      {/* ── Station status ── */}
      <SectionCard title="סטטוס תחנות" icon="📊">
        <div className="space-y-3">
          {Object.values(STATIONS).map(s => {
            const tasks  = PREP_TASKS[s.id] || [];
            const doneN  = tasks.filter(t => completedTasks.has(t.id)).length;
            const totalN = tasks.length;
            const p      = totalN > 0 ? Math.round((doneN / totalN) * 100) : 0;
            return (
              <div key={s.id}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    <span>{s.emoji}</span> {s.name}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>{p}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p}%`, backgroundColor: s.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

    </div>
  );
}

/* ─── Sub-components ─── */
function StatCard({ label, value, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="glow-btn rounded-2xl p-4 text-right w-full"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', '--gc': color, '--gca': color + '50', '--gcb': color + '18' }}
    >
      <div className="text-2xl font-black mb-0.5" style={{ color }}>{value}</div>
      <div className="text-white text-sm font-semibold leading-tight">{label}</div>
      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</div>
    </button>
  );
}

function SectionCard({ title, icon, children, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`rounded-3xl p-5 w-full text-right ${onClick ? 'glow-btn' : ''}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <span className="text-white font-bold text-base">{title}</span>
        {onClick && <span className="mr-auto text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>הצג הכל ←</span>}
      </div>
      {children}
    </Wrapper>
  );
}

function QuickAction({ emoji, label, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="glow-btn rounded-3xl p-5 text-right w-full"
      style={{ background: color + '12', border: `1px solid ${color}25`, '--gc': color, '--gca': color + '50', '--gcb': color + '18' }}
    >
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl text-2xl mb-3" style={{ background: color + '20' }}>
        {emoji}
      </span>
      <div className="text-white font-bold text-sm leading-tight">{label}</div>
      <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</div>
    </button>
  );
}
