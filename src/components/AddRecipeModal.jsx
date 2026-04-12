import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RECIPES } from '../data/recipes';
import { CATEGORIES } from '../data/recipes';
import { DISH_CATEGORIES } from '../data/mainDishes';

// ── Allergen auto-detection dictionary ──
const ALLERGEN_KEYWORDS = {
  'דגים':   ['דג', 'סלמון', 'טונה', 'בס', 'אנשובי', 'הליבוט', 'ברנזינו', 'דניס', 'פורל', 'מקרל', 'קלמרי', 'בקלה', 'מדגה'],
  'ביצים':  ['ביצ', 'חלמון'],
  'חלב':    ['חמאה', 'גבינ', 'פרמז', 'שמנת', 'יוגורט', 'חלב', 'לבנה', 'מוצרלה', 'ריקוטה', 'מסקרפונה', 'בורטה', 'קרם פרש'],
  'גלוטן':  ['קמח', 'לחם', 'פסטה', 'קרוטון', 'בצק', 'חיטה', 'שעורה', 'שיפון', 'פיתה', 'לאפה'],
  'סויה':   ['סויה', 'מיסו', 'טופו', 'אדמה'],
  'שומשום': ['שומשום', 'טחינ'],
  'אגוזים': ['אגוז', 'שקד', 'קשיו', 'פיסטוק', 'מקדמיה', 'פקאן', 'לוז', 'פיני', 'ברזיל'],
  'סרטנים': ['שרימפ', 'סרטן', 'לובסטר', 'ארבה ים', 'כרב'],
};

const ALLERGEN_META = {
  'דגים':   { emoji: '🐟' },
  'ביצים':  { emoji: '🥚' },
  'חלב':    { emoji: '🥛' },
  'גלוטן':  { emoji: '🌾' },
  'סויה':   { emoji: '🫘' },
  'שומשום': { emoji: '🌱' },
  'אגוזים': { emoji: '🥜' },
  'סרטנים': { emoji: '🦐' },
};

function detectAllergens(ingredients) {
  const found = new Set();
  for (const ing of ingredients) {
    const n = ing.name.toLowerCase();
    for (const [allergen, keywords] of Object.entries(ALLERGEN_KEYWORDS)) {
      if (keywords.some(kw => n.includes(kw))) found.add(allergen);
    }
  }
  return [...found];
}

const UNITS = ['גרם', 'ק"ג', 'מ"ל', 'ל׳', 'יחידות', 'כפית', 'כף', 'כוס', 'לפי טעם'];

function emptyIngredient() { return { name: '', amount: '', unit: 'גרם', cost: '' }; }

/* ════════════════════════════════════════════════════
   AddRecipeModal
════════════════════════════════════════════════════ */
export default function AddRecipeModal({ onSave, onClose, existingPrepRecipes = [] }) {
  const [type, setType]           = useState('prep'); // 'prep' | 'dish'
  const [name, setName]           = useState('');
  const [category, setCategory]   = useState('');
  const [station, setStation]     = useState('cold');
  const [prepTime, setPrepTime]   = useState('');
  const [batchUnit, setBatchUnit] = useState('אצווה');
  const [description, setDesc]    = useState('');
  const [notes, setNotes]         = useState('');
  const [sellingPrice, setPrice]  = useState('');
  const portions = '1';
  const [ingredients, setIngredients] = useState([emptyIngredient()]);
  const [steps, setSteps]         = useState(['']);
  const [subRecipes, setSubRecipes]   = useState([]);
  const [subSearch, setSubSearch] = useState('');
  const [allergenOverrides, setAllergenOverrides] = useState(new Set());

  const detectedAllergens = useMemo(() => detectAllergens(ingredients), [ingredients]);
  const allAllergens = useMemo(() => [...new Set([...detectedAllergens, ...allergenOverrides])], [detectedAllergens, allergenOverrides]);

  const totalCost = useMemo(() =>
    ingredients.reduce((s, i) => s + (parseFloat(i.cost) || 0), 0),
    [ingredients]
  );
  const fcp = type === 'dish' && parseFloat(sellingPrice) > 0
    ? (totalCost / parseFloat(sellingPrice)) * 100 : 0;

  const allPrepRecipes = useMemo(() => [...RECIPES, ...existingPrepRecipes], [existingPrepRecipes]);
  const filteredSubSearch = useMemo(() =>
    subSearch
      ? allPrepRecipes.filter(r => r.name.includes(subSearch) && !subRecipes.find(s => s.recipeId === r.id))
      : [],
    [subSearch, allPrepRecipes, subRecipes]
  );

  // ── Helpers ──
  function updateIngredient(i, field, val) {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: val } : ing));
  }
  function addIngredient() { setIngredients(prev => [...prev, emptyIngredient()]); }
  function removeIngredient(i) { setIngredients(prev => prev.filter((_, idx) => idx !== i)); }
  function updateStep(i, val) { setSteps(prev => prev.map((s, idx) => idx === i ? val : s)); }
  function addStep() { setSteps(prev => [...prev, '']); }
  function removeStep(i) { setSteps(prev => prev.filter((_, idx) => idx !== i)); }
  function addSubRecipe(recipe) {
    setSubRecipes(prev => [...prev, { recipeId: recipe.id, name: recipe.name, portionsUsed: 1, portionDesc: '' }]);
    setSubSearch('');
  }
  function removeSubRecipe(i) { setSubRecipes(prev => prev.filter((_, idx) => idx !== i)); }
  function updateSubRecipe(i, field, val) {
    setSubRecipes(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }
  function toggleAllergenOverride(allergen) {
    setAllergenOverrides(prev => {
      const next = new Set(prev);
      next.has(allergen) ? next.delete(allergen) : next.add(allergen);
      return next;
    });
  }

  function handleSave() {
    if (!name.trim()) return;
    const cleanIngredients = ingredients
      .filter(i => i.name.trim())
      .map(i => ({
        name: i.name.trim(),
        amount: parseFloat(i.amount) || 0,
        unit: i.unit,
        ...(i.cost ? { cost: parseFloat(i.cost) } : {}),
      }));
    const cleanSteps = steps.filter(s => s.trim());

    if (type === 'prep') {
      onSave('prep', {
        id: `custom_r_${Date.now()}`,
        name: name.trim(),
        station,
        category: category || 'הכנות',
        batches: 1,
        batchUnit: batchUnit || 'אצווה',
        prepTime: prepTime || '',
        description: description.trim(),
        notes: notes.trim(),
        ingredients: cleanIngredients,
        steps: cleanSteps,
        ...(totalCost > 0 ? { costPerBatch: totalCost } : {}),
        isCustom: true,
      });
    } else {
      const portionsNum = parseFloat(portions) || 1;
      onSave('dish', {
        id: `custom_d_${Date.now()}`,
        name: name.trim(),
        category: category || 'עיקריות',
        station,
        sellingPrice: parseFloat(sellingPrice) || 0,
        defaultPortions: portionsNum,
        prepTimeMin: parseInt(prepTime) || 0,
        allergens: allAllergens,
        description: description.trim(),
        directIngredients: cleanIngredients.map(i => ({ name: i.name, qty: i.amount, unit: i.unit })),
        subRecipes,
        costPerPortion: totalCost / portionsNum,
        method: cleanSteps,
        isCustom: true,
      });
    }
  }

  const prepCategories = CATEGORIES.filter(c => c !== 'הכל');
  const dishCategories = DISH_CATEGORIES.filter(c => c !== 'הכל');
  const categories     = type === 'dish' ? dishCategories : prepCategories;
  const canSave        = name.trim().length > 0 && ingredients.some(i => i.name.trim());

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        overflowY: 'auto',
      }}
      dir="rtl"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ minHeight: '100vh', background: '#121212', paddingBottom: 120 }}
      >
        {/* ── Sticky Header ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(18,18,18,0.97)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', padding: '8px', fontSize: 20, lineHeight: 1 }}>✕</button>
          <span style={{ color: 'white', fontWeight: 900, fontSize: 17 }}>
            {type === 'prep' ? '+ מתכון הכנה' : '+ מנה חדשה'}
          </span>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              background: canSave ? '#10B981' : 'rgba(255,255,255,0.08)',
              color: canSave ? 'white' : 'rgba(255,255,255,0.25)',
              border: 'none', borderRadius: 14, padding: '8px 18px',
              fontWeight: 800, fontSize: 14, transition: 'all 0.2s',
            }}
          >שמור</button>
        </div>

        <div style={{ padding: '20px 16px', maxWidth: 560, margin: '0 auto' }}>

          {/* ── Type toggle ── */}
          <div style={{ display: 'flex', borderRadius: 16, padding: 4, marginBottom: 24, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              { id: 'prep', label: '👨‍🍳 הכנה', sub: 'מתכון בסיס' },
              { id: 'dish', label: '🍽️ מנה', sub: 'מנה לתפריט' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => { setType(t.id); setCategory(''); }}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12,
                  background: type === t.id ? '#10B981' : 'transparent',
                  color: type === t.id ? 'white' : 'rgba(255,255,255,0.4)',
                  fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
                  boxShadow: type === t.id ? '0 4px 14px rgba(16,185,129,0.4)' : 'none',
                }}
              >{t.label}</button>
            ))}
          </div>

          {/* ── Name ── */}
          <FormField label="שם">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={type === 'prep' ? 'למשל: רוטב קיסר' : 'למשל: סלט קיסר'}
              style={inputStyle}
              dir="rtl"
              autoFocus
            />
          </FormField>

          {/* ── Category chips ── */}
          <div style={{ marginBottom: 20 }}>
            <FormLabel>קטגוריה</FormLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  style={{
                    padding: '6px 14px', borderRadius: 12,
                    background: category === c ? '#10B981' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${category === c ? '#10B981' : 'rgba(255,255,255,0.09)'}`,
                    color: category === c ? 'white' : 'rgba(255,255,255,0.5)',
                    fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                  }}
                >{c}</button>
              ))}
            </div>
          </div>

          {/* ── Station ── */}
          <div style={{ marginBottom: 20 }}>
            <FormLabel>פס עבודה</FormLabel>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {[
                { id: 'cold', label: '❄️ קר',  color: '#3B82F6' },
                { id: 'hot',  label: '🔥 חם',  color: '#EF4444' },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setStation(s.id)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 14,
                    background: station === s.id ? s.color + '22' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${station === s.id ? s.color : 'rgba(255,255,255,0.07)'}`,
                    color: station === s.id ? s.color : 'rgba(255,255,255,0.4)',
                    fontWeight: 700, fontSize: 14,
                  }}
                >{s.label}</button>
              ))}
            </div>
          </div>

          {/* ── Prep time + Batch/Price ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <FormField label={type === 'prep' ? 'זמן הכנה' : 'זמן הכנה (דק׳)'}>
              <input value={prepTime} onChange={e => setPrepTime(e.target.value)}
                placeholder={type === 'prep' ? '15 דק׳' : '10'} style={inputStyle} dir="rtl" />
            </FormField>
            {type === 'prep' ? (
              <FormField label="יחידת אצווה">
                <input value={batchUnit} onChange={e => setBatchUnit(e.target.value)}
                  placeholder="אצווה" style={inputStyle} dir="rtl" />
              </FormField>
            ) : (
              <FormField label="מחיר מכירה ₪">
                <input value={sellingPrice} onChange={e => setPrice(e.target.value)}
                  placeholder="0" type="number" style={inputStyle} dir="rtl" />
              </FormField>
            )}
          </div>

          {/* ── Description ── */}
          <FormField label="תיאור (אופציונלי)">
            <textarea value={description} onChange={e => setDesc(e.target.value)}
              placeholder="תיאור קצר..." rows={2} style={{ ...inputStyle, resize: 'none' }} dir="rtl" />
          </FormField>

          <Divider />

          {/* ════ INGREDIENTS ════ */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <FormLabel>מרכיבים</FormLabel>
              <button onClick={addIngredient} style={addBtnStyle}>+ הוסף מרכיב</button>
            </div>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 76px 80px 60px 28px', gap: 6, marginBottom: 4 }}>
              {['מרכיב', 'כמות', 'יחידה', '₪ עלות', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 600, paddingRight: 4 }}>{h}</span>
              ))}
            </div>

            {ingredients.map((ing, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 76px 80px 60px 28px', gap: 6, marginBottom: 7, alignItems: 'center' }}>
                <input
                  value={ing.name}
                  onChange={e => updateIngredient(i, 'name', e.target.value)}
                  placeholder="שם מרכיב"
                  style={cellInput}
                  dir="rtl"
                />
                <input
                  value={ing.amount}
                  onChange={e => updateIngredient(i, 'amount', e.target.value)}
                  placeholder="0"
                  type="number"
                  style={cellInput}
                />
                <select
                  value={ing.unit}
                  onChange={e => updateIngredient(i, 'unit', e.target.value)}
                  style={{ ...cellInput, color: 'rgba(255,255,255,0.7)' }}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input
                  value={ing.cost}
                  onChange={e => updateIngredient(i, 'cost', e.target.value)}
                  placeholder="₪"
                  type="number"
                  style={{ ...cellInput, color: '#10B981' }}
                  title="עלות כוללת של מרכיב זה במתכון (לחישוב FC)"
                />
                <button
                  onClick={() => removeIngredient(i)}
                  disabled={ingredients.length === 1}
                  style={{ color: 'rgba(255,255,255,0.22)', fontSize: 18, paddingBottom: 2, opacity: ingredients.length === 1 ? 0.3 : 1 }}
                >×</button>
              </div>
            ))}

            {/* Cost summary bar */}
            {totalCost > 0 && (
              <div style={{
                marginTop: 10, background: 'rgba(16,185,129,0.07)',
                border: '1px solid rgba(16,185,129,0.18)',
                borderRadius: 12, padding: '9px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
                  עלות {type === 'prep' ? 'אצווה' : 'למנה'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#10B981', fontWeight: 800, fontSize: 15 }}>₪{totalCost.toFixed(2)}</span>
                  {fcp > 0 && (
                    <span style={{
                      padding: '2px 9px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: fcp < 25 ? 'rgba(16,185,129,0.18)' : fcp < 35 ? 'rgba(245,158,11,0.18)' : 'rgba(239,68,68,0.18)',
                      color: fcp < 25 ? '#10B981' : fcp < 35 ? '#F59E0B' : '#EF4444',
                    }}>
                      {fcp.toFixed(0)}% FC
                    </span>
                  )}
                </div>
              </div>
            )}
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>
              עמודת ₪ — עלות כוללת של המרכיב (אופציונלי, לחישוב Food Cost)
            </p>
          </div>

          {/* ════ ALLERGEN DETECTOR ════ */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: 14, marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 15 }}>⚠️</span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 700 }}>אלרגנים</span>
              {detectedAllergens.length > 0 && (
                <span style={{ fontSize: 11, color: '#F59E0B', marginRight: 'auto' }}>
                  {detectedAllergens.length} זוהו אוטומטית
                </span>
              )}
            </div>
            <div>
              {Object.keys(ALLERGEN_META).map(allergen => {
                const isDetected   = detectedAllergens.includes(allergen);
                const isOverridden = allergenOverrides.has(allergen);
                const isActive     = isDetected || isOverridden;
                return (
                  <button
                    key={allergen}
                    onClick={() => toggleAllergenOverride(allergen)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      margin: '3px', padding: '5px 11px', borderRadius: 10,
                      background: isActive ? 'rgba(239,68,68,0.13)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isActive ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.07)'}`,
                      color: isActive ? '#EF4444' : 'rgba(255,255,255,0.25)',
                      fontSize: 12, fontWeight: isActive ? 700 : 400, transition: 'all 0.15s',
                    }}
                  >
                    {ALLERGEN_META[allergen].emoji} {allergen}
                    {isDetected && <span style={{ fontSize: 9, opacity: 0.7, background: 'rgba(239,68,68,0.2)', borderRadius: 4, padding: '1px 4px' }}>auto</span>}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>
              לחץ לביטול/הוספה ידנית. זיהוי אוטומטי לפי שמות המרכיבים.
            </p>
          </div>

          {/* ════ SUB-RECIPES (dish only) ════ */}
          {type === 'dish' && (
            <>
              <Divider />
              <div style={{ marginBottom: 20 }}>
                <FormLabel>תת-מתכונים מקושרים</FormLabel>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 10, marginTop: 4 }}>
                  למשל: רוטב, ציר, קרוטונים שמשולבים במנה זו
                </p>

                {subRecipes.map((sr, i) => (
                  <div key={i} style={{
                    background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
                    borderRadius: 14, padding: '10px 14px', marginBottom: 8,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ flex: 1, color: '#10B981', fontWeight: 700, fontSize: 14 }}>{sr.name}</span>
                    <input
                      value={sr.portionDesc}
                      onChange={e => updateSubRecipe(i, 'portionDesc', e.target.value)}
                      placeholder="כמות (למשל: 60 גרם)"
                      style={{ ...cellInput, width: 120, fontSize: 12 }}
                      dir="rtl"
                    />
                    <button onClick={() => removeSubRecipe(i)} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18, padding: 4 }}>×</button>
                  </div>
                ))}

                {/* Sub-recipe search */}
                <div style={{ position: 'relative' }}>
                  <input
                    value={subSearch}
                    onChange={e => setSubSearch(e.target.value)}
                    placeholder="🔍 חפש מתכון הכנה לקישור..."
                    style={{ ...inputStyle, width: '100%' }}
                    dir="rtl"
                  />
                  {filteredSubSearch.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 20,
                      background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, overflow: 'hidden', marginTop: 4,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}>
                      {filteredSubSearch.slice(0, 6).map(r => (
                        <button
                          key={r.id}
                          onClick={() => addSubRecipe(r)}
                          style={{
                            width: '100%', textAlign: 'right', padding: '11px 14px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            color: 'white', fontSize: 14, fontWeight: 600,
                            background: 'transparent', display: 'flex', alignItems: 'center', gap: 8,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span>{r.name}</span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{r.category}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Divider />

          {/* ════ STEPS ════ */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <FormLabel>{type === 'dish' ? 'שלבי הגשה' : 'שלבי הכנה'}</FormLabel>
              <button onClick={addStep} style={addBtnStyle}>+ שלב</button>
            </div>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginTop: 8,
                  background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: '#10B981', fontWeight: 800,
                }}>
                  {i + 1}
                </div>
                <textarea
                  value={step}
                  onChange={e => updateStep(i, e.target.value)}
                  placeholder={`שלב ${i + 1}...`}
                  rows={2}
                  style={{ ...inputStyle, flex: 1, resize: 'none', fontSize: 14 }}
                  dir="rtl"
                />
                <button
                  onClick={() => removeStep(i)}
                  disabled={steps.length === 1}
                  style={{ color: 'rgba(255,255,255,0.22)', fontSize: 18, padding: '8px 4px', opacity: steps.length === 1 ? 0.3 : 1 }}
                >×</button>
              </div>
            ))}
          </div>

          {/* ── Notes (prep only) ── */}
          {type === 'prep' && (
            <FormField label="הערות (אופציונלי)">
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="הערות מיוחדות, אזהרות..." rows={2}
                style={{ ...inputStyle, resize: 'none' }} dir="rtl" />
            </FormField>
          )}

        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Mini components ──
function FormLabel({ children }) {
  return <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600 }}>{children}</p>;
}
function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <FormLabel>{label}</FormLabel>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}
function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />;
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 12,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
  color: 'white', fontSize: 15, outline: 'none', fontFamily: 'inherit',
};
const cellInput = {
  padding: '8px 10px', borderRadius: 10, width: '100%',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
  color: 'white', fontSize: 13, outline: 'none', fontFamily: 'inherit',
};
const addBtnStyle = {
  background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)',
  color: '#10B981', borderRadius: 10, padding: '5px 12px',
  fontSize: 12, fontWeight: 700,
};
