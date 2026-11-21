import { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Clock, Search, X, Plus } from 'lucide-react';
import { RECIPES, CATEGORIES } from '../data/recipes';
import { MAIN_DISHES, DISH_CATEGORIES } from '../data/mainDishes';
import { STATIONS } from '../data/stations';
import { useFirestoreArray } from '../hooks/useFirestoreArray';
import { useRecipeImages, useFullImage } from '../hooks/useRecipeImages';
import RecipeWizard from './RecipeWizard';
import DishDetail from './DishDetail';
import RecipeDetail from './RecipeDetail';
import { rememberRecent } from './GlobalSearch';
import { CAT_META, DISH_CAT_META, DEFAULT_META, foodCostColor } from './recipeShared';

// ─── FLOW-04: remember the open recipe + amount while the cook visits other screens ───
const VIEW_KEY = 'recipes_view_v1';

function loadView() {
  try { return JSON.parse(sessionStorage.getItem(VIEW_KEY)) || null; } catch (_) { return null; }
}
function saveView(v) {
  try {
    if (v) sessionStorage.setItem(VIEW_KEY, JSON.stringify(v));
    else sessionStorage.removeItem(VIEW_KEY);
  } catch (_) { /* ignore */ }
}

/* ════════════════════════════════════════════════════
   Recipe book: list screen. Detail screens live in
   DishDetail.jsx and RecipeDetail.jsx.
════════════════════════════════════════════════════ */
export default function RecipeDatabase({ station, onMarkReady, openTarget, onOpenedTarget }) {
  const saved = useRef(loadView()).current;

  const [activeTab, setActiveTab]           = useState(saved?.tab || 'dish');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedDish, setSelectedDish]     = useState(null);
  const [drillRecipe, setDrillRecipe]       = useState(null);
  const [category, setCategory]             = useState('הכל');
  const [search, setSearch]                 = useState('');
  const [batches, setBatches]               = useState(saved?.batches || 1);
  const [drillBatches, setDrillBatches]     = useState(saved?.drillBatches || 1);
  const [portions, setPortions]             = useState(saved?.portions || 1);
  const [showAddModal, setShowAddModal]     = useState(false);
  const scrollMemo                          = useRef([]);
  const restored                            = useRef(false);
  const imgs                                = useRecipeImages();
  const { images, saveImage }               = imgs;

  const [customRecipes, setCustomRecipes] = useFirestoreArray('custom_recipes');
  const [customDishes,  setCustomDishes]  = useFirestoreArray('custom_dishes');

  const allRecipes = [...RECIPES, ...customRecipes];
  const allDishes  = [...MAIN_DISHES, ...customDishes];

  const st = STATIONS[station];

  // Restore the previously open recipe (custom recipes may arrive a moment later)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (restored.current) return;
    if (!saved || (saved.dishId == null && saved.recipeId == null && saved.drillId == null)) { restored.current = true; return; }
    const dish   = saved.dishId   != null ? allDishes.find(d => d.id === saved.dishId)     : null;
    const recipe = saved.recipeId != null ? allRecipes.find(r => r.id === saved.recipeId)  : null;
    const drill  = saved.drillId  != null ? allRecipes.find(r => r.id === saved.drillId)   : null;
    const needed = [saved.dishId, saved.recipeId, saved.drillId].filter(x => x != null).length;
    const found  = [dish, recipe, drill].filter(Boolean).length;
    if (found < needed && customRecipes.length === 0 && customDishes.length === 0) return; // wait for custom lists
    restored.current = true;
    if (dish)   setSelectedDish(dish);
    if (recipe) setSelectedRecipe(recipe);
    if (drill)  setDrillRecipe(drill);
    if (typeof saved.scrollY === 'number') setTimeout(() => window.scrollTo(0, saved.scrollY), 300);
  });

  // Save the view whenever it changes
  useEffect(() => {
    if (!restored.current) return;
    if (!selectedDish && !selectedRecipe && !drillRecipe) { saveView(null); return; }
    saveView({
      tab: activeTab,
      dishId: selectedDish?.id ?? null, recipeId: selectedRecipe?.id ?? null, drillId: drillRecipe?.id ?? null,
      portions, batches, drillBatches, scrollY: window.scrollY,
    });
  }, [activeTab, selectedDish, selectedRecipe, drillRecipe, portions, batches, drillBatches]);

  // Keep the latest scroll position when leaving the screen
  useEffect(() => () => {
    const v = loadView();
    if (v) saveView({ ...v, scrollY: window.scrollY });
  }, []);

  function switchTab(tab) {
    setActiveTab(tab);
    setCategory('הכל');
    setSearch('');
  }

  async function handleSaveRecipe(type, data, photoDataUrl) {
    restored.current = true;
    if (type === 'prep') {
      setCustomRecipes(prev => [data, ...prev]);
      setShowAddModal(false);
      setSelectedRecipe(data);
      setBatches(data.batches || 1);
    } else {
      setCustomDishes(prev => [data, ...prev]);
      setShowAddModal(false);
      setSelectedDish(data);
      setPortions(data.defaultPortions || 1);
    }
    if (photoDataUrl) {
      await saveImage(data.id, photoDataUrl);
    }
  }

  const q = search.trim();
  const filteredPrep = allRecipes.filter(r => {
    const matchCat    = category === 'הכל' || r.category === category;
    const matchSearch = r.name.includes(q) || (r.description || '').includes(q);
    return matchCat && matchSearch;
  });
  const filteredDishes = allDishes.filter(d => {
    const matchCat    = category === 'הכל' || d.category === category;
    const matchSearch = d.name.includes(q) || (d.description || '').includes(q);
    return matchCat && matchSearch;
  });

  // Every screen change starts at the top; going back returns to where you were (BUG-09).
  function scrollEl() { return document.querySelector('main'); }
  function rememberScroll() {
    const el = scrollEl();
    scrollMemo.current.push({ w: window.scrollY, m: el ? el.scrollTop : 0 });
  }
  function goTop() {
    window.scrollTo(0, 0);
    const el = scrollEl();
    if (el) el.scrollTop = 0;
  }
  function restoreScroll() {
    const pos = scrollMemo.current.pop();
    if (!pos) return;
    requestAnimationFrame(() => {
      window.scrollTo(0, pos.w);
      const el = scrollEl();
      if (el) el.scrollTop = pos.m;
    });
  }
  function openDrill(recipe) {
    rememberScroll();
    setDrillRecipe(recipe);
    setDrillBatches(recipe.batches);
  }
  function closeDrill()  { setDrillRecipe(null);    restoreScroll(); }
  function closeDish()   { setSelectedDish(null);   restoreScroll(); }
  function closeRecipe() { setSelectedRecipe(null); restoreScroll(); }

  useEffect(() => {
    if (restored.current && (drillRecipe || selectedDish || selectedRecipe)) goTop();
  }, [drillRecipe, selectedDish, selectedRecipe]); // eslint-disable-line react-hooks/exhaustive-deps

  function openRecipe(recipe) {
    restored.current = true;
    rememberScroll();
    setSelectedRecipe(recipe);
    setBatches(recipe.batches);
    rememberRecent('prep', recipe.id);
  }
  function openDish(dish) {
    restored.current = true;
    rememberScroll();
    setSelectedDish(dish);
    setPortions(dish.defaultPortions);
    rememberRecent('dish', dish.id);
  }

  // Opened from the global search: go straight to that recipe / dish
  useEffect(() => {
    if (!openTarget) return;
    setDrillRecipe(null);
    if (openTarget.kind === 'dish') {
      setSelectedRecipe(null);
      setActiveTab('dish');
      openDish(openTarget.item);
    } else {
      setSelectedDish(null);
      setActiveTab('prep');
      openRecipe(openTarget.item);
    }
    onOpenedTarget?.();
  }, [openTarget]); // eslint-disable-line react-hooks/exhaustive-deps

  // The list uses small thumbnails; the open recipe loads its full photo (thumbnail shows meanwhile)
  const openId   = (drillRecipe || selectedDish || selectedRecipe)?.id ?? null;
  const fullOpen = useFullImage(openId, imgs);
  const photoOf  = id => fullOpen || images[String(id).replace(/\./g, '_')] || null;

  const scaleFactor = selectedRecipe ? batches / selectedRecipe.batches : 1;

  // ── Sub-recipe drill-down (from a dish or from another prep recipe) ──
  if (drillRecipe) {
    return (
      <RecipeDetail
        recipe={drillRecipe}
        scaleFactor={drillBatches / drillRecipe.batches}
        batches={drillBatches}
        onUpdateBatches={val => setDrillBatches(Math.max(0.25, parseFloat(val) || drillRecipe.batches))}
        onBack={closeDrill}
        stationColor={st.color}
        imageUrl={photoOf(drillRecipe.id)}
        onSaveImage={url => saveImage(drillRecipe.id, url)}
        allPrepRecipes={allRecipes}
      />
    );
  }

  if (selectedDish) {
    return (
      <DishDetail
        dish={selectedDish}
        portions={portions}
        onPortions={setPortions}
        onOpenSubRecipe={openDrill}
        onBack={closeDish}
        stationColor={st.color}
        imageUrl={photoOf(selectedDish.id)}
        onSaveImage={url => saveImage(selectedDish.id, url)}
        allPrepRecipes={allRecipes}
      />
    );
  }

  if (selectedRecipe) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        scaleFactor={scaleFactor}
        batches={batches}
        onUpdateBatches={val => setBatches(Math.max(0.25, parseFloat(val) || selectedRecipe.batches))}
        onBack={closeRecipe}
        stationColor={st.color}
        imageUrl={photoOf(selectedRecipe.id)}
        onSaveImage={url => saveImage(selectedRecipe.id, url)}
        onMarkReady={onMarkReady}
        allPrepRecipes={allRecipes}
        onOpenSubRecipe={openDrill}
      />
    );
  }

  const cats   = activeTab === 'dish' ? DISH_CATEGORIES : CATEGORIES;
  const isDish = activeTab === 'dish';

  return (
    <div className="px-4 py-4 max-w-xl mx-auto" dir="rtl">
      <AnimatePresence>
        {showAddModal && (
          <RecipeWizard
            station={station}
            onSave={handleSaveRecipe}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Tabs ── */}
      <div className="flex rounded-xl p-1 mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} role="tablist">
        {[{ id: 'dish', label: 'מנות' }, { id: 'prep', label: 'הכנות' }].map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => switchTab(tab.id)}
            className="flex-1 min-h-[48px] rounded-lg text-lg font-semibold"
            style={{
              background: activeTab === tab.id ? st.color : 'transparent',
              color:      activeTab === tab.id ? '#fff'   : 'var(--text-2)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="flex items-center gap-3 rounded-xl px-4 mb-3 h-14" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <Search size={20} style={{ color: 'var(--text-2)' }} aria-hidden="true" />
        <input
          type="text"
          placeholder={isDish ? 'חפש מנה...' : 'חפש מתכון...'}
          aria-label={isDish ? 'חפש מנה' : 'חפש מתכון'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-0 h-full bg-transparent focus:outline-none text-lg"
          style={{ color: 'var(--text)', caretColor: st.color }}
          dir="rtl"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} aria-label="נקה חיפוש" className="w-12 h-12 -ml-3 flex items-center justify-center" style={{ color: 'var(--text-2)' }}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* ── Category chips ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
        {cats.map(c => {
          const active = category === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={active}
              className="flex-shrink-0 min-h-[48px] px-5 rounded-xl text-base font-semibold"
              style={{
                background: active ? st.color : 'var(--bg-card)',
                border:     `1px solid ${active ? st.color : 'var(--border)'}`,
                color:      active ? '#fff' : 'var(--text)',
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      <p className="text-base mb-3 px-1" style={{ color: 'var(--text-2)' }}>
        {isDish ? filteredDishes.length : filteredPrep.length} {isDish ? 'מנות' : 'מתכונים'}
      </p>

      {/* ── Grid ── */}
      <div className="grid grid-cols-2 gap-3">
        {isDish
          ? filteredDishes.map(dish => {
              const meta = DISH_CAT_META[dish.category] || DEFAULT_META;
              const fcp  = dish.sellingPrice > 0 ? (dish.costPerPortion / dish.sellingPrice * 100) : 0;
              return (
                <RecipeCard
                  key={dish.id}
                  name={dish.name}
                  category={dish.category}
                  imgUrl={images[String(dish.id).replace(/\./g, '_')]}
                  Icon={meta.Icon}
                  badge={fcp > 0 ? { text: `${fcp.toFixed(0)}% FC`, color: foodCostColor(fcp) } : null}
                  line={[dish.prepTimeMin > 0 && `${dish.prepTimeMin} דק׳`, dish.sellingPrice > 0 && `₪${dish.sellingPrice}`]}
                  onClick={() => openDish(dish)}
                />
              );
            })
          : filteredPrep.map(recipe => {
              const meta = CAT_META[recipe.category] || DEFAULT_META;
              return (
                <RecipeCard
                  key={recipe.id}
                  name={recipe.name}
                  category={recipe.category}
                  imgUrl={images[String(recipe.id).replace(/\./g, '_')]}
                  Icon={meta.Icon}
                  line={[recipe.prepTime, `${recipe.ingredients.length} מרכיבים`]}
                  onClick={() => openRecipe(recipe)}
                />
              );
            })}
      </div>

      {(isDish ? filteredDishes : filteredPrep).length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--text-2)' }}>
          <Search size={40} strokeWidth={1.25} className="mx-auto mb-4" style={{ opacity: 0.5 }} />
          <div className="text-lg">{isDish ? 'לא נמצאו מנות' : 'לא נמצאו מתכונים'}</div>
        </div>
      )}

      {/* ── Add recipe: a normal button at the end of the list (no floating button) ── */}
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className="mt-6 w-full h-14 rounded-xl flex items-center justify-center gap-2 text-lg font-semibold"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-md)', color: 'var(--text)' }}
      >
        <Plus size={22} /> הוסף מתכון
      </button>
    </div>
  );
}

function RecipeCard({ name, category, imgUrl, Icon, badge, line, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl overflow-hidden text-right flex flex-col"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="relative w-full" style={{ paddingTop: '62%', background: imgUrl ? undefined : 'rgba(255,255,255,0.04)' }}>
        {imgUrl ? (
          <img src={imgUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon size={36} strokeWidth={1.25} style={{ opacity: 0.5 }} />
          </div>
        )}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-base font-semibold" style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>
          {category}
        </div>
        {badge && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg text-base font-semibold" style={{ background: 'rgba(0,0,0,0.75)', color: badge.color }}>
            {badge.text}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-lg font-semibold leading-snug mb-1" style={{ color: 'var(--text)' }}>{name}</h3>
        <p className="text-base flex items-center gap-1 flex-wrap" style={{ color: 'var(--text-2)' }}>
          <Clock size={14} aria-hidden="true" />
          {line.filter(Boolean).join(' · ')}
        </p>
      </div>
    </button>
  );
}
