import { motion } from 'framer-motion';
import { ClipboardList, BookOpen, CalendarDays, AlertCircle, Camera, PackageCheck, ShoppingCart, Fish, ChevronLeft, NotebookText, Megaphone } from 'lucide-react';
import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { STATIONS } from '../data/stations';
import { usePrepState, getServiceDay } from '../hooks/usePrepState';
import { useFirestoreArray } from '../hooks/useFirestoreArray';
import { StreakBadge, SegmentedBar, StatusMark } from './PrepCelebrations';
import { MISSING_STATUS, missingStatus, isRecentOrOpen } from './ShiftNotes';
import HandoverCard from './HandoverCard';
import AnnouncementBanner from './AnnouncementBanner';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useTenantId } from '../context/TenantContext';

/* ── Time-of-day greeting ── */
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

/* ── Haptic feedback helper ── */
function vibrate() { window.navigator?.vibrate?.(15); }

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
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.62)' }}>גרור כדי למקם את הפנים</p>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { dragRef.current = null; }}
        style={{
          width: 220, height: 220,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `3px solid ${color}`,
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
          style={{ background: color, color: '#fff', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? '...' : 'שמור'}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Header — date, photo, greeting
════════════════════════════════════════════ */
function Header({ user, color, avatars, saveAvatar, streak = 0 }) {
  const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <div className="flex items-center gap-3 pt-1">
      <Avatar name={user} color={color} avatarData={avatars[user]} onUpload={data => saveAvatar(user, data)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-secondary">{today}</p>
        <h1 className="text-2xl font-bold leading-tight text-text-primary">
          {GREETING[getTimeOfDay()]} {user}
        </h1>
      </div>
      <StreakBadge count={streak} />
    </div>
  );
}

/* ─── One station's status row. Reuses `prep` when given, otherwise subscribes itself. ─── */
function StationRow({ station, prep, mine, onOpen }) {
  return prep
    ? <StationRowView station={station} prep={prep} mine={mine} onOpen={onOpen} />
    : <SubscribedStationRow station={station} mine={mine} onOpen={onOpen} />;
}

function SubscribedStationRow(props) {
  const prep = usePrepState(props.station.id);
  return <StationRowView {...props} prep={prep} />;
}

function StationRowView({ station, prep, mine, onOpen }) {
  const { done, total } = prep.progress;
  const left     = total - done;
  const ready    = total > 0 && left === 0;
  const stuckN   = prep.stuck?.size || 0;
  const activeN  = prep.inProgress?.size || 0;
  const Wrapper  = onOpen ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onOpen ? () => { vibrate(); onOpen(); } : undefined}
      className="w-full text-right px-4 py-4 space-y-2.5 block"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2">
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: station.color, flexShrink: 0 }} />
        <span className="text-lg font-medium text-text-primary">{station.name}</span>
        {mine && <span className="text-sm text-text-secondary">· הפס שלך</span>}
        <span className="mr-auto text-base text-text-secondary tabular-nums">{done}/{total}</span>
        {onOpen && <ChevronLeft size={18} strokeWidth={1.5} className="text-text-tertiary" />}
      </div>
      <SegmentedBar done={done} total={total} color={ready ? '#10B981' : station.color} height={5} />
      <div className="flex flex-wrap gap-x-3 text-sm">
        <span className={ready ? 'text-sem-success' : 'text-text-secondary'}>
          {ready ? 'מוכן לשירות' : `נשארו ${left}`}
        </span>
        {activeN > 0 && <span style={{ color: '#F59E0B' }}>{activeN} בתהליך</span>}
        {stuckN > 0 && <span style={{ color: '#F87171' }}>{stuckN} חסר / תקוע</span>}
      </div>
    </Wrapper>
  );
}

function KitchenStatus({ myStation, prep, onOpenMine }) {
  const stations = Object.values(STATIONS);
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-text-secondary px-1">המטבח עכשיו</h2>
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
        {stations.map(s => (
          <StationRow
            key={s.id}
            station={s}
            prep={s.id === myStation ? prep : null}
            mine={s.id === myStation}
            onOpen={s.id === myStation ? onOpenMine : undefined}
          />
        ))}
      </div>
    </section>
  );
}

/* ─── Next prep to do on the cook's station ─── */
function NextUp({ prep, onOpen }) {
  const pending = prep.progress.pendingTasks;
  if (!pending || pending.length === 0) return null;
  // Stuck items first — they need someone's attention.
  const next = pending.find(t => prep.taskStatus?.(t) === 'stuck') || pending.find(t => prep.taskStatus?.(t) !== 'progress') || pending[0];
  const isStuck = prep.taskStatus?.(next) === 'stuck';
  return (
    <button
      onClick={() => { vibrate(); onOpen(); }}
      className="w-full text-right rounded-xl px-4 py-3.5 flex items-center gap-3 min-h-[64px]"
      style={{ border: `1px solid ${isStuck ? 'rgba(248,113,113,0.45)' : 'var(--border)'}` }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: isStuck ? '#F87171' : 'rgba(255,255,255,0.62)' }}>
          {isStuck ? 'חסר / תקוע' : 'הבא בתור'}
        </p>
        <p className="text-lg font-medium text-text-primary truncate">
          {next.task}
          {next.estimatedTime && <span className="text-text-secondary font-normal"> · {next.estimatedTime}</span>}
        </p>
      </div>
      <ChevronLeft size={18} strokeWidth={1.5} className="text-text-tertiary flex-shrink-0" />
    </button>
  );
}

/* ─── Shortages this cook reported, so they see each one was handled ─── */
function MyShortages({ user, onOpen }) {
  const [items] = useFirestoreArray('missing_items');
  const today = getServiceDay();
  const mine = items.filter(i => i.author === user && isRecentOrOpen(i, today));
  if (mine.length === 0) return null;
  const order = { arrived: 0, ordered: 1, reported: 2 };
  const sorted = [...mine].sort((a, b) => order[missingStatus(a)] - order[missingStatus(b)]).slice(0, 4);

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-text-secondary px-1">החוסרים שדיווחת</h2>
      <button
        onClick={() => { vibrate(); onOpen(); }}
        className="w-full text-right rounded-xl overflow-hidden block"
        style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}
      >
        {sorted.map(item => {
          const status = missingStatus(item);
          const last = (item.history || []).slice(-1)[0];
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 min-h-[56px]" style={{ borderBottom: '1px solid var(--border)' }}>
              <StatusMark status={MISSING_STATUS[status].mark} color="#10B981" size={22} />
              <span className="flex-1 min-w-0 text-base text-text-primary truncate">{item.text}</span>
              <span className="text-sm text-text-secondary flex-shrink-0">
                {MISSING_STATUS[status].label}{last ? ` · ${last.by}` : ''}
              </span>
            </div>
          );
        })}
      </button>
    </section>
  );
}

/* ════════════════════════════════════════════
   Main Dashboard
════════════════════════════════════════════ */
export default function Dashboard({ station, user, prep, onNavigate, role }) {
  const st = STATIONS[station];
  const { avatars, saveAvatar } = useChefAvatars();
  const { done, total, pct } = prep.progress;

  const isChecker = role === 'checker';

  /* ── Checker / Manager view ── */
  if (isChecker) {
    return (
      <div className="px-4 py-5 space-y-6 max-w-xl mx-auto" dir="rtl">
        <Header user={user} color={st.color} avatars={avatars} saveAvatar={saveAvatar} />

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-text-secondary px-1">פעולות ניהול</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction Icon={PackageCheck} label="קבלת סחורה"    sub="סריקה ובדיקה"       onClick={() => onNavigate('checker_hub')} />
            <QuickAction Icon={ShoppingCart} label="הזמנות ספקים"  sub="עלה עלה, דגים, יבש" onClick={() => onNavigate('supplier')} />
            <QuickAction Icon={Fish}         label="ספירת חיות"    sub="סוף יום"            onClick={() => onNavigate('proteins')} />
          </div>
        </section>

        <KitchenStatus myStation={null} prep={null} />
      </div>
    );
  }

  /* ── Line Cook view ── */
  return (
    <div className="px-4 py-5 max-w-xl mx-auto space-y-6" dir="rtl">
      <Header user={user} color={st.color} avatars={avatars} saveAvatar={saveAvatar} streak={prep.streak.count} />

      <AnnouncementBanner user={user} onOpen={() => onNavigate('announcements')} />

      <HandoverCard user={user} />

      <NextUp prep={prep} onOpen={() => onNavigate('prep')} />

      <KitchenStatus myStation={station} prep={prep} onOpenMine={() => onNavigate('prep')} />

      <MyShortages user={user} onOpen={() => onNavigate('shift')} />

      <div className="grid grid-cols-2 gap-3">
        <QuickAction Icon={ClipboardList} label="צ׳ק ליסט יומי"   sub={pct === 100 ? 'הושלם' : `נשארו ${total - done}`} onClick={() => onNavigate('prep')} />
        <QuickAction Icon={CalendarDays}  label="משימות שבועיות" sub="לפי ימים"       onClick={() => onNavigate('weekly')} />
        <QuickAction Icon={AlertCircle}   label="חוסרים והערות"  sub="דיווח מהיר"     onClick={() => onNavigate('shift')} />
        <QuickAction Icon={BookOpen}      label="ספר מתכונים"    sub="מתכונים והכנות" onClick={() => onNavigate('recipes')} />
        <QuickAction Icon={NotebookText}  label="יומן משמרת"     sub="תקלות, סיכום, מי קרא" onClick={() => onNavigate('shift_log')} />
        <QuickAction Icon={Megaphone}     label="הודעות לצוות"   sub="מי ראה"         onClick={() => onNavigate('announcements')} />
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */
const QuickAction = memo(function QuickAction({ Icon, label, sub, onClick }) {
  return (
    <button
      onClick={() => { vibrate(); onClick(); }}
      className="rounded-xl p-4 text-right w-full min-h-[104px] flex flex-col justify-between gap-3 active:bg-white/5 transition-colors"
      style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}
    >
      {Icon && <Icon size={22} className="text-text-secondary" strokeWidth={1.5} />}
      <span>
        <span className="block text-text-primary font-medium text-base leading-tight">{label}</span>
        <span className="block text-sm mt-1 text-text-secondary tabular-nums">{sub}</span>
      </span>
    </button>
  );
});
