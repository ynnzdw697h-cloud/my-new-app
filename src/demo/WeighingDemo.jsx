import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const UNITS = ['g', 'ml', 'kg', 'יח׳'];
const PAD_KEYS = ['1','2','3','4','5','6','7','8','9','⌫','0','.'];

const FADE_UP = {
  enter:  { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0 },
  exit:   { opacity: 0, y: -10 },
};

/* ── Shared: Back button ── */
function BackButton({ onBack }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1 text-sm font-semibold min-h-[44px] px-1"
      style={{ color: 'rgba(255,255,255,0.38)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M9 18l6-6-6-6"/>
      </svg>
      חזרה
    </button>
  );
}

/* ── Shared: Numpad ── */
function Numpad({ onPress, onDelete, allowDecimal = true }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 w-full px-4">
      {PAD_KEYS.map((key, i) => {
        const isDel     = key === '⌫';
        const isDot     = key === '.';
        const disabled  = isDot && !allowDecimal;
        return (
          <motion.button
            key={i}
            whileTap={disabled ? {} : { scale: 0.91 }}
            onClick={() => { if (!disabled) isDel ? onDelete() : onPress(key); }}
            className="flex items-center justify-center rounded-3xl font-bold text-2xl"
            style={{
              height: 56,
              background: isDel ? 'rgba(239,68,68,0.12)' : disabled ? 'transparent' : 'rgba(255,255,255,0.06)',
              border:     isDel ? '1px solid rgba(239,68,68,0.22)' : disabled ? '1px solid transparent' : '1px solid rgba(255,255,255,0.07)',
              color:      isDel ? '#EF4444' : disabled ? 'transparent' : 'rgba(255,255,255,0.9)',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              cursor: disabled ? 'default' : 'pointer',
            }}
          >
            {disabled ? '' : key}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════
   PHASE 1 — Recipe type + name
══════════════════════════════════════════════ */
function TypeScreen({ onSelect }) {
  const [name, setName] = useState('');
  const ready = name.trim().length > 0;

  return (
    <div className="flex flex-col h-full px-6 pt-5 pb-6 gap-4">
      {/* Header */}
      <div>
        <p className="text-white font-black text-2xl">מתכון חדש</p>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.38)' }}>מה שם המתכון?</p>
      </div>

      {/* Name input */}
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="למשל: סלט קיסר, ציר דגים..."
        className="w-full rounded-2xl px-4 py-4 text-white font-semibold text-base"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          outline: 'none',
          color: 'white',
        }}
      />

      <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>
        בחר סוג מתכון
      </p>

      {/* Type cards */}
      <div className="flex flex-col gap-3 flex-1 justify-center">
        {[
          { id: 'prep', title: 'מתכון הכנות', desc: 'בסיסים, רטבים, תוספות, ציר...', icon: '🥣' },
          { id: 'dish', title: 'מנה מוגמרת',  desc: 'ראשונות, עיקריות, קינוחים...', icon: '🍽' },
        ].map(t => (
          <motion.button
            key={t.id}
            whileTap={ready ? { scale: 0.97 } : {}}
            onClick={() => ready && onSelect(t.id, name.trim())}
            className="flex items-center gap-4 rounded-3xl p-5 text-right transition-all duration-200"
            style={{
              background: ready ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${ready ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}`,
              opacity: ready ? 1 : 0.45,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: '2.2rem' }}>{t.icon}</span>
            <div className="text-right flex-1">
              <p className="text-white font-black text-lg leading-tight">{t.title}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.38)' }}>{t.desc}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PHASE 2 — Ingredient list builder
══════════════════════════════════════════════ */
function IngredientsScreen({ recipeType, recipeName, onNext, onBack }) {
  const [list, setList]           = useState([]);
  const [nameInput, setNameInput] = useState('');
  const [fmtInput,  setFmtInput]  = useState('');
  const nameRef = useRef(null);
  const isDish  = recipeType === 'dish';

  function addIngredient() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setList(prev => [...prev, isDish
      ? { name: trimmed, format: fmtInput.trim() || null }
      : { name: trimmed }
    ]);
    setNameInput('');
    setFmtInput('');
    setTimeout(() => nameRef.current?.focus(), 50);
  }

  function remove(i) {
    setList(prev => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
        <BackButton onBack={onBack} />
        <div className="text-right">
          <p className="text-white font-black text-base">{recipeName}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {isDish ? 'מנה מוגמרת' : 'מתכון הכנות'} · רשימת מרכיבים
          </p>
        </div>
      </div>

      {/* Ingredient list */}
      <div className="flex-1 overflow-y-auto px-5 space-y-2 py-1" style={{ minHeight: 0 }}>
        <AnimatePresence>
          {list.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center justify-center h-24">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>
                הוסף מרכיבים למטה
              </p>
            </motion.div>
          ) : list.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <button
                onClick={() => remove(i)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', minWidth: 28 }}
              >
                ✕
              </button>
              <div className="flex-1 text-right min-w-0">
                <p className="text-white font-bold text-sm truncate">{item.name}</p>
                {item.format && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.format}</p>
                )}
              </div>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
                {i + 1}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input zone */}
      <div className="flex-shrink-0 px-5 pb-5 pt-3 space-y-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <input
          ref={nameRef}
          type="text"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !isDish && addIngredient()}
          placeholder={isDish ? 'שם חומר הגלם' : 'הוסף מרכיב...'}
          className="w-full rounded-2xl px-4 py-3 text-sm font-semibold"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            outline: 'none',
            color: 'white',
          }}
        />
        {isDish && (
          <input
            type="text"
            value={fmtInput}
            onChange={e => setFmtInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addIngredient()}
            placeholder="חיתוך / מידה — כף, קוביות, פרוסות, מצקת..."
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              outline: 'none',
              color: 'white',
            }}
          />
        )}
        <div className="flex gap-2">
          <motion.button
            whileTap={nameInput.trim() ? { scale: 0.93 } : {}}
            onClick={addIngredient}
            className="w-12 h-12 rounded-2xl font-black text-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: nameInput.trim() ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
              color:      nameInput.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            +
          </motion.button>
          <motion.button
            whileTap={list.length > 0 ? { scale: 0.97 } : {}}
            onClick={() => list.length > 0 && onNext(list)}
            className="flex-1 rounded-2xl py-3 font-black text-sm"
            style={{
              background: list.length > 0 ? '#10B981' : 'rgba(255,255,255,0.05)',
              color:      list.length > 0 ? '#fff'    : 'rgba(255,255,255,0.2)',
              boxShadow:  list.length > 0 ? '0 0 20px rgba(16,185,129,0.3)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            המשך לשקילה {list.length > 0 ? `(${list.length})` : ''} →
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PHASE 3 — Weighing
══════════════════════════════════════════════ */
function WeighingScreen({ ingredientList, onDone, onBack }) {
  const [wIndex,    setWIndex]    = useState(0);
  const [rawInput,  setRawInput]  = useState('');
  const [unit,      setUnit]      = useState('g');
  const [subStep,   setSubStep]   = useState('count');
  const [unitCount, setUnitCount] = useState('');
  const [results,   setResults]   = useState([]);

  const ingredient   = ingredientList[wIndex];
  const isUnits      = unit === 'יח׳';
  const isWeightStep = isUnits && subStep === 'weight';
  const canNext      = rawInput.length > 0 && parseFloat(rawInput) > 0;

  const pressKey = useCallback((key) => {
    setRawInput(prev => {
      if (key === '.' && prev.includes('.')) return prev;
      if (prev.length >= 6) return prev;
      if (prev === '0' && key !== '.') return prev;
      return prev + key;
    });
  }, []);

  const deleteKey = useCallback(() => setRawInput(p => p.slice(0, -1)), []);

  function handleUnitChange(u) {
    setUnit(u); setSubStep('count'); setUnitCount(''); setRawInput('');
  }

  function next() {
    if (!canNext) return;
    if (isUnits && subStep === 'count') {
      setUnitCount(rawInput); setRawInput(''); setSubStep('weight'); return;
    }
    const result = isUnits
      ? { name: ingredient.name, format: ingredient.format,
          qty: parseInt(unitCount, 10), unit: 'יח׳',
          totalWeight: parseFloat(rawInput),
          weightPerUnit: parseFloat(rawInput) / parseInt(unitCount, 10) }
      : { name: ingredient.name, format: ingredient.format,
          qty: parseFloat(rawInput), unit };

    const newResults = [...results, result];
    if (wIndex + 1 >= ingredientList.length) { onDone(newResults); return; }
    setResults(newResults);
    setWIndex(i => i + 1);
    setRawInput(''); setUnit('g'); setSubStep('count'); setUnitCount('');
  }

  const slideVariants = {
    enter:  { x: '-100%', opacity: 0 },
    center: { x: 0,       opacity: 1 },
    exit:   { x: '100%',  opacity: 0 },
  };

  const prompt = isWeightStep
    ? 'שקול את כולם ביחד על המאזניים'
    : isUnits ? 'כמה יחידות?'
    : 'הנח על המאזניים והזן את המשקל';

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2 flex-shrink-0">
        <BackButton onBack={onBack} />
        <div className="flex gap-1.5 items-center">
          {ingredientList.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300"
              style={{
                width: i === wIndex ? 16 : 5, height: 5,
                background: i < wIndex ? '#10B981' : i === wIndex ? '#fff' : 'rgba(255,255,255,0.18)',
              }} />
          ))}
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center relative px-6"
        style={{ minHeight: 0, overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={wIndex}
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="flex flex-col items-center gap-2 w-full"
          >
            <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.28)' }}>
              מרכיב {wIndex + 1} מתוך {ingredientList.length}
            </p>
            <p className="text-3xl font-black text-white text-center leading-tight">
              {ingredient.name}
            </p>
            {ingredient.format && (
              <span className="text-xs font-bold rounded-full px-3 py-1"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                {ingredient.format}
              </span>
            )}
            <AnimatePresence mode="wait">
              <motion.p key={prompt}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-sm" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {prompt}
              </motion.p>
            </AnimatePresence>
            <AnimatePresence>
              {isWeightStep && (
                <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2">
                  <span className="text-xs font-black rounded-full px-3 py-1"
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                    {unitCount} יחידות
                  </span>
                  <button
                    onClick={() => { setSubStep('count'); setRawInput(unitCount); setUnitCount(''); }}
                    className="text-xs font-semibold"
                    style={{ color: 'rgba(255,255,255,0.35)', touchAction: 'manipulation' }}>
                    ← חזרה לספירה
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div
              className="flex items-end justify-center gap-2 rounded-3xl px-8 py-3 w-full"
              animate={{ background: canNext ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)' }}
              style={{ border: `1px solid ${canNext ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}` }}
            >
              <span className="font-black leading-none tabular-nums"
                style={{ fontSize: '2.5rem', color: canNext ? '#fff' : 'rgba(255,255,255,0.2)',
                  minWidth: '4rem', textAlign: 'center' }}>
                {rawInput || '0'}
              </span>
              <span className="font-bold text-lg pb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {isWeightStep ? 'g' : unit}
              </span>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom */}
      <div className="flex-shrink-0 pb-4 pt-1 flex flex-col gap-2">
        <AnimatePresence>
          {!isWeightStep && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex gap-2 justify-center px-4 overflow-hidden">
              {UNITS.map(u => (
                <button key={u} onClick={() => handleUnitChange(u)}
                  className="rounded-2xl px-4 py-2 text-sm font-bold transition-all duration-200"
                  style={{
                    background: unit === u ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
                    color:      unit === u ? '#fff' : 'rgba(255,255,255,0.35)',
                    border: unit === u ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.07)',
                    minWidth: '3rem', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                  }}>
                  {u}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <Numpad onPress={pressKey} onDelete={deleteKey} allowDecimal={!isUnits || isWeightStep} />
        <div className="px-4">
          <motion.button whileTap={{ scale: 0.97 }} onClick={next} disabled={!canNext}
            className="w-full rounded-3xl py-4 font-black text-lg"
            style={{
              background: canNext ? '#10B981' : 'rgba(255,255,255,0.05)',
              color:      canNext ? '#fff'    : 'rgba(255,255,255,0.2)',
              boxShadow:  canNext ? '0 0 24px rgba(16,185,129,0.35)' : 'none',
              border: '1px solid rgba(255,255,255,0.07)',
              transition: 'all 0.25s ease',
            }}>
            {isUnits && subStep === 'count'
              ? 'המשך לשקילה →'
              : wIndex + 1 >= ingredientList.length ? 'סיים שקילה ✓' : 'המשך →'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PHASE 4 — Instructions builder
══════════════════════════════════════════════ */
function InstructionsScreen({ recipeName, onDone, onBack }) {
  const [steps, setSteps] = useState([]);
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  function addStep() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setSteps(prev => [...prev, trimmed]);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function removeStep(i) {
    setSteps(prev => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
        <BackButton onBack={onBack} />
        <div className="text-right">
          <p className="text-white font-black text-base">{recipeName}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>הוראות הכנה</p>
        </div>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto px-5 space-y-2 py-1" style={{ minHeight: 0 }}>
        <AnimatePresence>
          {steps.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center justify-center h-24">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>הוסף שלבי הכנה למטה</p>
            </motion.div>
          ) : steps.map((step, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              className="flex items-start gap-3 rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <button onClick={() => removeStep(i)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', minWidth: 28 }}>
                ✕
              </button>
              <p className="text-white text-sm leading-relaxed flex-1 text-right">{step}</p>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', minWidth: 28 }}>
                {i + 1}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input zone */}
      <div className="flex-shrink-0 px-5 pb-5 pt-3 space-y-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="תאר את שלב ההכנה..."
          rows={2}
          className="w-full rounded-2xl px-4 py-3 text-sm font-semibold resize-none"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            outline: 'none',
            color: 'white',
          }}
        />
        <div className="flex gap-2">
          <motion.button
            whileTap={input.trim() ? { scale: 0.93 } : {}}
            onClick={addStep}
            className="w-12 h-12 rounded-2xl font-black text-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: input.trim() ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
              color:      input.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
            +
          </motion.button>
          <motion.button
            whileTap={steps.length > 0 ? { scale: 0.97 } : {}}
            onClick={() => steps.length > 0 && onDone(steps)}
            className="flex-1 rounded-2xl py-3 font-black text-sm"
            style={{
              background: steps.length > 0 ? '#10B981' : 'rgba(255,255,255,0.05)',
              color:      steps.length > 0 ? '#fff'    : 'rgba(255,255,255,0.2)',
              boxShadow:  steps.length > 0 ? '0 0 20px rgba(16,185,129,0.3)' : 'none',
              transition: 'all 0.2s ease',
            }}>
            סיים ✓
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PHASE 5 — Summary
══════════════════════════════════════════════ */
function SummaryScreen({ recipe, onRestart }) {
  const [saved,    setSaved]    = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const uploadRef  = useRef(null);
  const captureRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoUrl(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className="flex flex-col h-full px-5 pt-4 pb-6" style={{ overflow: 'hidden' }}>
      {/* Hidden file inputs */}
      <input ref={uploadRef}  type="file" accept="image/*"                      style={{ display: 'none' }} onChange={handleFile} />
      <input ref={captureRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />

      {/* Header — centered */}
      <div className="flex flex-col items-center mb-4 flex-shrink-0 gap-1">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.2)', border: '1.5px solid #10B981', color: '#10B981', fontSize: '1rem', fontWeight: 900 }}>
          ✓
        </motion.div>
        <p className="text-white font-black text-xl text-center">{recipe.name}</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {recipe.type === 'prep' ? 'מתכון הכנות' : 'מנה מוגמרת'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-3" style={{ minHeight: 0 }}>

        {/* Photo card */}
        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {photoUrl ? (
            <div className="relative">
              <img src={photoUrl} alt="מנה" className="w-full object-cover" style={{ maxHeight: 180 }} />
              <button
                onClick={() => setPhotoUrl(null)}
                className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
                ✕
              </button>
            </div>
          ) : (
            <div className="p-4">
              <p className="text-xs font-bold mb-3 text-right" style={{ color: 'rgba(255,255,255,0.35)' }}>
                תמונת מנה
              </p>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => captureRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                  <span>📷</span> צלם
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => uploadRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                  <span>🖼</span> העלה
                </motion.button>
              </div>
            </div>
          )}
        </div>

        {/* Ingredients */}
        <div className="rounded-3xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-bold mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
            מרכיבים ({recipe.ingredients.length})
          </p>
          <div className="space-y-2.5">
            {recipe.ingredients.map((r, i) => (
              <div key={i} className="flex justify-between items-start text-sm gap-2">
                <span className="font-black flex-shrink-0" style={{ color: '#10B981' }}>
                  {r.unit === 'יח׳'
                    ? `${r.qty} יח׳ · ${r.totalWeight}g`
                    : `${r.qty} ${r.unit}`}
                </span>
                <div className="text-right min-w-0">
                  <p className="text-white font-semibold truncate">{r.name}</p>
                  {r.format && (
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>{r.format}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        {recipe.steps.length > 0 && (
          <div className="rounded-3xl p-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-bold mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
              הוראות הכנה ({recipe.steps.length} שלבים)
            </p>
            <div className="space-y-2.5">
              {recipe.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', minWidth: 24 }}>
                    {i + 1}
                  </span>
                  <p className="text-white leading-relaxed text-right flex-1">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="flex-shrink-0 pt-4 flex gap-3">
        <motion.button whileTap={{ scale: 0.96 }} onClick={onRestart}
          className="flex-1 rounded-3xl py-3 font-bold text-sm"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
          מתכון חדש
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => setSaved(true)} disabled={saved}
          className="flex-1 rounded-3xl py-3 font-black text-sm"
          style={{
            background: saved ? 'rgba(16,185,129,0.3)' : '#10B981',
            color: '#fff',
            boxShadow: saved ? 'none' : '0 0 20px rgba(16,185,129,0.35)',
            transition: 'all 0.3s ease',
          }}>
          {saved ? '✓ נשמר' : 'שמור מתכון'}
        </motion.button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════ */
export default function WeighingDemo() {
  const [phase, setPhase]                   = useState('type');
  const [recipeType, setRecipeType]         = useState(null);
  const [recipeName, setRecipeName]         = useState('');
  const [ingredientList, setIngredientList] = useState([]);
  const [weightResults, setWeightResults]   = useState([]);
  const [steps, setSteps]                   = useState([]);

  function handleTypeSelect(type, name) {
    setRecipeType(type); setRecipeName(name); setPhase('ingredients');
  }
  function handleIngredientsNext(list) {
    setIngredientList(list); setPhase('weighing');
  }
  function handleWeighingDone(results) {
    setWeightResults(results); setPhase('instructions');
  }
  function handleInstructionsDone(s) {
    setSteps(s); setPhase('summary');
  }
  function goBack() {
    const prev = { ingredients: 'type', weighing: 'ingredients', instructions: 'weighing', summary: 'instructions' };
    if (prev[phase]) setPhase(prev[phase]);
  }
  function restart() {
    setPhase('type'); setRecipeType(null); setRecipeName('');
    setIngredientList([]); setWeightResults([]); setSteps([]);
  }

  return (
    <div
      dir="rtl"
      style={{
        height: '100dvh',
        background: '#121212',
        fontFamily: "'Inter', 'Heebo', Arial, sans-serif",
        userSelect: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          variants={FADE_UP}
          initial="enter" animate="center" exit="exit"
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {phase === 'type'         && <TypeScreen onSelect={handleTypeSelect} />}
          {phase === 'ingredients'  && <IngredientsScreen recipeType={recipeType} recipeName={recipeName} onNext={handleIngredientsNext} onBack={goBack} />}
          {phase === 'weighing'     && <WeighingScreen ingredientList={ingredientList} onDone={handleWeighingDone} onBack={goBack} />}
          {phase === 'instructions' && <InstructionsScreen recipeName={recipeName} onDone={handleInstructionsDone} onBack={goBack} />}
          {phase === 'summary'      && <SummaryScreen recipe={{ name: recipeName, type: recipeType, ingredients: weightResults, steps }} onRestart={restart} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
