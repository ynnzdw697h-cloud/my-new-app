import { useState } from 'react';
import StepRows, { toRow as toStepRow, stepsFromRows } from './StepRows';
import { X, Trash2, Plus } from 'lucide-react';
import { CATEGORIES } from '../data/recipes';

// Edit a prep recipe in one place: details, ingredients and preparation steps.
// Nothing is saved until "שמור" is pressed.

const NO_AMOUNT = ['לפי טעם', 'לפי הצורך'];
const UNITS = ['גרם', 'ק"ג', 'מ"ל', 'ל׳', 'יחידות', 'כפות', 'שקית', 'בקבוקים', 'קורט', ...NO_AMOUNT];

let uid = 0;
const toRow = i => ({
  k: ++uid,
  original: i,
  name: i.name,
  amount: NO_AMOUNT.includes(i.unit) ? '' : String(i.amount ?? ''),
  unit: i.unit || 'גרם',
  section: i.section || '',
});

const inputStyle = { background: 'rgba(255,255,255,0.08)', color: 'var(--text)', border: '1px solid var(--border)' };
const inputClass = 'w-full h-12 rounded-xl px-4 text-lg focus:outline-none';

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-base" style={{ color: 'var(--text-2)' }}>{label}</span>
      {children}
    </label>
  );
}

function buildFields(form, rows) {
  const ingredients = [];
  for (const r of rows) {
    const name = r.name.trim();
    if (!name) continue;
    const noAmount = NO_AMOUNT.includes(r.unit);
    const amount = noAmount ? 1 : Number(r.amount.trim().replace(',', '.'));
    if (!(amount > 0)) return { error: `חסרה כמות תקינה: ${name}` };
    // Keep extra fields (section, unit weight from the add-recipe wizard).
    // A unit weight no longer holds once the amount or unit changes.
    const { weightG, weightPerUnitG, ...rest } = r.original;
    const same = amount === r.original.amount && r.unit === r.original.unit;
    const weights = same && weightG ? { weightG, weightPerUnitG } : {};
    ingredients.push({ ...rest, ...weights, name, amount, unit: r.unit });
  }
  const trimmed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]));
  return { fields: { ...trimmed, ingredients } };
}

export default function RecipeEditor({ recipe, steps, color, hasEdit, onSave, onReset, onClose }) {
  const [form, setForm] = useState(() => ({
    name: recipe.name || '',
    category: recipe.category || 'הכנות',
    prepTime: recipe.prepTime || '',
    batchUnit: recipe.batchUnit || '',
    description: recipe.description || '',
    notes: recipe.notes || '',
  }));
  const [rows, setRows]   = useState(() => (recipe.ingredients || []).map(toRow));
  const [stepRows, setStepRows] = useState(() => steps.map(toStepRow));
  // What was on screen when the editor opened: only what really changed gets saved
  const [initial] = useState(() => ({
    fields: JSON.stringify(buildFields(form, rows).fields),
    steps: JSON.stringify(stepsFromRows(stepRows)),
  }));
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState(null);

  const set    = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  const update = (k, patch) => setRows(rs => rs.map(r => (r.k === k ? { ...r, ...patch } : r)));
  const categories = CATEGORIES.filter(c => c !== 'הכל');
  if (!categories.includes(form.category)) categories.push(form.category);

  async function run(fn) {
    setBusy(true); setError(null);
    try { await fn(); onClose(); } catch (e) { console.error(e); setError('לא נשמר. בדוק חיבור ונסה שוב'); } finally { setBusy(false); }
  }

  function save() {
    if (!form.name.trim()) { setError('חסר שם למתכון'); return; }
    const { fields, error: problem } = buildFields(form, rows);
    if (problem) { setError(problem); return; }
    if (fields.ingredients.length === 0) { setError('צריך לפחות מרכיב אחד'); return; }
    const newSteps = stepsFromRows(stepRows);
    if (newSteps.length === 0 && steps.length > 0) { setError('צריך לפחות שלב אחד'); return; }
    const changedFields = JSON.stringify(fields) !== initial.fields ? fields : null;
    const changedSteps  = JSON.stringify(newSteps) !== initial.steps ? newSteps : null;
    if (!changedFields && !changedSteps) { onClose(); return; }
    run(() => onSave(changedFields, changedSteps));
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" dir="rtl" style={{ background: 'var(--bg)' }} role="dialog" aria-label="עריכת מתכון">
      <div className="h-14 flex items-center gap-2 px-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button type="button" onClick={onClose} aria-label="סגור בלי לשמור" className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ color: 'var(--text)' }}><X size={26} /></button>
        <p className="flex-1 text-lg font-semibold truncate" style={{ color: 'var(--text)' }}>עריכת מתכון</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <Field label="שם"><input value={form.name} onChange={set('name')} className={inputClass} style={inputStyle} /></Field>
        <Field label="קטגוריה">
          <select value={form.category} onChange={set('category')} className={inputClass} style={inputStyle}>
            {categories.map(c => <option key={c} value={c} style={{ color: '#121212' }}>{c}</option>)}
          </select>
        </Field>

        <p className="text-lg font-semibold pt-2" style={{ color: 'var(--text)' }}>מרכיבים</p>
        {rows.map((r, i) => {
          const noAmount = NO_AMOUNT.includes(r.unit);
          const units = UNITS.includes(r.unit) ? UNITS : [...UNITS, r.unit];
          return (
            <div key={r.k} className="rounded-xl p-3 space-y-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex gap-2">
                <input value={r.name} onChange={e => update(r.k, { name: e.target.value })} aria-label={`שם מרכיב ${i + 1}`} placeholder="שם המרכיב" className={`${inputClass} min-w-0`} style={inputStyle} />
                <button type="button" onClick={() => setRows(rs => rs.filter(x => x.k !== r.k))} aria-label={`מחק מרכיב ${i + 1}`} className="w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center" style={{ color: 'var(--danger)' }}><Trash2 size={22} /></button>
              </div>
              <div className="flex gap-2">
                <input value={noAmount ? '' : r.amount} disabled={noAmount} inputMode="decimal" onChange={e => update(r.k, { amount: e.target.value })} aria-label={`כמות מרכיב ${i + 1}`} placeholder={noAmount ? '—' : 'כמות'} className={`${inputClass} disabled:opacity-40`} style={inputStyle} />
                <select value={r.unit} onChange={e => update(r.k, { unit: e.target.value })} aria-label={`יחידה מרכיב ${i + 1}`} className={inputClass} style={inputStyle}>
                  {units.map(u => <option key={u} value={u} style={{ color: '#121212' }}>{u}</option>)}
                </select>
              </div>
            </div>
          );
        })}
        <button type="button" onClick={() => setRows(rs => [...rs, toRow({ name: '', unit: 'גרם' })])} className="w-full min-h-[56px] rounded-xl flex items-center justify-center gap-2 text-lg font-semibold" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-md)', color: 'var(--text)' }}>
          <Plus size={22} /> הוסף מרכיב
        </button>

        <p className="text-lg font-semibold pt-2" style={{ color: 'var(--text)' }}>שלבי הכנה</p>
        <StepRows rows={stepRows} setRows={setStepRows} color={color} />

        <Field label="דגשים"><textarea value={form.notes} onChange={set('notes')} rows={3} className="w-full rounded-xl px-4 py-3 text-lg focus:outline-none" style={inputStyle} /></Field>
        <Field label="תיאור"><textarea value={form.description} onChange={set('description')} rows={2} className="w-full rounded-xl px-4 py-3 text-lg focus:outline-none" style={inputStyle} /></Field>
        <Field label="זמן הכנה"><input value={form.prepTime} onChange={set('prepTime')} className={inputClass} style={inputStyle} /></Field>
        <Field label="יחידת אצווה"><input value={form.batchUnit} onChange={set('batchUnit')} className={inputClass} style={inputStyle} /></Field>

        {hasEdit && (
          <button type="button" disabled={busy} onClick={() => run(onReset)} className="w-full min-h-[48px] rounded-xl text-lg font-semibold" style={{ color: 'var(--text-2)' }}>
            חזרה למתכון המקורי
          </button>
        )}
      </div>

      <div className="px-4 pt-3 flex-shrink-0 space-y-2" style={{ borderTop: '1px solid var(--border)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        {error && <p className="text-base font-semibold" style={{ color: 'var(--danger)' }}>{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 min-h-[56px] rounded-xl text-lg font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text)' }}>ביטול</button>
          <button type="button" onClick={save} disabled={busy} className="flex-[2] min-h-[56px] rounded-xl text-lg font-semibold disabled:opacity-50" style={{ background: color, color: '#fff' }}>{busy ? 'שומר...' : 'שמור'}</button>
        </div>
      </div>
    </div>
  );
}
