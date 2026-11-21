import { useState } from 'react';
import { useWakeLock } from '../hooks/useWakeLock';
import MethodBlock from './MethodBlock';
import {
  AlertTriangle, Coins, Target, Wine, Thermometer, UtensilsCrossed, Salad, Scale, ChevronLeft, Info,
} from 'lucide-react';
import {
  fmt, foodCostColor, compressImage,
  DetailTopBar, FoldSection, Block, ScaleBadge, StepperButton, ImageUploadButton, HeroImage, MetaLine,
} from './recipeShared';

const QUICK_PORTIONS = [1, 2, 4, 6, 10];

/* ════════════════════════════════════════════════════
   Dish detail (main / assembly recipe)
   Order: name bar → allergens → portions → ingredients → method → folded extras
════════════════════════════════════════════════════ */
export default function DishDetail({
  dish, portions, onPortions, onOpenSubRecipe, onBack, stationColor, imageUrl, onSaveImage, allPrepRecipes,
  stepsInfo,
}) {
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const wakeLock = useWakeLock(true);

  const scale     = portions / dish.defaultPortions;
  const totalCost = dish.costPerPortion * portions;
  const fcp       = dish.sellingPrice > 0 ? (dish.costPerPortion / dish.sellingPrice * 100) : 0;
  const fcColor   = foodCostColor(fcp);

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
      <DetailTopBar title={dish.name} onBack={onBack} wakeLock={wakeLock} stationColor={stationColor} />
      <HeroImage url={imageUrl} alt={dish.name} />
      <MetaLine parts={[dish.category, dish.prepTimeMin > 0 && `${dish.prepTimeMin} דק׳`, `${dish.directIngredients.length + dish.subRecipes.length} רכיבים`]} />

      <div className="px-4 space-y-4 mt-3">

        {/* Allergens: safety first, right under the name */}
        {dish.allergens && dish.allergens.length > 0 && (
          <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}>
            <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
            <p className="text-lg font-semibold" style={{ color: '#fbbf24' }}>
              אלרגנים: {dish.allergens.join(' · ')}
            </p>
          </div>
        )}

        {/* Portions */}
        <Block title="מנות" icon={Scale} aside={scale !== 1 ? <ScaleBadge factor={scale} color={stationColor} /> : null}>
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-3">
              <StepperButton onClick={() => onPortions(p => Math.max(1, p - 1))} label="פחות מנות">−</StepperButton>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>{portions}</span>
                <span className="text-base mr-2" style={{ color: 'var(--text-2)' }}>מנות</span>
              </div>
              <StepperButton onClick={() => onPortions(p => p + 1)} label="עוד מנה">+</StepperButton>
            </div>
            <div className="flex gap-2">
              {QUICK_PORTIONS.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onPortions(n)}
                  aria-pressed={portions === n}
                  aria-label={`${n} מנות`}
                  className="flex-1 min-h-[48px] rounded-xl text-lg font-semibold"
                  style={{ background: portions === n ? stationColor : 'rgba(255,255,255,0.08)', color: portions === n ? '#fff' : 'var(--text)' }}
                >{n}</button>
              ))}
            </div>
          </div>
        </Block>

        {/* Ingredients */}
        <Block title="מרכיבים" icon={Salad}>
          <div className="px-4">
            {dish.directIngredients.map((ing, i) => (
              <div key={i} className="flex items-center justify-between min-h-[56px] py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-lg" style={{ color: 'var(--text)' }}>{ing.name}</span>
                <span className="text-lg font-semibold flex-shrink-0 mr-3 tabular-nums" style={{ color: 'var(--text)' }}>
                  {fmt(ing.qty * scale)} <span className="text-base font-normal" style={{ color: 'var(--text-2)' }}>{ing.unit}</span>
                </span>
              </div>
            ))}
          </div>

          {dish.subRecipes.length > 0 && (
            <div className="px-4 pb-4 pt-3">
              <p className="text-base font-semibold mb-2" style={{ color: 'var(--text-2)' }}>תת-מתכונים (הכנות)</p>
              <div className="space-y-2">
                {dish.subRecipes.map(sr => {
                  const recipe = allPrepRecipes.find(r => r.id === sr.recipeId);
                  return (
                    <button
                      key={sr.recipeId}
                      type="button"
                      onClick={() => recipe && onOpenSubRecipe(recipe)}
                      className="w-full min-h-[64px] flex items-center justify-between rounded-xl px-4 py-2 text-right"
                      style={{ background: stationColor + '14', border: `1px solid ${stationColor}33` }}
                    >
                      <div>
                        <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{sr.name}</p>
                        <p className="text-base" style={{ color: 'var(--text-2)' }}>{sr.portionDesc} · <span dir="ltr">×{fmt(sr.portionsUsed * scale)}</span></p>
                      </div>
                      <span className="flex items-center gap-1 text-base font-semibold flex-shrink-0 mr-2" style={{ color: stationColor }}>
                        פתח <ChevronLeft size={20} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Block>

        {/* Method */}
        <MethodBlock title={dish.name} steps={stepsInfo.steps} hasEdited={stepsInfo.hasEdited} color={stationColor} onSave={stepsInfo.save} onReset={stepsInfo.reset} />

        {/* Folded extras */}
        {dish.description && (
          <FoldSection title="תיאור" icon={Info}>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--text)' }}>{dish.description}</p>
          </FoldSection>
        )}

        {dish.costPerPortion > 0 && (
          <FoldSection title="עלות מזון" icon={Coins}>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <Stat label="עלות למנה" value={`₪${dish.costPerPortion.toFixed(2)}`} />
              <Stat label={`סה״כ ×${portions}`} value={`₪${totalCost.toFixed(2)}`} />
              <Stat label="Food Cost" value={`${fcp.toFixed(0)}%`} color={fcColor} />
            </div>
          </FoldSection>
        )}

        {dish.foh && (
          <FoldSection title="מדריך FOH — מכירה והגשה" icon={Target}>
            <div>
              <p className="text-base font-semibold mb-2" style={{ color: 'var(--text-2)' }}>נקודות מכירה</p>
              <ul className="space-y-2">
                {(dish.foh.sellingPoints || []).map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-lg" style={{ color: 'var(--text)' }}>
                    <span style={{ color: stationColor }}>•</span><span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <FohRow icon={Wine} label="זיווג" text={dish.foh.pairing} />
            <FohRow icon={Thermometer} label="הגשה" text={dish.foh.serveTemp} />
            <FohRow icon={UtensilsCrossed} label="פלייטינג" text={dish.foh.platingNote} />
          </FoldSection>
        )}

        <ImageUploadButton hasImage={!!imageUrl} uploading={uploading} error={uploadError} onFile={handleImageUpload} />
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="text-center">
      <div className="text-base" style={{ color: 'var(--text-2)' }}>{label}</div>
      <div className="text-xl font-bold" style={{ color: color || 'var(--text)' }}>{value}</div>
    </div>
  );
}

function FohRow({ icon: Icon, label, text }) {
  if (!text) return null;
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
      <p className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-2)' }}><Icon size={18} /> {label}</p>
      <p className="text-lg leading-relaxed" style={{ color: 'var(--text)' }}>{text}</p>
    </div>
  );
}
