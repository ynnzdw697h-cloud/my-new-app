import { useState, useEffect } from 'react';
import { useWakeLock } from '../hooks/useWakeLock';
import MethodBlock from './MethodBlock';
import { AlertTriangle, Salad, Scale, ChevronLeft, Check, Info } from 'lucide-react';
import {
  CAT_META, DEFAULT_META, fmt, compressImage,
  DetailTopBar, FoldSection, Block, ScaleBadge, StepperButton, QuickPicks, ImageUploadButton, HeroImage, MetaLine,
} from './recipeShared';

const QUICK = [0.5, 1, 2, 3, 4];

/* ════════════════════════════════════════════════════
   Prep recipe detail
   Order: name bar → note → amount → ingredients → method → mark ready → folded extras
════════════════════════════════════════════════════ */
export default function RecipeDetail({
  recipe, scaleFactor, batches, onUpdateBatches, onBack, stationColor, imageUrl, onSaveImage,
  onMarkReady, allPrepRecipes = [], onOpenSubRecipe, stepsInfo,
}) {
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const wakeLock = useWakeLock(true);
  const meta = CAT_META[recipe.category] || DEFAULT_META; // eslint-disable-line no-unused-vars

  // Group ingredients by section
  const sections = [];
  let curSection;
  for (const ing of recipe.ingredients) {
    const sec = ing.section || null;
    if (sec !== curSection) {
      curSection = sec;
      sections.push({ label: sec, items: [ing] });
    } else {
      sections[sections.length - 1].items.push(ing);
    }
  }

  // The field keeps what the cook types; the amount is normalised only when leaving the field (BUG-10).
  const [qtyText, setQtyText]       = useState(fmt(batches));
  const [qtyFocused, setQtyFocused] = useState(false);
  useEffect(() => { if (!qtyFocused) setQtyText(fmt(batches)); }, [batches, qtyFocused]);
  function onQtyChange(e) {
    const raw = e.target.value;
    setQtyText(raw);
    const n = parseFloat(raw.replace(',', '.'));
    if (n > 0) onUpdateBatches(n);
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

  return (
    <div dir="rtl" className="max-w-xl mx-auto pb-10">
      <DetailTopBar title={recipe.name} onBack={onBack} wakeLock={wakeLock} stationColor={stationColor} />
      <HeroImage url={imageUrl} alt={recipe.name} />
      <MetaLine parts={[recipe.category, recipe.prepTime, `${recipe.ingredients.length} מרכיבים`, `${recipe.batches} ${recipe.batchUnit}`]} />

      <div className="px-4 space-y-4 mt-3">

        {recipe.notes && (
          <div className="flex gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}>
            <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
            <span className="text-lg" style={{ color: '#fbbf24' }}>{recipe.notes}</span>
          </div>
        )}

        {/* Amount */}
        <Block title="שינוי כמויות" icon={Scale} aside={scaleFactor !== 1 ? <ScaleBadge factor={scaleFactor} color={stationColor} /> : null}>
          <div className="p-3 space-y-3">
            <QuickPicks
              options={QUICK}
              isActive={m => Math.abs(batches - recipe.batches * m) < 0.01}
              onPick={m => onUpdateBatches(recipe.batches * m)}
              color={stationColor}
              label={m => `×${m}`}
            />
            <div className="flex items-center gap-3">
              <StepperButton onClick={() => onUpdateBatches(Math.max(0.25, batches - recipe.batches * 0.5))} label="פחות">−</StepperButton>
              <div className="flex-1 flex items-center justify-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="כמות"
                  value={qtyText}
                  onFocus={e => { setQtyFocused(true); e.target.select(); }}
                  onChange={onQtyChange}
                  onBlur={() => { setQtyFocused(false); setQtyText(fmt(batches)); }}
                  className="w-24 h-12 rounded-xl text-center text-xl font-bold focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text)', border: `1px solid ${stationColor}66`, caretColor: stationColor }}
                />
                <span className="text-base" style={{ color: 'var(--text-2)' }}>{recipe.batchUnit}</span>
              </div>
              <StepperButton onClick={() => onUpdateBatches(batches + recipe.batches * 0.5)} label="עוד">+</StepperButton>
            </div>
            {scaleFactor !== 1 && (
              <button
                type="button"
                onClick={() => onUpdateBatches(recipe.batches)}
                className="w-full min-h-[48px] rounded-xl text-lg font-semibold"
                style={{ color: stationColor, background: stationColor + '1f' }}
              >
                איפוס לכמות המקורית
              </button>
            )}
          </div>
        </Block>

        {/* Ingredients */}
        <Block title="מרכיבים" icon={Salad}>
          <div className="px-4">
            {sections.map((sec, si) => (
              <div key={si}>
                {sec.label && <div className="text-lg font-semibold py-3" style={{ color: stationColor }}>{sec.label}</div>}
                {sec.items.map((ing, i) => {
                  const isTaste = ing.unit === 'לפי טעם';
                  const scaled  = isTaste ? null : ing.amount * scaleFactor;
                  const isLast  = si === sections.length - 1 && i === sec.items.length - 1;
                  const subRecipe = onOpenSubRecipe && allPrepRecipes.find(
                    r => r.id !== recipe.id && r.name.trim() === ing.name.trim()
                  );
                  const Row = subRecipe ? 'button' : 'div';
                  return (
                    <Row
                      key={i}
                      type={subRecipe ? 'button' : undefined}
                      onClick={subRecipe ? () => onOpenSubRecipe(subRecipe) : undefined}
                      className="w-full flex items-center justify-between min-h-[56px] py-2 text-right"
                      style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}
                    >
                      <span className="text-lg" style={{ color: 'var(--text)' }}>
                        {ing.name}
                        {subRecipe && (
                          <span className="mr-2 inline-flex items-center gap-0.5 text-base font-semibold underline underline-offset-2" style={{ color: stationColor }}>מתכון<ChevronLeft size={18} /></span>
                        )}
                      </span>
                      <span className="text-lg font-semibold flex-shrink-0 mr-3 tabular-nums" style={{ color: 'var(--text)' }}>
                        {isTaste ? 'לפי טעם' : <>{fmt(scaled)} <span className="text-base font-normal" style={{ color: 'var(--text-2)' }}>{ing.unit}</span></>}
                      </span>
                    </Row>
                  );
                })}
              </div>
            ))}
          </div>
        </Block>

        {/* Steps */}
        <MethodBlock title={recipe.name} steps={stepsInfo.steps} hasEdited={stepsInfo.hasEdited} color={stationColor} onSave={stepsInfo.save} onReset={stepsInfo.reset} />

        {onMarkReady && (
          <button
            type="button"
            onClick={() => onMarkReady(recipe)}
            className="w-full min-h-[56px] rounded-xl flex items-center justify-center gap-2 text-lg font-semibold"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.35)' }}
          >
            <Check size={22} /> סמן מוכן
          </button>
        )}

        {recipe.description && (
          <FoldSection title="תיאור" icon={Info}>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--text)' }}>{recipe.description}</p>
          </FoldSection>
        )}

        <ImageUploadButton hasImage={!!imageUrl} uploading={uploading} error={uploadError} onFile={handleImageUpload} />
      </div>
    </div>
  );
}
