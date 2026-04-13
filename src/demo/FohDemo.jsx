import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MAIN_DISHES } from '../data/mainDishes';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const EIGHTY_SIX = [
  { id: 1, name: 'פילה סלמון',    reason: 'נגמר מלאי',  since: '18:30' },
  { id: 2, name: 'ריזוטו פטריות', reason: 'עיכוב ספק',  since: '19:00' },
  { id: 3, name: 'טרטר טונה',     reason: 'איכות',      since: '20:15' },
];

const SPECIALS = [
  { id: 1, name: 'פסטה שחורה',  desc: 'דיו דיונון, שרימפס טריים וצ׳ילי פרסי', price: 112 },
  { id: 2, name: 'סטייק וגפן',  desc: 'אנטריקוט 300 גרם על הגריל, גפן טרי, חמאת עשבים ביתית', price: 168 },
  { id: 3, name: 'טרטר ברנז׳יק', desc: 'בשר בקר ידני, חמוצי ביתיים, חלמון כבוש, שמן כמהין', price: 138 },
];

const QUIZ = [
  { id:1,  q:'מה האלרגן בסלט קיסר?',           opts:['דגים בלבד','גלוטן בלבד','אגוזים','דגים וגלוטן'],  ans:3, exp:'אנשובי = דגים, קרוטונים = גלוטן', cat:'allergens'  },
  { id:2,  q:'באיזו טמפרטורה מוגש שיפוד הדג?',  opts:['קר','טמפרטורת חדר','65°C','40°C'],               ans:2, exp:'חם — 65°C, תוך 90 שניות מהצלייה', cat:'method'     },
  { id:3,  q:"מה הבסיס של הצ'יראשי?",           opts:['פריקה','אורז מתובל','קוסקוס','כוסמת'],            ans:1, exp:'אורז מתובל לפי טכניקה יפנית',      cat:'ingredients'},
  { id:4,  q:'מה ההמלצה לשתיה עם שיפוד הדג?',   opts:['רוזה','בירה','וויסקי','שרדונה בורגוני'],          ans:3, exp:'שרדונה בורגוני / ורמנטינו סרדיני', cat:'pairing'    },
  { id:5,  q:'מה מייחד את הסחוג הירוק?',         opts:['חריף מאוד','3 שבועות תסיסה','מעושן','חומוס בסיס'], ans:1, exp:'סחוג ירוק מותסס — 3 שבועות',      cat:'ingredients'},
  { id:6,  q:'סלט קיסר — ניתן להוסיף מה?',      opts:['שניצל','פרגית / שרימפס','גבינה צהובה','לחם שחור'], ans:1, exp:'פרגית צלויה או שרימפס טריים',       cat:'method'     },
  { id:7,  q:"הדג בצ'יראשי — מתי נחתך?",        opts:['בבוקר','שבוע מראש','לפי הזמנה','קפוא'],           ans:2, exp:'נחתך לפי הזמנה, לא מוכן מראש',     cat:'ingredients'},
  { id:8,  q:'מה אסור לשפוך על הדג בשיפוד?',    opts:['מלח','הבסיס','לימון','מיקרו עשבים'],              ans:1, exp:'הבסיס נשפך סביב הדג, לא מעליו',    cat:'method'     },
  { id:9,  q:'מה האלרגן בשיפוד הדג?',           opts:['גלוטן','אגוזים','דגים וחלב','ביצים'],             ans:2, exp:'חמאה חומה = חלב, דג ים = דגים',    cat:'allergens'  },
  { id:10, q:"כמה אורז מוגש בצ'יראשי?",         opts:['100 גרם','200 גרם','150 גרם','80 גרם'],            ans:2, exp:'150 גרם אורז צ׳יראשי חמים',         cat:'ingredients'},
];

const BOH_LOAD = [
  { station: 'קר',   color: '#3B82F6', load: 65 },
  { station: 'חם',   color: '#EF4444', load: 88 },
  { station: 'גריל', color: '#F59E0B', load: 40 },
];

const CHEF_ALERTS = [
  { id:1, from: 'ימסקי', msg: 'שלבו טארטר טונה בלבד — אין ספייסי', time: '20:10' },
  { id:2, from: 'ימסקי', msg: 'ריזוטו 86 — עיכוב בסחורה. אל תמכרו!', time: '19:58' },
];

// ─── MenuItemSheet ────────────────────────────────────────────────────────────

function MenuItemSheet({ dish, onClose }) {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 280, damping: 30 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: '#121212',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
      dir="rtl"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 h-16 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 min-h-[44px] px-1"
          style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 600 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
          חזרה
        </button>
        <div className="text-right">
          <p className="text-white font-black text-lg leading-tight">{dish.name}</p>
          <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>₪{dish.sellingPrice}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Allergens */}
        {dish.allergens?.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <p className="text-xs font-bold mb-2" style={{ color: 'rgba(245,158,11,0.7)' }}>⚠ אלרגנים</p>
            <div className="flex flex-wrap gap-2">
              {dish.allergens.map(a => (
                <span key={a} className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.18)', color: '#F59E0B' }}>{a}</span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {dish.description && (
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{dish.description}</p>
        )}

        {/* Why this dish */}
        {dish.foh?.sellingPoints?.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-bold mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>למה המנה הזו?</p>
            <div className="space-y-2">
              {dish.foh.sellingPoints.map((pt, i) => (
                <div key={i} className="flex gap-2.5">
                  <span style={{ color: '#10B981', flexShrink: 0, marginTop: 1 }}>✓</span>
                  <p className="text-sm font-medium text-white">{pt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Service info */}
        {dish.foh && (
          <div className="rounded-2xl p-4 space-y-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>הגשה</p>
            {dish.foh.serveTemp && (
              <div className="flex gap-2">
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>🌡</span>
                <p className="text-sm text-white">{dish.foh.serveTemp}</p>
              </div>
            )}
            {dish.foh.pairing && (
              <div className="flex gap-2">
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>🍷</span>
                <p className="text-sm text-white">{dish.foh.pairing}</p>
              </div>
            )}
            {dish.foh.platingNote && (
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                {dish.foh.platingNote}
              </p>
            )}
          </div>
        )}

        {/* Ingredients */}
        {dish.directIngredients?.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-bold mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>רכיבים עיקריים</p>
            <div className="space-y-2">
              {dish.directIngredients.map((ing, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-white">{ing.name}</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{ing.qty} {ing.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Method */}
        {dish.method?.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-bold mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>הכנה</p>
            <div className="space-y-3">
              {dish.method.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-xs font-black mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>{i+1}</span>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>
    </motion.div>
  );
}

// ─── Main Demo ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'menu',  label: 'תפריט',  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  )},
  { id: 'quiz',  label: 'אימון',  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )},
  { id: 'pulse', label: 'מטבח',  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )},
];

const PAGE_TITLE = { menu: 'תפריט ידע', quiz: 'אימון תפריט', pulse: 'דופק המטבח' };

export default function FohDemo() {
  const [view, setView] = useState('menu');

  // Menu screen state
  const [eightySixOpen, setEightySixOpen] = useState(false);
  const [search,        setSearch]        = useState('');
  const [selectedDish,  setSelectedDish]  = useState(null);
  const [expandedSpecial, setExpandedSpecial] = useState(null);

  // Quiz state
  const [quizPhase,    setQuizPhase]    = useState('idle');  // idle | active | result
  const [quizIndex,    setQuizIndex]    = useState(0);
  const [selected,     setSelected]     = useState(null);    // option index chosen
  const [streak,       setStreak]       = useState(0);
  const [maxStreak,    setMaxStreak]    = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Pulse state
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

  // ── Quiz logic ──
  const currentQ = QUIZ[quizIndex];

  function handleAnswer(optionIdx) {
    if (selected !== null) return;
    setSelected(optionIdx);
    const correct = optionIdx === currentQ.ans;
    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak > maxStreak) setMaxStreak(newStreak);
    if (correct) setCorrectCount(c => c + 1);
  }

  function handleNext() {
    if (quizIndex < QUIZ.length - 1) {
      setQuizIndex(i => i + 1);
      setSelected(null);
    } else {
      setQuizPhase('result');
    }
  }

  function resetQuiz() {
    setQuizPhase('idle');
    setQuizIndex(0);
    setSelected(null);
    setStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
  }

  // ── Broadcast ──
  function handleBroadcast() {
    if (!broadcastText.trim()) return;
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 2500);
    setBroadcastText('');
  }

  // ── Filtered dishes ──
  const filteredDishes = MAIN_DISHES.filter(d =>
    d.name.includes(search) || d.category.includes(search)
  );

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      dir="rtl"
      className="flex flex-col min-h-screen"
      style={{ background: '#121212' }}
    >
      {/* Header */}
      <header
        className="fixed top-0 inset-x-0 z-30 h-16 flex items-center justify-between px-5"
        style={{
          background: 'rgba(18,18,18,0.9)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
        >
          DEMO
        </span>
        <span className="text-white font-black text-lg tracking-tight">{PAGE_TITLE[view]}</span>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ paddingTop: 64, paddingBottom: 88 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeInOut' }}
          >

            {/* ─── MENU SCREEN ─── */}
            {view === 'menu' && (
              <div>
                {/* 86 Banner */}
                <div
                  className="mx-4 mt-4 rounded-2xl overflow-hidden"
                  style={{ border: '1px solid rgba(239,68,68,0.35)' }}
                >
                  <button
                    className="w-full flex items-center justify-between px-4 py-3"
                    style={{ background: 'rgba(239,68,68,0.1)' }}
                    onClick={() => setEightySixOpen(o => !o)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      style={{ color: '#EF4444', flexShrink: 0, transform: eightySixOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                    <div className="flex items-center gap-2 flex-1 justify-end flex-wrap">
                      <span className="text-xs font-black" style={{ color: '#EF4444' }}>86:</span>
                      {EIGHTY_SIX.map(i => (
                        <span key={i.id} className="text-xs font-bold" style={{ color: 'rgba(239,68,68,0.85)' }}>{i.name}</span>
                      )).reduce((prev, curr) => [prev, <span key={'dot'+prev} style={{ color: 'rgba(239,68,68,0.4)' }}>·</span>, curr])}
                    </div>
                  </button>
                  <AnimatePresence>
                    {eightySixOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden', background: 'rgba(239,68,68,0.06)' }}
                      >
                        {EIGHTY_SIX.map(item => (
                          <div key={item.id}
                            className="flex items-center justify-between px-4 py-2.5"
                            style={{ borderTop: '1px solid rgba(239,68,68,0.15)' }}>
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.since}</span>
                            <div className="text-right">
                              <span className="text-sm font-bold" style={{ color: '#EF4444' }}>{item.name}</span>
                              <span className="text-xs mr-2" style={{ color: 'rgba(239,68,68,0.6)' }}>— {item.reason}</span>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Specials */}
                <div className="mt-4 px-4">
                  <p className="text-xs font-bold mb-2.5" style={{ color: 'rgba(255,255,255,0.35)' }}>מיוחדי הערב</p>
                  <div className="flex gap-3 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {SPECIALS.map(s => (
                      <motion.button
                        key={s.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setExpandedSpecial(expandedSpecial?.id === s.id ? null : s)}
                        className="flex-shrink-0 rounded-2xl p-4 text-right"
                        style={{
                          background: 'rgba(245,158,11,0.08)',
                          border: expandedSpecial?.id === s.id ? '1px solid rgba(245,158,11,0.5)' : '1px solid rgba(245,158,11,0.2)',
                          minWidth: 160,
                        }}
                      >
                        <p className="text-sm font-black" style={{ color: '#F59E0B' }}>{s.name}</p>
                        <p className="text-xs font-bold mt-0.5" style={{ color: 'rgba(245,158,11,0.6)' }}>₪{s.price}</p>
                        <AnimatePresence>
                          {expandedSpecial?.id === s.id && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="text-xs mt-2 leading-relaxed"
                              style={{ color: 'rgba(255,255,255,0.5)' }}
                            >
                              {s.desc}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="mx-4 mt-4">
                  <input
                    type="text"
                    placeholder="חפש מנה..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full rounded-2xl px-4 py-3 text-sm text-white"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      outline: 'none',
                    }}
                    dir="rtl"
                  />
                </div>

                {/* Dish list */}
                <div className="mx-4 mt-3 space-y-3">
                  {filteredDishes.length === 0 && (
                    <p className="text-center text-sm py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>לא נמצאו מנות</p>
                  )}
                  {filteredDishes.map(dish => (
                    <motion.button
                      key={dish.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedDish(dish)}
                      className="w-full rounded-2xl p-4 text-right"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col items-start gap-1.5">
                          {dish.allergens?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {dish.allergens.map(a => (
                                <span key={a} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>{a}</span>
                              ))}
                            </div>
                          )}
                          {dish.foh?.serveTemp && (
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                              🌡 {dish.foh.serveTemp.split('—')[0].trim()}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">{dish.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{dish.category} · ₪{dish.sellingPrice}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* ─── QUIZ SCREEN ─── */}
            {view === 'quiz' && (
              <div className="px-4 pt-4">
                <AnimatePresence mode="wait">

                  {quizPhase === 'idle' && (
                    <motion.div key="idle" initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
                      <div className="rounded-3xl p-6 text-center mt-8"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-5xl mb-4">⚡</p>
                        <p className="text-2xl font-black text-white mb-2">אימון תפריט</p>
                        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {QUIZ.length} שאלות על המנות, אלרגנים, ואופן ההגשה
                        </p>
                        <button
                          onClick={() => setQuizPhase('active')}
                          className="w-full rounded-2xl py-4 font-black text-white text-lg"
                          style={{ background: '#10B981', boxShadow: '0 0 24px rgba(16,185,129,0.4)' }}
                        >
                          התחל אימון
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {quizPhase === 'active' && (
                    <motion.div key={`q-${quizIndex}`} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }}>
                      {/* Progress + streak */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: '#F59E0B', fontSize: 16 }}>🔥</span>
                          <span className="text-sm font-black" style={{ color: '#F59E0B' }}>{streak}</span>
                        </div>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {quizIndex + 1} / {QUIZ.length}
                        </p>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1 rounded-full mb-5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: '#10B981' }}
                          animate={{ width: `${((quizIndex + 1) / QUIZ.length) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>

                      {/* Question card */}
                      <motion.div
                        className="rounded-3xl p-5 mb-4"
                        animate={{
                          borderColor: selected !== null
                            ? (selected === currentQ.ans ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)')
                            : 'rgba(255,255,255,0.08)',
                        }}
                        transition={{ duration: 0.35 }}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full mb-3 inline-block"
                          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                          {{allergens:'אלרגנים', method:'הגשה', ingredients:'רכיבים', pairing:'יין'}[currentQ.cat] || currentQ.cat}
                        </span>
                        <p className="text-lg font-black text-white leading-snug">{currentQ.q}</p>
                      </motion.div>

                      {/* Options */}
                      <div className="space-y-2.5 mb-4">
                        {currentQ.opts.map((opt, i) => {
                          const isChosen  = selected === i;
                          const isCorrect = i === currentQ.ans;
                          const answered  = selected !== null;
                          return (
                            <motion.button
                              key={i}
                              whileTap={selected === null ? { scale: 0.98 } : {}}
                              onClick={() => handleAnswer(i)}
                              className="w-full rounded-2xl py-4 px-4 text-right font-semibold text-sm min-h-[52px]"
                              style={{
                                background: !answered
                                  ? 'rgba(255,255,255,0.06)'
                                  : isCorrect
                                    ? 'rgba(16,185,129,0.18)'
                                    : isChosen
                                      ? 'rgba(239,68,68,0.18)'
                                      : 'rgba(255,255,255,0.03)',
                                color: !answered
                                  ? 'rgba(255,255,255,0.85)'
                                  : isCorrect
                                    ? '#10B981'
                                    : isChosen
                                      ? '#EF4444'
                                      : 'rgba(255,255,255,0.25)',
                                border: !answered
                                  ? '1px solid rgba(255,255,255,0.08)'
                                  : isCorrect
                                    ? '1px solid rgba(16,185,129,0.35)'
                                    : isChosen
                                      ? '1px solid rgba(239,68,68,0.35)'
                                      : '1px solid rgba(255,255,255,0.04)',
                                transition: 'all 0.25s',
                              }}
                            >
                              {opt}
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Explanation + next */}
                      <AnimatePresence>
                        {selected !== null && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                          >
                            {selected !== currentQ.ans && (
                              <div className="rounded-2xl px-4 py-3 mb-3"
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <p className="text-xs font-bold" style={{ color: '#EF4444' }}>💡 {currentQ.exp}</p>
                              </div>
                            )}
                            {selected === currentQ.ans && (
                              <div className="rounded-2xl px-4 py-3 mb-3"
                                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <p className="text-xs font-bold" style={{ color: '#10B981' }}>✓ נכון! {currentQ.exp}</p>
                              </div>
                            )}
                            <button
                              onClick={handleNext}
                              className="w-full rounded-2xl py-4 font-black text-white"
                              style={{ background: 'rgba(255,255,255,0.08)' }}
                            >
                              {quizIndex < QUIZ.length - 1 ? 'הבא ←' : 'סיום'}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {quizPhase === 'result' && (
                    <motion.div key="result" initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}>
                      <div className="rounded-3xl p-6 text-center mt-8"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-5xl mb-4">
                          {correctCount >= 8 ? '🏆' : correctCount >= 5 ? '⭐' : '💪'}
                        </p>
                        <p className="text-3xl font-black text-white mb-1">
                          {correctCount}/{QUIZ.length}
                        </p>
                        <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {correctCount >= 8 ? 'מדהים! אתה מומחה תפריט' : correctCount >= 5 ? 'כל הכבוד!' : 'כדאי לחזור על התפריט'}
                        </p>
                        <div className="flex items-center justify-center gap-4 my-5">
                          <div className="text-center">
                            <p className="text-2xl font-black" style={{ color: '#F59E0B' }}>🔥 {maxStreak}</p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>רצף מקסימלי</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-black" style={{ color: '#10B981' }}>{correctCount * 10} XP</p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>ניקוד</p>
                          </div>
                        </div>
                        <button
                          onClick={resetQuiz}
                          className="w-full rounded-2xl py-4 font-black text-white"
                          style={{ background: '#10B981', boxShadow: '0 0 20px rgba(16,185,129,0.35)' }}
                        >
                          שחק שוב
                        </button>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            )}

            {/* ─── PULSE SCREEN ─── */}
            {view === 'pulse' && (
              <div className="px-4 pt-4 space-y-4">

                {/* BOH Load */}
                <div>
                  <p className="text-xs font-bold mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>עומס תחנות</p>
                  <div className="space-y-2.5">
                    {BOH_LOAD.map(s => {
                      const loadColor = s.load >= 85 ? '#EF4444' : s.load >= 70 ? '#F59E0B' : '#10B981';
                      return (
                        <div key={s.station} className="rounded-2xl p-4"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-lg font-black" style={{ color: loadColor }}>{s.load}%</span>
                            <div className="flex items-center gap-2">
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                              <span className="text-sm font-bold text-white">תחנת {s.station}</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: loadColor }}
                              initial={{ width: 0 }}
                              animate={{ width: `${s.load}%` }}
                              transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chef Alerts */}
                <div>
                  <p className="text-xs font-bold mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>התראות שף</p>
                  <div className="space-y-2.5">
                    {CHEF_ALERTS.map(alert => (
                      <div key={alert.id} className="rounded-2xl p-4 flex gap-3"
                        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRightWidth: 3 }}>
                        <div className="flex-1 text-right">
                          <p className="text-sm font-bold text-white">{alert.msg}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(239,68,68,0.6)' }}>{alert.from} · {alert.time}</p>
                        </div>
                        <span style={{ color: '#EF4444', flexShrink: 0 }}>🔴</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Broadcast */}
                <div>
                  <p className="text-xs font-bold mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>שדר הודעה לכל הצוות</p>
                  <div className="rounded-2xl p-1"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <textarea
                      value={broadcastText}
                      onChange={e => setBroadcastText(e.target.value)}
                      placeholder="הקלד הודעה לכל הצוות..."
                      rows={3}
                      className="w-full text-sm text-white px-3 pt-3 pb-1 resize-none"
                      style={{ background: 'transparent', outline: 'none', border: 'none' }}
                      dir="rtl"
                    />
                    <div className="flex justify-end px-3 pb-3">
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={handleBroadcast}
                        className="rounded-xl px-5 py-2.5 text-sm font-black text-white"
                        style={{
                          background: broadcastText.trim() ? '#3B82F6' : 'rgba(255,255,255,0.08)',
                          color: broadcastText.trim() ? 'white' : 'rgba(255,255,255,0.3)',
                          transition: 'all 0.2s',
                        }}
                      >
                        שדר לכולם
                      </motion.button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {broadcastSent && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mt-3 rounded-2xl px-4 py-3 text-center"
                        style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}
                      >
                        <p className="text-sm font-bold" style={{ color: '#10B981' }}>✓ ההודעה נשלחה לכל הצוות</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Tab Bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-around px-4 pb-safe"
        style={{
          background: 'rgba(13,13,13,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          height: 80,
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
      >
        {TABS.map(tab => {
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className="flex flex-col items-center gap-1 min-w-[60px] py-2"
              style={{
                color: active ? '#10B981' : 'rgba(255,255,255,0.35)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div style={{ color: active ? '#10B981' : 'rgba(255,255,255,0.35)' }}>
                {tab.icon}
              </div>
              <span className="text-xs font-bold">{tab.label}</span>
              {active && (
                <motion.div
                  layoutId="activeTabDot"
                  className="w-1 h-1 rounded-full"
                  style={{ background: '#10B981' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Menu Item Sheet */}
      <AnimatePresence>
        {selectedDish && (
          <MenuItemSheet dish={selectedDish} onClose={() => setSelectedDish(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
