import { useState, useRef, useEffect, useCallback } from 'react';
import { RECIPES, CATEGORIES } from '../data/recipes';
import { STATIONS } from '../data/stations';
import { db, storage } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ─── Category metadata (gradient + emoji placeholder) ───
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

const DEFAULT_META = { emoji: '🍽️', g: ['#1a1a28', '#0c0c18'] };

function fmt(n) {
  if (n === 0) return '0';
  return parseFloat((Math.round(n * 1000) / 1000).toFixed(3)).toString();
}

// ─── Hook: load recipe images from Firestore ───
function useRecipeImages() {
  const [images, setImages] = useState({});
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'kitchen', 'recipe_images'), snap => {
      if (snap.exists()) setImages(snap.data());
    });
    return unsub;
  }, []);

  const saveImage = useCallback(async (recipeId, imageUrl) => {
    await setDoc(doc(db, 'kitchen', 'recipe_images'), { [recipeId]: imageUrl }, { merge: true });
  }, []);

  return { images, saveImage };
}

export default function RecipeDatabase({ station }) {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [category, setCategory] = useState('הכל');
  const [search, setSearch] = useState('');
  const [batches, setBatches] = useState(1);
  const { images, saveImage } = useRecipeImages();

  const filtered = RECIPES.filter(r => {
    const matchCat = category === 'הכל' || r.category === category;
    const matchSearch = r.name.includes(search) || r.description.includes(search);
    return matchCat && matchSearch;
  });

  function openRecipe(recipe) {
    setSelectedRecipe(recipe);
    setBatches(recipe.batches);
  }

  const st = STATIONS[station];
  const scaleFactor = selectedRecipe ? batches / selectedRecipe.batches : 1;

  if (selectedRecipe) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        scaleFactor={scaleFactor}
        batches={batches}
        onUpdateBatches={val => setBatches(Math.max(0.25, parseFloat(val) || 1))}
        onBack={() => setSelectedRecipe(null)}
        stationColor={st.color}
        imageUrl={images[selectedRecipe.id] || null}
        onSaveImage={url => saveImage(selectedRecipe.id, url)}
      />
    );
  }

  return (
    <div className="px-4 py-5 max-w-xl mx-auto" dir="rtl">

      {/* Search */}
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="חפש מתכון..."
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

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map(c => {
          const active = category === c;
          const meta = CAT_META[c] || DEFAULT_META;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{
                background: active ? st.color : 'var(--bg-card)',
                border: active ? `1px solid ${st.color}` : '1px solid var(--border)',
                color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                boxShadow: active ? `0 4px 16px ${st.color}40` : 'none',
              }}
            >
              {c !== 'הכל' && <span>{meta.emoji}</span>}
              {c}
            </button>
          );
        })}
      </div>

      {/* Count */}
      <p className="text-xs font-semibold mb-4 px-1" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
        {filtered.length} מתכונים
      </p>

      {/* Recipe grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map(recipe => {
          const meta = CAT_META[recipe.category] || DEFAULT_META;
          const imgUrl = images[recipe.id];
          return (
            <button
              key={recipe.id}
              onClick={() => openRecipe(recipe)}
              className="rounded-3xl overflow-hidden text-right active:scale-95 transition-all"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              {/* Image area */}
              <div
                className="relative w-full"
                style={{
                  paddingTop: '72%',
                  background: imgUrl
                    ? undefined
                    : `linear-gradient(135deg, ${meta.g[0]}, ${meta.g[1]})`,
                }}
              >
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={recipe.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span style={{ fontSize: '2.5rem', opacity: 0.6 }}>{meta.emoji}</span>
                  </div>
                )}
                {/* Category badge */}
                <div
                  className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-xl text-xs font-bold"
                  style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(6px)' }}
                >
                  {recipe.category}
                </div>
              </div>

              {/* Info */}
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

      {filtered.length === 0 && (
        <div className="text-center py-20" style={{ color: 'rgba(255,255,255,0.25)' }}>
          <div className="text-5xl mb-4">🔍</div>
          <div className="font-medium">לא נמצאו מתכונים</div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   Recipe Detail
════════════════════════════════════════════════════ */
function RecipeDetail({ recipe, scaleFactor, batches, onUpdateBatches, onBack, stationColor, imageUrl, onSaveImage }) {
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
      const storageRef = ref(storage, `recipes/${recipe.id}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await onSaveImage(url);
    } catch (err) {
      console.error('Upload failed', err);
      setUploadError(err.code || err.message);
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

        {/* Gradient overlay for text readability */}
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
                  className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95"
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
