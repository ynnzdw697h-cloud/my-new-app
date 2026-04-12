import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RECIPES, CATEGORIES } from '../data/recipes';
import { MAIN_DISHES, DISH_CATEGORIES } from '../data/mainDishes';
import { STATIONS } from '../data/stations';
import { db } from '../firebase';
import { doc, collection, onSnapshot, setDoc } from 'firebase/firestore';
import { useTenantId } from '../context/TenantContext';
import { useFirestoreArray } from '../hooks/useFirestoreArray';
import AddRecipeModal from './AddRecipeModal';

// ─── Prep category metadata ───
const CAT_META = {
  'ציר':     { emoji: '🫕', g: ['#0f2d4a', '#061525'] },
  'רטבים':   { emoji: '🥣', g: ['#2d1b3d', '#150d20'] },
  'מותססים': { emoji: '🧫', g: ['#0e2d1a', '#061508'] },
  'כבושים':  { emoji: '🥒', g: ['#1e2d10', '#101808'] },
  'בצקים':   { emoji: '🥖', g: ['#3d2010', '#200f06'] },
  'ממרחים':  { emoji: '🫙', g: ['#2d1010', '#180606'] },
  'הכנות':   { emoji: '👨‍🍳', g: ['#10182d', '#060c18'] },
  'אורז':    { emoji: '🍚', g: ['#282610', '#141308'] },
  'תוספות':  { emoji: '🌿', g: ['#0e2d18', '#06150c'] },
  'סלטים':   { emoji: '🥗', g: ['#0a2d18', '#05140c'] },
};

// ─── Dish category metadata ───
const DISH_CAT_META = {
  'סלטים':   { emoji: '🥗', g: ['#0a2d18', '#05140c'] },
  'עיקריות': { emoji: '🍽️', g: ['#1a1020', '#0d0810'] },
  'קינוחים': { emoji: '🍮', g: ['#2d1a08', '#160d04'] },
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

const DEFAULT_META = { emoji: '🍽️', g: ['#1a1a28', '#0c0c18'] };

function fmt(n) {
  if (n === 0) return '0';
  return parseFloat((Math.round(n * 1000) / 1000).toFixed(3)).toString();
}

function foodCostColor(pct) {
  if (pct < 25) return '#10B981';
  if (pct < 35) return '#F59E0B';
  return '#EF4444';
}

// ─── Hook: load recipe images from Firestore ───
// Images are stored per-recipe in a subcollection to avoid the 1 MB document limit.
// The legacy single-doc is also read so old saved images still appear.
function useRecipeImages() {
  const tenantId            = useTenantId();
  const [images, setImages] = useState({});

  useEffect(() => {
    if (!tenantId) return;
    // Shared mutable accumulator so both callbacks stay in sync
    const merged = {};

    // (1) Legacy: single combined document — backward compat
    const unsub1 = onSnapshot(
      doc(db, 'tenants', tenantId, 'kitchen', 'recipe_images'),
      snap => {
        if (snap.exists()) {
          Object.assign(merged, snap.data());
          setImages({ ...merged });
        }
      },
      err => console.warn('[recipe_images legacy]', err.code)
    );

    // (2) New: per-recipe collection — no document-size limit
    const unsub2 = onSnapshot(
      collection(db, 'tenants', tenantId, 'recipe_images_col'),
      snapshot => {
        snapshot.forEach(docSnap => { merged[docSnap.id] = docSnap.data().url; });
        setImages({ ...merged });
      },
      err => console.warn('[recipe_images_col]', err.code)
    );

    return () => { unsub1(); unsub2(); };
  }, [tenantId]);

  const saveImage = useCallback(async (id, imageUrl) => {
    // Each recipe's image gets its own document — no 1 MB combined-doc overflow
    const safeId = String(id).replace(/\./g, '_');
    await setDoc(
      doc(db, 'tenants', tenantId, 'recipe_images_col', safeId),
      { url: imageUrl }
    );
    // Optimistic local update so the UI doesn't wait for the snapshot
    setImages(prev => ({ ...prev, [safeId]: imageUrl }));
  }, [tenantId]);

  return { images, saveImage };
}

/* ════════════════════════════════════════════════════
   Main export
════════════════════════════════════════════════════ */
export default function RecipeDatabase({ station, onMarkReady }) {
  const [activeTab, setActiveTab]           = useState('dish');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedDish, setSelectedDish]     = useState(null);
  const [drillRecipe, setDrillRecipe]       = useState(null);
  const [category, setCategory]             = useState('הכל');
  const [search, setSearch]                 = useState('');
  const [batches, setBatches]               = useState(1);
  const [showAddModal, setShowAddModal]     = useState(false);
  const { images, saveImage }               = useRecipeImages();

  const [customRecipes, setCustomRecipes] = useFirestoreArray('custom_recipes');
  const [customDishes,  setCustomDishes]  = useFirestoreArray('custom_dishes');

  const allRecipes = [...RECIPES, ...customRecipes];
  const allDishes  = [...MAIN_DISHES, ...customDishes];

  const st = STATIONS[station];

  function switchTab(tab) {
    setActiveTab(tab);
    setCategory('הכל');
    setSearch('');
  }

  function handleSaveRecipe(type, data) {
    if (type === 'prep') {
      setCustomRecipes(prev => [data, ...prev]);
    } else {
      setCustomDishes(prev => [data, ...prev]);
    }
    setShowAddModal(false);
  }

  const filteredPrep = allRecipes.filter(r => {
    const matchCat    = category === 'הכל' || r.category === category;
    const matchSearch = r.name.includes(search) || (r.description || '').includes(search);
    return matchCat && matchSearch;
  });

  const filteredDishes = allDishes.filter(d => {
    const matchCat    = category === 'הכל' || d.category === category;
    const matchSearch = d.name.includes(search) || (d.description || '').includes(search);
    return matchCat && matchSearch;
  });

  function openRecipe(recipe) {
    setSelectedRecipe(recipe);
    setBatches(recipe.batches);
  }

  const scaleFactor = selectedRecipe ? batches / selectedRecipe.batches : 1;

  // ── Sub-recipe drill-down from DishDetail ──
  if (drillRecipe) {
    return (
      <RecipeDetail
        recipe={drillRecipe}
        scaleFactor={1}
        batches={drillRecipe.batches}
        onUpdateBatches={() => {}}
        onBack={() => setDrillRecipe(null)}
        stationColor={st.color}
        imageUrl={images[String(drillRecipe.id)] || null}
        onSaveImage={url => saveImage(drillRecipe.id, url)}
      />
    );
  }

  // ── Dish detail ──
  if (selectedDish) {
    return (
      <DishDetail
        dish={selectedDish}
        onOpenSubRecipe={recipe => setDrillRecipe(recipe)}
        onBack={() => setSelectedDish(null)}
        stationColor={st.color}
        imageUrl={images[String(selectedDish.id)] || null}
        onSaveImage={url => saveImage(selectedDish.id, url)}
        allPrepRecipes={allRecipes}
      />
    );
  }

  // ── Prep recipe detail ──
  if (selectedRecipe) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        scaleFactor={scaleFactor}
        batches={batches}
        onUpdateBatches={val => setBatches(Math.max(0.25, parseFloat(val) || 1))}
        onBack={() => setSelectedRecipe(null)}
        stationColor={st.color}
        imageUrl={images[String(selectedRecipe.id)] || null}
        onSaveImage={url => saveImage(selectedRecipe.id, url)}
        onMarkReady={onMarkReady}
      />
    );
  }

  const cats    = activeTab === 'dish' ? DISH_CATEGORIES : CATEGORIES;
  const catMeta = activeTab === 'dish' ? DISH_CAT_META   : CAT_META;

  return (
    <div className="px-4 py-5 max-w-xl mx-auto" dir="rtl" style={{ position: 'relative' }}>
      <AnimatePresence>
        {showAddModal && (
          <AddRecipeModal
            onSave={handleSaveRecipe}
            onClose={() => setShowAddModal(false)}
            existingPrepRecipes={customRecipes}
          />
        )}
      </AnimatePresence>

      {/* FAB */}
      <button
        onClick={() => setShowAddModal(true)}
        style={{
          position: 'fixed', bottom: 104, left: 20, zIndex: 40,
          width: 52, height: 52, borderRadius: '50%',
          background: '#10B981',
          boxShadow: '0 4px 20px rgba(16,185,129,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, color: 'white', fontWeight: 300,
          border: 'none',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >+</button>

      {/* ── Tab switcher ── */}
      <div
        className="flex rounded-2xl p-1 mb-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {[
          { id: 'dish', label: 'מנות ראשיות', emoji: '🍽️' },
          { id: 'prep', label: 'הכנות',        emoji: '👨‍🍳' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all duration-200"
            style={{
              background:  activeTab === tab.id ? st.color : 'transparent',
              color:       activeTab === tab.id ? '#fff'   : 'rgba(255,255,255,0.4)',
              boxShadow:   activeTab === tab.id ? `0 4px 14px ${st.color}50` : 'none',
            }}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder={activeTab === 'dish' ? 'חפש מנה...' : 'חפש מתכון...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-white placeholder-opacity-40 focus:outline-none text-base"
          style={{ color: 'white', caretColor: st.color }}
          dir="rtl"
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ color: 'rgba(255,255,255,0.4)' }}>✕</button>
        )}
      </div>

      {/* ── Category chips ── */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {cats.map(c => {
          const active = category === c;
          const meta   = catMeta[c] || DEFAULT_META;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="glow-btn flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-semibold"
              style={{
                background: active ? st.color : 'var(--bg-card)',
                border:     active ? `1px solid ${st.color}` : '1px solid var(--border)',
                color:      active ? '#fff' : 'rgba(255,255,255,0.45)',
                boxShadow:  active ? `0 4px 16px ${st.color}40` : 'none',
              }}
            >
              {c !== 'הכל' && <span>{meta.emoji}</span>}
              {c}
            </button>
          );
        })}
      </div>

      {/* ── Count ── */}
      <p className="text-xs font-semibold mb-4 px-1" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
        {activeTab === 'dish' ? filteredDishes.length : filteredPrep.length} {activeTab === 'dish' ? 'מנות' : 'מתכונים'}
      </p>

      {/* ── Dish grid ── */}
      {activeTab === 'dish' ? (
        <div className="grid grid-cols-2 gap-3">
          {filteredDishes.map(dish => {
            const meta   = DISH_CAT_META[dish.category] || DEFAULT_META;
            const imgUrl = images[String(dish.id)];
            const fcp    = dish.sellingPrice > 0 ? (dish.costPerPortion / dish.sellingPrice * 100) : 0;
            return (
              <button
                key={dish.id}
                onClick={() => setSelectedDish(dish)}
                className="glow-btn rounded-3xl overflow-hidden text-right"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
              >
                <div
                  className="relative w-full"
                  style={{
                    paddingTop: '72%',
                    background: imgUrl ? undefined : `linear-gradient(135deg, ${meta.g[0]}, ${meta.g[1]})`,
                  }}
                >
                  {imgUrl ? (
                    <img src={imgUrl} alt={dish.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span style={{ fontSize: '2.5rem', opacity: 0.6 }}>{meta.emoji}</span>
                    </div>
                  )}
                  <div
                    className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-xl text-xs font-bold"
                    style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(6px)' }}
                  >
                    {dish.category}
                  </div>
                  {fcp > 0 && (
                    <div
                      className="absolute bottom-2 left-2 px-2 py-0.5 rounded-xl text-xs font-black"
                      style={{ background: 'rgba(0,0,0,0.7)', color: foodCostColor(fcp), backdropFilter: 'blur(6px)' }}
                    >
                      {fcp.toFixed(0)}% FC
                    </div>
                  )}
                  {dish.isCustom && (
                    <div
                      className="absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(16,185,129,0.7)', color: 'white', backdropFilter: 'blur(6px)' }}
                    >✎</div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-white font-bold text-sm leading-tight mb-1.5">{dish.name}</h3>
                  <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <span className="text-xs">⏱ {dish.prepTimeMin} דק׳</span>
                    {dish.sellingPrice > 0 && <span className="text-xs">· ₪{dish.sellingPrice}</span>}
                  </div>
                </div>
              </button>
            );
          })}
          {filteredDishes.length === 0 && (
            <div className="col-span-2 text-center py-20" style={{ color: 'rgba(255,255,255,0.25)' }}>
              <div className="text-5xl mb-4">🔍</div>
              <div className="font-medium">לא נמצאו מנות</div>
            </div>
          )}
        </div>
      ) : (
        /* ── Prep grid ── */
        <>
          <div className="grid grid-cols-2 gap-3">
            {filteredPrep.map(recipe => {
              const meta   = CAT_META[recipe.category] || DEFAULT_META;
              const imgUrl = images[String(recipe.id)];
              return (
                <button
                  key={recipe.id}
                  onClick={() => openRecipe(recipe)}
                  className="glow-btn rounded-3xl overflow-hidden text-right"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
                >
                  <div
                    className="relative w-full"
                    style={{
                      paddingTop: '72%',
                      background: imgUrl ? undefined : `linear-gradient(135deg, ${meta.g[0]}, ${meta.g[1]})`,
                    }}
                  >
                    {imgUrl ? (
                      <img src={imgUrl} alt={recipe.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span style={{ fontSize: '2.5rem', opacity: 0.6 }}>{meta.emoji}</span>
                      </div>
                    )}
                    <div
                      className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-xl text-xs font-bold"
                      style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(6px)' }}
                    >
                      {recipe.category}
                    </div>
                    {recipe.isCustom && (
                      <div
                        className="absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(16,185,129,0.7)', color: 'white', backdropFilter: 'blur(6px)' }}
                      >✎</div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-white font-bold text-sm leading-tight mb-1.5">{recipe.name}</h3>
                    <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <span className="text-xs">⏱ {recipe.prepTime}</span>
                      <span className="text-xs">· {recipe.ingredients.length} מרכיבים</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {filteredPrep.length === 0 && (
            <div className="text-center py-20" style={{ color: 'rgba(255,255,255,0.25)' }}>
              <div className="text-5xl mb-4">🔍</div>
              <div className="font-medium">לא נמצאו מתכונים</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   Dish Detail (Main / Assembly Recipe)
════════════════════════════════════════════════════ */
function DishDetail({ dish, onOpenSubRecipe, onBack, stationColor, imageUrl, onSaveImage, allPrepRecipes = RECIPES }) {
  const [portions, setPortions]   = useState(dish.defaultPortions);
  const [fohOpen, setFohOpen]     = useState(false);
  const fileRef                   = useRef();
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const scale     = portions / dish.defaultPortions;
  const totalCost = dish.costPerPortion * portions;
  const fcp       = dish.sellingPrice > 0 ? (dish.costPerPortion / dish.sellingPrice * 100) : 0;
  const fcColor   = foodCostColor(fcp);
  const meta      = DISH_CAT_META[dish.category] || DEFAULT_META;

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const base64 = await compressImage(file, 900, 0.72);
      await onSaveImage(base64);
    } catch (err) {
      console.error('Upload failed', err);
      setUploadError(err.message || 'שגיאה בהעלאה');
    } finally {
      setUploading(false);
    }
  }

  const QUICK_PORTIONS = [1, 2, 4, 6, 10];

  return (
    <div dir="rtl" className="max-w-xl mx-auto pb-10">

      {/* ── Hero ── */}
      <div
        className="relative w-full"
        style={{ height: '260px', background: imageUrl ? undefined : `linear-gradient(160deg, ${meta.g[0]}, ${meta.g[1]})` }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={dish.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span style={{ fontSize: '5rem', opacity: 0.35 }}>{meta.emoji}</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.4) 100%)' }} />

        {/* Back */}
        <button
          onClick={onBack}
          className="absolute top-4 right-4 w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        {/* Upload */}
        <button
          onClick={() => fileRef.current.click()}
          disabled={uploading}
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold active:scale-90 transition-all"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}
        >
          {uploading ? <span>מעלה...</span> : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {imageUrl ? 'החלף תמונה' : 'הוסף תמונה'}
            </>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        {/* Upload error */}
        {uploadError && (
          <div
            className="absolute top-16 left-4 right-4 rounded-2xl px-4 py-2 text-xs font-bold"
            style={{ background: 'rgba(220,38,38,0.9)', color: 'white', backdropFilter: 'blur(8px)' }}
          >
            שגיאה: {uploadError}
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 inset-x-0 p-5">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-xl mb-2 inline-block"
            style={{ background: stationColor + '35', color: stationColor, border: `1px solid ${stationColor}40` }}
          >
            {dish.category}
          </span>
          <h2 className="text-2xl font-black text-white leading-tight mt-1">{dish.name}</h2>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 space-y-4 mt-4">

        {/* Info chips */}
        <div className="flex gap-2 flex-wrap">
          <InfoChip icon="⏱" text={`${dish.prepTimeMin} דק׳`} />
          <InfoChip icon="🥘" text={`${dish.directIngredients.length + dish.subRecipes.length} רכיבים`} />
          {dish.sellingPrice > 0 && <InfoChip icon="₪" text={`${dish.sellingPrice}`} />}
        </div>

        {/* Description */}
        {dish.description && (
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {dish.description}
          </p>
        )}

        {/* Allergens */}
        {dish.allergens && dish.allergens.length > 0 && (
          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <p className="text-xs font-bold mb-2" style={{ color: 'rgba(245,158,11,0.8)' }}>⚠️ אלרגנים</p>
            <div className="flex gap-2 flex-wrap">
              {dish.allergens.map(a => {
                const m = ALLERGEN_META[a] || { emoji: '⚠️' };
                return (
                  <span
                    key={a}
                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}
                  >
                    {m.emoji} {a}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Portions scaler */}
        <div className="rounded-3xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-white font-bold mb-3 flex items-center gap-2">
            <span>⚖️</span> מנות
          </p>
          <div className="flex gap-2 mb-3">
            {QUICK_PORTIONS.map(n => (
              <button
                key={n}
                onClick={() => setPortions(n)}
                className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all duration-150"
                style={{
                  background: portions === n ? stationColor : 'rgba(255,255,255,0.06)',
                  color:      portions === n ? '#fff' : 'rgba(255,255,255,0.5)',
                  boxShadow:  portions === n ? `0 4px 14px ${stationColor}50` : 'none',
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPortions(p => Math.max(1, p - 1))}
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold active:scale-90 transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
            >−</button>
            <div className="flex-1 text-center">
              <div className="text-white font-black text-2xl">{portions}</div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>מנות</div>
            </div>
            <button
              onClick={() => setPortions(p => p + 1)}
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold active:scale-90 transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
            >+</button>
          </div>
        </div>

        {/* Food Cost Card */}
        {dish.costPerPortion > 0 && (
          <div
            className="rounded-3xl p-5"
            style={{ background: 'var(--bg-card)', border: `1px solid ${fcColor}30` }}
          >
            <p className="text-white font-bold mb-3 flex items-center gap-2">
              <span>💰</span> עלות מזון
            </p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>עלות למנה</div>
                <div className="text-lg font-black text-white">₪{dish.costPerPortion.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>סה״כ ×{portions}</div>
                <div className="text-lg font-black text-white">₪{totalCost.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Food Cost</div>
                <div className="text-lg font-black" style={{ color: fcColor }}>{fcp.toFixed(0)}%</div>
              </div>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (fcp / 40) * 100)}%`, background: fcColor }}
              />
            </div>
          </div>
        )}

        {/* Ingredients */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span>🥗</span>
            <span className="text-white font-bold">מרכיבים</span>
            {scale !== 1 && (
              <span className="mr-auto text-xs font-bold px-2 py-1 rounded-xl" style={{ background: stationColor + '20', color: stationColor }}>
                ×{fmt(scale)}
              </span>
            )}
          </div>
          <div className="px-5">
            {/* Direct ingredients */}
            {dish.directIngredients.map((ing, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <span className="text-white font-medium text-sm">{ing.name}</span>
                <span
                  className="text-sm font-bold px-3 py-1 rounded-xl flex-shrink-0 mr-3"
                  style={{ background: stationColor + '18', color: stationColor }}
                >
                  {fmt(ing.qty * scale)} {ing.unit}
                </span>
              </div>
            ))}

            {/* Sub-recipe links */}
            {dish.subRecipes.length > 0 && (
              <div className="py-3">
                <p className="text-xs font-bold mb-2 pt-1" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>
                  תת-מתכונים (הכנות)
                </p>
                <div className="space-y-2 pb-1">
                  {dish.subRecipes.map(sr => {
                    const recipe = allPrepRecipes.find(r => r.id === sr.recipeId);
                    return (
                      <button
                        key={sr.recipeId}
                        onClick={() => recipe && onOpenSubRecipe(recipe)}
                        className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-right active:scale-98 transition-all"
                        style={{ background: stationColor + '10', border: `1px solid ${stationColor}25` }}
                      >
                        <div>
                          <p className="text-white font-bold text-sm">{sr.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {sr.portionDesc} · ×{fmt(sr.portionsUsed * scale)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 mr-2">
                          <span className="text-xs font-semibold" style={{ color: stationColor }}>פתח</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stationColor} strokeWidth="2.5" strokeLinecap="round">
                            <path d="M15 18l-6-6 6-6"/>
                          </svg>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Method */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span>👨‍🍳</span>
            <span className="text-white font-bold">אופן הכנה</span>
          </div>
          <div className="px-5 py-4 space-y-5">
            {dish.method.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div
                  className="w-8 h-8 rounded-2xl flex-shrink-0 flex items-center justify-center text-white text-sm font-black"
                  style={{ background: stationColor, boxShadow: `0 4px 12px ${stationColor}50` }}
                >
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed pt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* FOH Guide */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setFohOpen(o => !o)}
            className="w-full px-5 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span>🎯</span>
              <span className="text-white font-bold">מדריך FOH — מכירה והגשה</span>
            </div>
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"
              style={{ transform: fohOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {fohOpen && dish.foh && (
            <div className="px-5 pb-5 pt-1 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
              {/* Selling points */}
              <div className="pt-3">
                <p className="text-xs font-bold mb-2" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>נקודות מכירה</p>
                <div className="space-y-2">
                  {dish.foh.sellingPoints.map((pt, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span style={{ color: stationColor, marginTop: '2px', flexShrink: 0 }}>•</span>
                      <span className="text-sm text-white leading-relaxed">{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pairing */}
              <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-bold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>🍷 זיווג</p>
                <p className="text-sm text-white">{dish.foh.pairing}</p>
              </div>

              {/* Serve temp + plating */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>🌡️ הגשה</p>
                  <p className="text-xs text-white leading-relaxed">{dish.foh.serveTemp}</p>
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>🍽️ פלייטינג</p>
                  <p className="text-xs text-white leading-relaxed">{dish.foh.platingNote}</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   Prep Recipe Detail (unchanged)
════════════════════════════════════════════════════ */
function RecipeDetail({ recipe, scaleFactor, batches, onUpdateBatches, onBack, stationColor, imageUrl, onSaveImage, onMarkReady }) {
  const meta = CAT_META[recipe.category] || DEFAULT_META;
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Group ingredients by section
  const sections = [];
  let curSection = undefined;
  for (const ing of recipe.ingredients) {
    const sec = ing.section || null;
    if (sec !== curSection) {
      curSection = sec;
      sections.push({ label: sec, items: [ing] });
    } else {
      sections[sections.length - 1].items.push(ing);
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const base64 = await compressImage(file, 900, 0.72);
      await onSaveImage(base64);
    } catch (err) {
      console.error('Upload failed', err);
      setUploadError(err.message || 'שגיאה בהעלאה');
    } finally {
      setUploading(false);
    }
  }

  const QUICK = [0.5, 1, 2, 3, 4];

  return (
    <div dir="rtl" className="max-w-xl mx-auto pb-10">

      {/* ── Hero image ── */}
      <div
        className="relative w-full"
        style={{
          height: '260px',
          background: imageUrl ? undefined : `linear-gradient(160deg, ${meta.g[0]}, ${meta.g[1]})`,
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span style={{ fontSize: '5rem', opacity: 0.35 }}>{meta.emoji}</span>
          </div>
        )}

        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.4) 100%)' }}
        />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 right-4 w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        {/* Upload image button */}
        <button
          onClick={() => fileRef.current.click()}
          disabled={uploading}
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold active:scale-90 transition-all"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}
        >
          {uploading ? (
            <span>מעלה...</span>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {imageUrl ? 'החלף תמונה' : 'הוסף תמונה'}
            </>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        {/* Upload error */}
        {uploadError && (
          <div
            className="absolute top-16 left-4 right-4 rounded-2xl px-4 py-2 text-xs font-bold"
            style={{ background: 'rgba(220,38,38,0.9)', color: 'white', backdropFilter: 'blur(8px)' }}
          >
            שגיאה: {uploadError}
          </div>
        )}

        {/* Recipe name overlay */}
        <div className="absolute bottom-0 inset-x-0 p-5">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-xl mb-2 inline-block"
            style={{ background: stationColor + '35', color: stationColor, border: `1px solid ${stationColor}40` }}
          >
            {recipe.category}
          </span>
          <h2 className="text-2xl font-black text-white leading-tight mt-1">{recipe.name}</h2>
        </div>
      </div>

      {/* ── Content card ── */}
      <div className="px-4 space-y-4 mt-4">

        {/* Info chips */}
        <div className="flex gap-2 flex-wrap">
          <InfoChip icon="⏱" text={recipe.prepTime} />
          <InfoChip icon="🥘" text={`${recipe.ingredients.length} מרכיבים`} />
          <InfoChip icon="⚖️" text={`${recipe.batches} ${recipe.batchUnit}`} />
          {onMarkReady && (
            <button
              onClick={() => onMarkReady(recipe)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm font-bold"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              ✓ סמן מוכן
            </button>
          )}
        </div>

        {/* Description */}
        {recipe.description && (
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {recipe.description}
          </p>
        )}

        {/* Notes */}
        {recipe.notes && (
          <div
            className="flex gap-3 rounded-2xl px-4 py-3 text-sm"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}
          >
            <span className="flex-shrink-0 mt-0.5">⚠️</span>
            <span>{recipe.notes}</span>
          </div>
        )}

        {/* ── Scaling ── */}
        <div
          className="rounded-3xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p className="text-white font-bold mb-3 flex items-center gap-2">
            <span>⚖️</span> שינוי כמויות
          </p>

          {/* Quick multipliers */}
          <div className="flex gap-2 mb-4">
            {QUICK.map(m => {
              const target = recipe.batches * m;
              const active = Math.abs(batches - target) < 0.01;
              return (
                <button
                  key={m}
                  onClick={() => onUpdateBatches(target)}
                  className="glow-btn flex-1 py-2.5 rounded-2xl text-sm font-bold"
                  style={{
                    background: active ? stationColor : 'rgba(255,255,255,0.06)',
                    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                    boxShadow: active ? `0 4px 14px ${stationColor}50` : 'none',
                  }}
                >
                  ×{m}
                </button>
              );
            })}
          </div>

          {/* +/- input */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onUpdateBatches(Math.max(0.25, batches - recipe.batches * 0.5))}
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold active:scale-90 transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
            >−</button>
            <div className="flex-1 text-center">
              <input
                type="number"
                value={batches}
                step={recipe.batches}
                min={0.25}
                onChange={e => onUpdateBatches(e.target.value)}
                className="w-20 rounded-2xl text-white text-center py-2.5 text-lg font-black focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${stationColor}40`, caretColor: stationColor }}
              />
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{recipe.batchUnit}</div>
            </div>
            <button
              onClick={() => onUpdateBatches(batches + recipe.batches * 0.5)}
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold active:scale-90 transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
            >+</button>

            {scaleFactor !== 1 && (
              <button
                onClick={() => onUpdateBatches(recipe.batches)}
                className="text-xs rounded-2xl px-3 py-2 font-semibold"
                style={{ color: stationColor, background: stationColor + '18' }}
              >
                ×{fmt(scaleFactor)} — איפוס
              </button>
            )}
          </div>
        </div>

        {/* ── Ingredients ── */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span>🥗</span>
            <span className="text-white font-bold">מרכיבים</span>
            {scaleFactor !== 1 && (
              <span
                className="mr-auto text-xs font-bold px-2 py-1 rounded-xl"
                style={{ background: stationColor + '20', color: stationColor }}
              >
                ×{fmt(scaleFactor)}
              </span>
            )}
          </div>

          <div className="px-5">
            {sections.map((sec, si) => (
              <div key={si}>
                {sec.label && (
                  <div
                    className="text-xs font-bold uppercase tracking-wider py-3 mt-1"
                    style={{ color: stationColor }}
                  >
                    {sec.label}
                  </div>
                )}
                {sec.items.map((ing, i) => {
                  const isTaste = ing.unit === 'לפי טעם';
                  const scaled  = isTaste ? null : ing.amount * scaleFactor;
                  const isLast  = si === sections.length - 1 && i === sec.items.length - 1;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3.5"
                      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <span className="text-white font-medium text-sm">{ing.name}</span>
                      <span
                        className="text-sm font-bold px-3 py-1 rounded-xl flex-shrink-0 mr-3"
                        style={{ background: stationColor + '18', color: stationColor }}
                      >
                        {isTaste ? 'לפי טעם' : `${fmt(scaled)} ${ing.unit}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ── Steps ── */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span>👨‍🍳</span>
            <span className="text-white font-bold">אופן הכנה</span>
          </div>
          <div className="px-5 py-4 space-y-5">
            {recipe.steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div
                  className="w-8 h-8 rounded-2xl flex-shrink-0 flex items-center justify-center text-white text-sm font-black"
                  style={{ background: stationColor, boxShadow: `0 4px 12px ${stationColor}50` }}
                >
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed pt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── Compress image to base64 using Canvas ─── */
function compressImage(file, maxWidth = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('לא ניתן לקרוא את הקובץ'));
    img.src = url;
  });
}

function InfoChip({ icon, text }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm font-medium"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'rgba(255,255,255,0.6)' }}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
