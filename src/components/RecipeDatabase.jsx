import { useState } from 'react';
import { RECIPES, CATEGORIES } from '../data/recipes';
import { STATIONS } from '../data/stations';

// Format a scaled number cleanly: integers stay integers, decimals trim trailing zeros
function fmt(n) {
  if (n === 0) return '0';
  // For taste-only ingredients stored as 1
  if (n === 1 && !Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 1000) / 1000;
  // Remove trailing zeros from decimal representation
  return parseFloat(rounded.toFixed(3)).toString();
}

export default function RecipeDatabase({ station }) {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [category, setCategory] = useState('הכל');
  const [search, setSearch] = useState('');
  const [batches, setBatches] = useState(1);

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

  return (
    <div className="p-6" dir="rtl">
      {selectedRecipe ? (
        <RecipeDetail
          recipe={selectedRecipe}
          scaleFactor={scaleFactor}
          batches={batches}
          onUpdateBatches={val => setBatches(Math.max(0.25, parseFloat(val) || 1))}
          onBack={() => setSelectedRecipe(null)}
          stationColor={st.color}
        />
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-1">
              <span>📖</span> מאגר מתכונים
            </h2>
            <p className="text-slate-400">{RECIPES.length} מתכונים במאגר</p>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="חפש מתכון..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pr-11 pl-4
                         text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap mb-6">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150
                  ${category === c ? 'text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}
                style={category === c ? { backgroundColor: st.color } : {}}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Recipe Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(recipe => {
              const recipeStation = STATIONS[recipe.station];
              return (
                <button
                  key={recipe.id}
                  onClick={() => openRecipe(recipe)}
                  className="bg-slate-800 border border-slate-700 rounded-2xl p-5 text-right
                             hover:border-slate-600 hover:bg-slate-750 transition-all duration-150 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-lg"
                      style={{ backgroundColor: recipeStation.color + '25', color: recipeStation.color }}
                    >
                      {recipeStation.name}
                    </span>
                    <span className="text-slate-500 text-xs bg-slate-700 px-2 py-1 rounded-lg">
                      {recipe.category}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1 group-hover:text-slate-100">{recipe.name}</h3>
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">{recipe.description}</p>
                  <div className="flex gap-3 text-xs text-slate-500">
                    <span>⚖️ {recipe.batches} {recipe.batchUnit}</span>
                    <span>⏱️ {recipe.prepTime}</span>
                    <span>🥘 {recipe.ingredients.length} מרכיבים</span>
                  </div>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <div className="text-4xl mb-3">🔍</div>
              <div>לא נמצאו מתכונים</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RecipeDetail({ recipe, scaleFactor, batches, onUpdateBatches, onBack, stationColor }) {
  // Group ingredients by section.
  // Sentinel starts as `undefined` so the first ingredient (section = null or string)
  // always triggers a new group — avoids sections[-1] being undefined.
  const sections = [];
  let currentSection = undefined;
  for (const ing of recipe.ingredients) {
    const sec = ing.section || null;
    if (sec !== currentSection) {
      currentSection = sec;
      sections.push({ label: sec, items: [ing] });
    } else {
      sections[sections.length - 1].items.push(ing);
    }
  }

  const QUICK_MULTIPLIERS = [0.5, 1, 2, 3, 4];

  return (
    <div className="max-w-2xl mx-auto pb-10">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
      >
        <span>←</span> חזרה למתכונים
      </button>

      {/* Header */}
      <div
        className="rounded-2xl p-6 mb-6 border"
        style={{ borderColor: stationColor + '40', background: `${stationColor}10` }}
      >
        <h2 className="text-3xl font-black text-white mb-1">{recipe.name}</h2>
        <p className="text-slate-400 mb-3">{recipe.description}</p>
        <div className="flex gap-4 text-sm text-slate-400 flex-wrap">
          <span>⏱️ {recipe.prepTime}</span>
          <span>📂 {recipe.category}</span>
          <span>⚖️ בסיס: {recipe.batches} {recipe.batchUnit}</span>
        </div>
        {recipe.notes && (
          <div className="mt-3 text-sm text-amber-300 bg-amber-900/30 border border-amber-800 rounded-xl px-4 py-2.5">
            {recipe.notes}
          </div>
        )}
      </div>

      {/* ── Scaling Control ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 mb-6">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <span>⚖️</span> שינוי כמויות
        </h3>

        {/* Quick multipliers */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {QUICK_MULTIPLIERS.map(m => (
            <button
              key={m}
              onClick={() => onUpdateBatches(recipe.batches * m)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 border
                ${batches === recipe.batches * m
                  ? 'text-white border-transparent'
                  : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                }`}
              style={batches === recipe.batches * m ? { backgroundColor: stationColor, borderColor: stationColor } : {}}
            >
              ×{m}
            </button>
          ))}
        </div>

        {/* Manual input */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onUpdateBatches(Math.max(0.25, batches - recipe.batches * 0.5))}
            className="w-10 h-10 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-600 transition-colors text-xl flex items-center justify-center flex-shrink-0"
          >−</button>
          <div className="text-center">
            <input
              type="number"
              value={batches}
              step={recipe.batches}
              min={0.25}
              onChange={e => onUpdateBatches(e.target.value)}
              className="w-20 bg-slate-700 border border-slate-600 rounded-xl text-white text-center py-2 text-lg font-bold
                         focus:outline-none focus:border-slate-500"
            />
            <div className="text-slate-500 text-xs mt-1">{recipe.batchUnit}</div>
          </div>
          <button
            onClick={() => onUpdateBatches(batches + recipe.batches * 0.5)}
            className="w-10 h-10 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-600 transition-colors text-xl flex items-center justify-center flex-shrink-0"
          >+</button>

          {scaleFactor !== 1 && (
            <div
              className="px-3 py-1.5 rounded-xl text-sm font-semibold flex-shrink-0"
              style={{ backgroundColor: stationColor + '25', color: stationColor }}
            >
              ×{fmt(scaleFactor)} מהבסיס
            </div>
          )}
          <button
            onClick={() => onUpdateBatches(recipe.batches)}
            className="text-slate-500 hover:text-slate-300 text-sm underline transition-colors flex-shrink-0"
          >
            איפוס
          </button>
        </div>
      </div>

      {/* ── Ingredients ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 mb-6">
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <span>🥗</span> מרכיבים
          <span className="text-slate-400 text-sm font-normal">
            ({fmt(batches)} {recipe.batchUnit})
          </span>
          {scaleFactor !== 1 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-lg mr-auto"
              style={{ backgroundColor: stationColor + '25', color: stationColor }}
            >
              ×{fmt(scaleFactor)}
            </span>
          )}
        </h3>

        {sections.map((sec, si) => (
          <div key={si} className={si > 0 ? 'mt-4' : ''}>
            {sec.label && (
              <div
                className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg mb-2 inline-block"
                style={{ backgroundColor: stationColor + '20', color: stationColor }}
              >
                {sec.label}
              </div>
            )}
            <div className="space-y-0">
              {sec.items.map((ing, i) => {
                const isTaste = ing.unit === 'לפי טעם';
                const scaled = isTaste ? null : ing.amount * scaleFactor;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2.5 border-b border-slate-700 last:border-0"
                  >
                    <span className="text-slate-300 font-medium">{ing.name}</span>
                    <span
                      className="font-bold text-sm px-3 py-1 rounded-lg flex-shrink-0 mr-4"
                      style={{ backgroundColor: stationColor + '20', color: stationColor }}
                    >
                      {isTaste ? 'לפי טעם' : `${fmt(scaled)} ${ing.unit}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Steps ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <span>👨‍🍳</span> אופן הכנה
        </h3>
        <div className="space-y-4">
          {recipe.steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: stationColor }}
              >
                {i + 1}
              </div>
              <p className="text-slate-300 pt-1 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
