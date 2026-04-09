import { useState, useEffect } from 'react';
import { useFirestoreArray } from '../hooks/useFirestoreArray';
import { RECIPES } from '../data/recipes';
import { SHELF_LIFE, DEFAULT_SHELF_LIFE } from '../data/shelfLife';

// ─── Pure helpers ────────────────────────────────────────────

function calcStatus(batch) {
  const h = (new Date(batch.expiresAt) - Date.now()) / 3600000;
  if (h <= 0)  return 'expired';
  if (h <= 4)  return 'critical';
  if (h <= 24) return 'use_soon';
  return 'fresh';
}

function calcPct(batch) {
  const total   = batch.shelfLifeHours * 3600000;
  const elapsed = Date.now() - new Date(batch.preparedAt).getTime();
  return Math.max(0, Math.min(100, ((total - elapsed) / total) * 100));
}

function formatTimeLeft(expiresAt) {
  const msLeft = new Date(expiresAt) - Date.now();
  if (msLeft <= 0) {
    const h = Math.abs(msLeft) / 3600000;
    if (h < 1)  return `פג לפני ${Math.round(h * 60)} דק׳`;
    if (h < 24) return `פג לפני ${Math.round(h)} שעות`;
    return `פג לפני ${Math.round(h / 24)} ימים`;
  }
  const h = msLeft / 3600000;
  if (h < 1)  return `${Math.round(h * 60)} דק׳ נותרו`;
  if (h < 24) return `${h.toFixed(1)} שעות נותרו`;
  const days = Math.floor(h / 24);
  const remH = Math.round(h % 24);
  return remH > 0 ? `${days} ימים ו-${remH} שעות` : `${days} ימים`;
}

const STATUS_CONFIG = {
  fresh:    { color: '#10B981', label: 'טרי'         },
  use_soon: { color: '#F59E0B', label: 'השתמש בקרוב' },
  critical: { color: '#F97316', label: 'דחוף'         },
  expired:  { color: '#EF4444', label: 'פג תוקף'      },
};

const WASTE_REASONS = [
  { id: 'expired',   label: 'פג תוקף',     emoji: '⏰' },
  { id: 'quality',   label: 'איכות ירודה', emoji: '👎' },
  { id: 'dropped',   label: 'נפל / נשבר',  emoji: '💥' },
  { id: 'over_prep', label: 'הכנה עודפת',  emoji: '📦' },
  { id: 'error',     label: 'שגיאת הכנה',  emoji: '❌' },
];

// ─── Main Component ──────────────────────────────────────────

export default function PrepTracker({ user, station, initialRecipe, onClearInitial }) {
  const [batches,        setBatches]        = useFirestoreArray('prep_batches_index');
  const [wasteLog,       setWasteLog]       = useFirestoreArray('waste_log');
  const [slOverrides,    setSlOverrides]    = useFirestoreArray('shelf_life_overrides');

  const [showMarkReady,  setShowMarkReady]  = useState(false);
  const [preselect,      setPreselect]      = useState(null);
  const [wasteTarget,    setWasteTarget]    = useState(null);
  const [showHistory,    setShowHistory]    = useState(false);
  const [showWaste,      setShowWaste]      = useState(false);
  const [showShelfEditor, setShowShelfEditor] = useState(false);
  const [, setTick] = useState(0);

  function getEffectiveShelfLife(recipeId) {
    const override = slOverrides.find(o => o.id === recipeId);
    if (override) return { ...( SHELF_LIFE[recipeId] || DEFAULT_SHELF_LIFE ), hours: override.hours };
    return SHELF_LIFE[recipeId] || DEFAULT_SHELF_LIFE;
  }

  // Refresh status labels every 60 s
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  // Auto-open sheet when navigated from RecipeDatabase "סמן מוכן"
  useEffect(() => {
    if (initialRecipe) {
      setPreselect(initialRecipe);
      setShowMarkReady(true);
      onClearInitial?.();
    }
  }, [initialRecipe, onClearInitial]);

  const activeBatches = batches
    .filter(b => !['consumed', 'wasted'].includes(b.status))
    .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));

  const historyBatches = batches
    .filter(b => ['consumed', 'wasted'].includes(b.status))
    .slice(0, 30);

  const expiredCount = activeBatches.filter(b => calcStatus(b) === 'expired').length;
  const urgentCount  = activeBatches.filter(b => ['critical', 'use_soon'].includes(calcStatus(b))).length;

  function handleMarkReady({ recipe, batchCount }) {
    const sl  = getEffectiveShelfLife(recipe.id);
    const now = Date.now();
    const newBatch = {
      id:             `pb_${recipe.id}_${now}`,
      recipeId:       recipe.id,
      recipeName:     recipe.name,
      station:        recipe.station || station,
      batches:        batchCount,
      batchUnit:      recipe.batchUnit,
      preparedBy:     user,
      preparedAt:     new Date(now).toISOString(),
      shelfLifeHours: sl.hours,
      expiresAt:      new Date(now + sl.hours * 3600000).toISOString(),
      hasDryKit:      sl.hasDryKit,
      dryKitDone:     false,
    };
    setBatches(prev => [newBatch, ...prev]);
    setShowMarkReady(false);
    setPreselect(null);
  }

  function handleConsume(batchId) {
    setBatches(prev => prev.map(b =>
      b.id === batchId ? { ...b, status: 'consumed', consumedAt: new Date().toISOString() } : b
    ));
  }

  function handleDryKit(batchId) {
    setBatches(prev => prev.map(b =>
      b.id === batchId ? { ...b, dryKitDone: true } : b
    ));
  }

  function handleLogWaste({ batch, qty, unit, reason, note }) {
    const entry = {
      id:         `waste_${Date.now()}`,
      batchId:    batch.id,
      recipeId:   batch.recipeId,
      recipeName: batch.recipeName,
      qty,
      unit,
      reason,
      note,
      loggedBy:   user,
      loggedAt:   new Date().toISOString(),
    };
    setWasteLog(prev => [entry, ...prev]);
    setBatches(prev => prev.map(b =>
      b.id === batch.id ? { ...b, status: 'wasted' } : b
    ));
    setWasteTarget(null);
  }

  const heroAlert  = expiredCount > 0;
  const heroColor  = heroAlert ? '#EF4444' : '#10B981';

  return (
    <div className="px-4 py-5 max-w-xl mx-auto" dir="rtl">

      {/* ── Hero ── */}
      <div
        className="relative rounded-3xl overflow-hidden p-5 mb-5"
        style={{
          background: `linear-gradient(135deg, ${heroColor}18 0%, rgba(255,255,255,0.02) 70%, #16161e 100%)`,
          border: `1px solid ${heroColor}35`,
          boxShadow: `0 8px 40px ${heroColor}18`,
        }}
      >
        <div
          className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-20 pointer-events-none"
          style={{ background: heroColor, filter: 'blur(55px)' }}
        />
        <p className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="text-2xl font-black text-white mb-1">תפוגה ובזבוז</h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {activeBatches.length === 0
            ? 'אין הכנות פעילות'
            : <><span style={{ color: heroColor, fontWeight: 700 }}>{activeBatches.length}</span> הכנות פעילות</>}
          {expiredCount > 0 && (
            <span style={{ color: '#EF4444', fontWeight: 700 }}> · {expiredCount} פגו תוקף ⚠️</span>
          )}
          {urgentCount > 0 && expiredCount === 0 && (
            <span style={{ color: '#F59E0B', fontWeight: 700 }}> · {urgentCount} דורשות תשומת לב</span>
          )}
        </p>

        <div className="mt-3 flex gap-2 flex-wrap">
          <button
            onClick={() => setShowWaste(v => !v)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
          >
            📊 {showWaste ? 'הסתר סיכום' : 'סיכום בזבוז שבועי'}
          </button>
          <button
            onClick={() => setShowShelfEditor(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
          >
            ⚙️ עריכת תוקפי ברירת מחדל
          </button>
        </div>
      </div>

      {/* ── Waste breakdown ── */}
      {showWaste && <WasteBreakdown wasteLog={wasteLog} />}

      {/* ── Active batches ── */}
      {activeBatches.length === 0 ? (
        <div
          className="rounded-3xl p-10 text-center mb-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-4xl mb-3">🟢</p>
          <p className="text-white font-bold">אין הכנות פעילות</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            לחץ + כדי לסמן הכנה חדשה
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {activeBatches.map(batch => (
            <BatchCard
              key={batch.id}
              batch={batch}
              onConsume={handleConsume}
              onDryKit={handleDryKit}
              onLogWaste={setWasteTarget}
            />
          ))}
        </div>
      )}

      {/* ── History ── */}
      {historyBatches.length > 0 && (
        <>
          <button
            onClick={() => setShowHistory(v => !v)}
            className="w-full py-3 rounded-2xl text-sm font-semibold mb-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
          >
            {showHistory ? '▲ הסתר היסטוריה' : `▼ היסטוריה (${historyBatches.length})`}
          </button>

          {showHistory && (
            <div className="space-y-2 mb-4">
              {historyBatches.map(batch => (
                <div
                  key={batch.id}
                  className="rounded-2xl px-4 py-3 flex items-center justify-between"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {batch.recipeName}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {batch.batches} {batch.batchUnit} · {batch.preparedBy}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-xl flex-shrink-0"
                    style={{
                      background: batch.status === 'wasted' ? 'rgba(239,68,68,0.15)' : 'rgba(107,114,128,0.2)',
                      color:      batch.status === 'wasted' ? '#EF4444'               : '#9CA3AF',
                    }}
                  >
                    {batch.status === 'wasted' ? '🗑 בוזבז' : '✓ נוצל'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── FAB ── */}
      <button
        onClick={() => { setPreselect(null); setShowMarkReady(true); }}
        className="fixed bottom-28 left-5 z-20 flex items-center gap-2 rounded-2xl px-5 py-3.5 font-bold text-white text-sm"
        style={{ background: '#10B981', boxShadow: '0 4px 24px rgba(16,185,129,0.5)' }}
      >
        <span className="text-lg">+</span>
        סמן הכנה מוכנה
      </button>

      {/* ── Sheets ── */}
      {showMarkReady && (
        <MarkReadySheet
          initialRecipe={preselect}
          getShelfLife={getEffectiveShelfLife}
          onSave={handleMarkReady}
          onCancel={() => { setShowMarkReady(false); setPreselect(null); }}
        />
      )}
      {wasteTarget && (
        <WasteLoggerSheet
          batch={wasteTarget}
          onSave={handleLogWaste}
          onCancel={() => setWasteTarget(null)}
        />
      )}
      {showShelfEditor && (
        <ShelfLifeEditorSheet
          overrides={slOverrides}
          onSave={setSlOverrides}
          onClose={() => setShowShelfEditor(false)}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   Batch Card
════════════════════════════════════════════════════ */
function BatchCard({ batch, onConsume, onDryKit, onLogWaste }) {
  const status  = calcStatus(batch);
  const cfg     = STATUS_CONFIG[status];
  const pct     = calcPct(batch);
  const timeStr = formatTimeLeft(batch.expiresAt);
  const showDryKit = batch.hasDryKit && !batch.dryKitDone &&
    (status === 'use_soon' || status === 'critical');

  return (
    <div
      className="rounded-3xl p-4"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${cfg.color}30` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-base leading-tight">{batch.recipeName}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {batch.batches} {batch.batchUnit} · ע"י {batch.preparedBy}
          </p>
        </div>
        <span
          className="text-xs font-black px-3 py-1.5 rounded-xl flex-shrink-0 mr-3"
          style={{ background: cfg.color + '20', color: cfg.color, border: `1px solid ${cfg.color}35` }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Progress bar + time */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: cfg.color }}
          />
        </div>
        <span
          className="text-xs font-bold flex-shrink-0"
          style={{ color: cfg.color, minWidth: '90px', textAlign: 'left' }}
        >
          {timeStr}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {showDryKit && (
          <button
            onClick={() => onDryKit(batch.id)}
            className="flex-1 py-2.5 rounded-2xl text-xs font-bold"
            style={{ background: 'rgba(249,115,22,0.15)', color: '#F97316', border: '1px solid rgba(249,115,22,0.3)' }}
          >
            ✓ ערכת יבש מוכנה
          </button>
        )}
        {status !== 'expired' && (
          <button
            onClick={() => onConsume(batch.id)}
            className="flex-1 py-2.5 rounded-2xl text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
          >
            ✓ נוצל
          </button>
        )}
        <button
          onClick={() => onLogWaste(batch)}
          className="flex-1 py-2.5 rounded-2xl text-xs font-bold"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          🗑 בזבוז
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   Mark Ready Sheet
════════════════════════════════════════════════════ */
function MarkReadySheet({ initialRecipe, getShelfLife, onSave, onCancel }) {
  const [recipe,     setRecipe]     = useState(initialRecipe || null);
  const [batchCount, setBatchCount] = useState(1);
  const [search,     setSearch]     = useState('');

  const sl        = recipe ? getShelfLife(recipe.id) : null;
  const expiresAt = sl ? new Date(Date.now() + sl.hours * 3600000) : null;
  const dryKitAt  = sl?.hasDryKit
    ? new Date(Date.now() + (sl.hours - 24) * 3600000)
    : null;

  const filtered = RECIPES.filter(r =>
    r.name.includes(search) || r.category.includes(search)
  );

  const fmtDate = d => d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtTime = d => d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" dir="rtl">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
        onClick={onCancel}
      />
      <div
        className="relative rounded-t-3xl overflow-hidden flex flex-col"
        style={{ background: '#16161e', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '88vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Title */}
        <div className="px-5 pb-3 flex items-center justify-between flex-shrink-0">
          <h3 className="text-white font-black text-lg">סמן הכנה מוכנה</h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
          >✕</button>
        </div>

        <div className="px-5 pb-8 overflow-y-auto space-y-4 flex-1">

          {!recipe ? (
            /* ── Recipe picker ── */
            <>
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="חפש מתכון הכנה..."
                className="w-full rounded-2xl px-4 py-3 text-white text-sm focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <div className="space-y-1.5">
                {filtered.map(r => {
                  const life = SHELF_LIFE[r.id] || DEFAULT_SHELF_LIFE;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRecipe(r)}
                      className="w-full text-right px-4 py-3.5 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <div>
                        <p className="text-white font-semibold text-sm">{r.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {r.category} · {life.hours < 48
                            ? `${life.hours} שעות`
                            : `${Math.round(life.hours / 24)} ימים`} תוקף
                          {life.hasDryKit && ' · ⚠️ ערכת יבש'}
                        </p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M15 18l-6-6 6-6"/>
                      </svg>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* ── Selected recipe + confirm ── */
            <>
              {/* Selected */}
              <div
                className="rounded-2xl px-4 py-3.5 flex items-center justify-between"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
              >
                <div>
                  <p className="text-white font-bold">{recipe.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{recipe.category}</p>
                </div>
                <button
                  onClick={() => { setRecipe(null); setBatchCount(1); }}
                  className="text-xs px-3 py-1.5 rounded-xl"
                  style={{ color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.08)' }}
                >שנה</button>
              </div>

              {/* Batch count */}
              <div
                className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-sm font-semibold text-white mb-3">כמות אצוות</p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setBatchCount(n => Math.max(0.5, parseFloat((n - 0.5).toFixed(1))))}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
                  >−</button>
                  <div className="flex-1 text-center">
                    <span className="text-white font-black text-2xl">{batchCount}</span>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{recipe.batchUnit}</p>
                  </div>
                  <button
                    onClick={() => setBatchCount(n => parseFloat((n + 0.5).toFixed(1)))}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
                  >+</button>
                </div>
              </div>

              {/* Expiry info */}
              {sl && expiresAt && (
                <div
                  className="rounded-2xl px-4 py-3.5 space-y-1.5"
                  style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>תוקף</p>
                    <p className="text-sm font-black" style={{ color: '#10B981' }}>
                      {sl.hours < 48 ? `${sl.hours} שעות` : `${Math.round(sl.hours / 24)} ימים`}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    יפוג: {fmtDate(expiresAt)} בשעה {fmtTime(expiresAt)}
                  </p>
                  {dryKitAt && (
                    <p className="text-xs pt-0.5" style={{ color: '#F97316' }}>
                      ⚠️ הכנת ערכת יבש: {fmtDate(dryKitAt)} בשעה {fmtTime(dryKitAt)}
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={() => onSave({ recipe, batchCount })}
                className="w-full py-4 rounded-2xl text-white font-black text-base"
                style={{ background: '#10B981', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}
              >
                ✓ סמן מוכן
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   Waste Logger Sheet
════════════════════════════════════════════════════ */
function WasteLoggerSheet({ batch, onSave, onCancel }) {
  const [qty,    setQty]    = useState('');
  const [unit,   setUnit]   = useState(batch.batchUnit || 'יחידה');
  const [reason, setReason] = useState(calcStatus(batch) === 'expired' ? 'expired' : '');
  const [note,   setNote]   = useState('');

  const canSave = reason && qty && parseFloat(qty) > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" dir="rtl">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
        onClick={onCancel}
      />
      <div
        className="relative rounded-t-3xl"
        style={{ background: '#16161e', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>

        <div className="px-5 pb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-black text-lg">לוג בזבוז</h3>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
            >✕</button>
          </div>

          {/* Batch info */}
          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <p className="text-white font-bold">{batch.recipeName}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {batch.batches} {batch.batchUnit} · ע"י {batch.preparedBy}
            </p>
          </div>

          {/* Qty + unit */}
          <div className="flex gap-2">
            <input
              type="number"
              value={qty}
              onChange={e => setQty(e.target.value)}
              placeholder="כמות"
              className="flex-1 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <input
              value={unit}
              onChange={e => setUnit(e.target.value)}
              placeholder="יחידה"
              className="w-28 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none text-center"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Reason */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>
              סיבה
            </p>
            <div className="grid grid-cols-3 gap-2">
              {WASTE_REASONS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  className="py-3 rounded-2xl text-xs font-bold flex flex-col items-center gap-1 transition-all"
                  style={{
                    background: reason === r.id ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                    color:      reason === r.id ? '#EF4444'               : 'rgba(255,255,255,0.55)',
                    border:     reason === r.id ? '1px solid rgba(239,68,68,0.4)' : '1px solid transparent',
                  }}
                >
                  <span className="text-base">{r.emoji}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="הערה (אופציונלי)..."
            rows={2}
            className="w-full rounded-2xl px-4 py-3 text-white text-sm focus:outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          />

          <button
            onClick={() => canSave && onSave({ batch, qty: parseFloat(qty), unit, reason, note })}
            disabled={!canSave}
            className="w-full py-4 rounded-2xl text-white font-black text-base transition-opacity"
            style={{
              background: '#EF4444',
              boxShadow: canSave ? '0 4px 20px rgba(239,68,68,0.3)' : 'none',
              opacity: canSave ? 1 : 0.4,
            }}
          >
            🗑 אשר בזבוז
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   Waste Breakdown (weekly summary)
════════════════════════════════════════════════════ */
function WasteBreakdown({ wasteLog }) {
  const weekAgo = Date.now() - 7 * 24 * 3600000;
  const recent  = wasteLog.filter(e => new Date(e.loggedAt) > weekAgo);

  if (recent.length === 0) {
    return (
      <div
        className="rounded-3xl p-5 mb-5 text-center"
        style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}
      >
        <p className="text-2xl mb-2">✨</p>
        <p className="text-white font-bold text-sm">אפס בזבוז השבוע</p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>כל ההכנות נוצלו</p>
      </div>
    );
  }

  const byReason = WASTE_REASONS
    .map(r => ({ ...r, count: recent.filter(e => e.reason === r.id).length }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count);

  const byItem = Object.values(
    recent.reduce((acc, e) => {
      if (!acc[e.recipeName]) acc[e.recipeName] = { name: e.recipeName, count: 0 };
      acc[e.recipeName].count++;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count).slice(0, 5);

  const maxCount = Math.max(...byReason.map(r => r.count), 1);

  return (
    <div
      className="rounded-3xl p-5 mb-5 space-y-4"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-white font-bold">📊 בזבוז שבועי</p>
        <p className="text-sm font-black" style={{ color: '#EF4444' }}>{recent.length} רשומות</p>
      </div>

      {/* By reason bars */}
      <div className="space-y-3">
        {byReason.map(r => (
          <div key={r.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white">{r.emoji} {r.label}</span>
              <span className="text-xs font-bold" style={{ color: '#EF4444' }}>{r.count}×</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${(r.count / maxCount) * 100}%`, background: '#EF4444' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Top wasted items */}
      {byItem.length > 0 && (
        <>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
              פריטים עם הכי הרבה בזבוז
            </p>
            {byItem.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-white">{i + 1}. {item.name}</span>
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {item.count}×
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   Shelf Life Editor Sheet
════════════════════════════════════════════════════ */
function ShelfLifeEditorSheet({ overrides, onSave, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [days,      setDays]      = useState('');
  const [hours,     setHours]     = useState('');

  function getEffective(recipeId) {
    const ov = overrides.find(o => o.id === recipeId);
    const base = SHELF_LIFE[recipeId] || DEFAULT_SHELF_LIFE;
    return ov ? ov.hours : base.hours;
  }

  function formatHours(h) {
    const d = Math.floor(h / 24);
    const r = h % 24;
    if (d === 0) return `${r} שעות`;
    if (r === 0) return `${d} ימים`;
    return `${d} ימים ו-${r} שעות`;
  }

  function openEdit(recipe) {
    const h = getEffective(recipe.id);
    setDays(String(Math.floor(h / 24)));
    setHours(String(h % 24));
    setEditingId(recipe.id);
  }

  function saveEdit(recipeId) {
    const total = (parseInt(days, 10) || 0) * 24 + (parseInt(hours, 10) || 0);
    if (total <= 0) return;
    const base = SHELF_LIFE[recipeId] || DEFAULT_SHELF_LIFE;
    // If same as base, remove override; otherwise upsert
    if (total === base.hours) {
      onSave(prev => prev.filter(o => o.id !== recipeId));
    } else {
      onSave(prev => {
        const without = prev.filter(o => o.id !== recipeId);
        return [...without, { id: recipeId, hours: total }];
      });
    }
    setEditingId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" dir="rtl">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />
      <div
        className="relative rounded-t-3xl flex flex-col"
        style={{ background: '#16161e', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '85vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between flex-shrink-0">
          <h3 className="text-white font-black text-lg">⚙️ תוקפי ברירת מחדל</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
          >✕</button>
        </div>

        <p className="px-5 pb-3 text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
          הגדר כמה זמן כל הכנה נשמרת. השינוי ישפיע על סימוני "מוכן" עתידיים.
        </p>

        <div className="overflow-y-auto px-5 pb-8 space-y-2">
          {RECIPES.map(recipe => {
            const effectiveH = getEffective(recipe.id);
            const baseH = (SHELF_LIFE[recipe.id] || DEFAULT_SHELF_LIFE).hours;
            const isCustom = effectiveH !== baseH;
            const isEditing = editingId === recipe.id;

            return (
              <div
                key={recipe.id}
                className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${isCustom ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm leading-tight">{recipe.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: isCustom ? '#10B981' : 'rgba(255,255,255,0.35)' }}>
                      {formatHours(effectiveH)}
                      {isCustom && <span style={{ color: 'rgba(255,255,255,0.25)' }}> (ברירת מחדל: {formatHours(baseH)})</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => isEditing ? setEditingId(null) : openEdit(recipe)}
                    className="flex-shrink-0 mr-3 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: isEditing ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)',
                      color: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    {isEditing ? 'ביטול' : 'ערוך'}
                  </button>
                </div>

                {isEditing && (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>ימים</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={days}
                          onChange={e => setDays(e.target.value)}
                          className="w-full rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.15)' }}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>שעות</label>
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={hours}
                          onChange={e => setHours(e.target.value)}
                          className="w-full rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.15)' }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => saveEdit(recipe.id)}
                      disabled={!((parseInt(days, 10) || 0) * 24 + (parseInt(hours, 10) || 0) > 0)}
                      className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity"
                      style={{ background: '#10B981', color: '#fff', opacity: ((parseInt(days,10)||0)*24+(parseInt(hours,10)||0)) > 0 ? 1 : 0.4 }}
                    >
                      ✓ שמור
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
