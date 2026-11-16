import { useState } from 'react';
import { Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { Card, Button, Input, Sheet } from '../ui';
import { useTenantId } from '../../context/TenantContext';
import {
  UNITS, UNIT_KEYS, MODES, MODE_KEYS, formatQty, groupByCategory,
} from '../../data/supplierCatalog';

const NEW_CAT = '__new__';

// number field → string for the form, and back (empty = null, never invented)
const numToStr = n => (n === null || n === undefined ? '' : String(n));
const strToNum = s => {
  const t = String(s ?? '').trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/**
 * Catalog editor for one supplier. Order inside allItems = display order.
 */
export default function CatalogManager({ supplierId, allItems, setAllItems }) {
  const tenantId = useTenantId();
  const [editing,    setEditing]    = useState(null); // form object | null
  const [confirmDel, setConfirmDel] = useState(null); // item | null

  const supplierItems = allItems.filter(i => i.supplier === supplierId);
  const categories    = groupByCategory(supplierItems);
  const categoryNames = categories.map(c => c.name);

  // ── Mutations ──
  function patchItem(id, patch) {
    setAllItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
  }

  function move(item, dir) {
    setAllItems(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(i => i.id === item.id);
      let j = idx + dir;
      while (j >= 0 && j < arr.length && !(arr[j].supplier === supplierId && arr[j].category === item.category)) j += dir;
      if (j < 0 || j >= arr.length) return prev;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return arr;
    });
  }

  // Remove item and re-insert it after the last item of its (possibly new) category
  function placeInCategory(arr, item) {
    const rest = arr.filter(i => i.id !== item.id);
    let last = -1;
    rest.forEach((i, k) => { if (i.supplier === supplierId && i.category === item.category) last = k; });
    if (last === -1) {
      rest.forEach((i, k) => { if (i.supplier === supplierId) last = k; });
    }
    rest.splice(last + 1, 0, item);
    return rest;
  }

  function saveForm(form) {
    const category = form.category === NEW_CAT ? form.newCategory.trim() : form.category;
    const item = {
      id:            form.id || `${supplierId}_${Date.now().toString(36)}`,
      tenant_id:     tenantId,
      supplier:      supplierId,
      name:          form.name.trim(),
      category,
      unit:          form.unit,
      step:          strToNum(form.step) || UNITS[form.unit].defaultStep,
      mode:          form.mode,
      standing_qty:  strToNum(form.standing_qty),
      min:           strToNum(form.min),
      max:           strToNum(form.max),
      hint:          form.hint.trim() || null,
      supplier_note: form.supplier_note.trim() || null,
      note:          form.note.trim() || null,
      active:        form.active,
    };
    setAllItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing && existing.category === item.category) {
        return prev.map(i => (i.id === item.id ? { ...existing, ...item } : i));
      }
      return placeInCategory(prev, existing ? { ...existing, ...item } : item);
    });
    setEditing(null);
  }

  function deleteItem(item) {
    setAllItems(prev => prev.filter(i => i.id !== item.id));
    setConfirmDel(null);
    setEditing(null);
  }

  // ── Form open helpers ──
  function openNew() {
    setEditing({
      id: null, name: '', category: categoryNames[0] || NEW_CAT, newCategory: '',
      unit: 'kg', step: '0.5', mode: 'manual', standing_qty: '', min: '', max: '',
      hint: '', supplier_note: '', note: '', active: true,
    });
  }
  function openEdit(item) {
    setEditing({
      id: item.id, name: item.name, category: item.category, newCategory: '',
      unit: item.unit, step: numToStr(item.step), mode: item.mode || 'manual',
      standing_qty: numToStr(item.standing_qty), min: numToStr(item.min), max: numToStr(item.max),
      hint: item.hint || '', supplier_note: item.supplier_note || '', note: item.note || '',
      active: item.active !== false,
    });
  }

  return (
    <div className="space-y-4">
      <button
        onClick={openNew}
        className="w-full py-4 rounded-3xl text-label font-semibold transition-all duration-150 active:scale-[0.98]"
        style={{ border: '1px dashed rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.62)' }}
      >
        <Plus size={16} className="inline ml-2" strokeWidth={2} />
        הוסף פריט חדש
      </button>

      {categories.map(cat => (
        <Card key={cat.name} padded={false}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-h3 text-text-primary">{cat.name}</h3>
          </div>
          {cat.items.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-3 py-2.5"
              style={{
                borderBottom: i === cat.items.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                opacity: item.active ? 1 : 0.55,
              }}
            >
              <div className="flex flex-col">
                <button
                  onClick={() => move(item, -1)}
                  disabled={i === 0}
                  aria-label={`הזז למעלה ${item.name}`}
                  className="w-9 h-7 flex items-center justify-center rounded-lg text-text-secondary disabled:opacity-20 active:scale-90"
                ><ChevronUp size={18} /></button>
                <button
                  onClick={() => move(item, +1)}
                  disabled={i === cat.items.length - 1}
                  aria-label={`הזז למטה ${item.name}`}
                  className="w-9 h-7 flex items-center justify-center rounded-lg text-text-secondary disabled:opacity-20 active:scale-90"
                ><ChevronDown size={18} /></button>
              </div>

              <button onClick={() => openEdit(item)} className="flex-1 min-w-0 text-right py-1">
                <p className="text-body text-text-primary font-medium">
                  {item.name}
                  {!item.active && <span className="text-meta text-text-tertiary mr-2">· כבוי</span>}
                </p>
                <p className="text-meta text-text-tertiary mt-0.5">
                  {UNITS[item.unit]?.label || item.unit} · קפיצה {formatQty(item.step)} · {MODES[item.mode] || item.mode}
                  {item.standing_qty != null && ` · קבוע ${formatQty(item.standing_qty)}`}
                </p>
              </button>

              <Toggle
                checked={item.active}
                onChange={v => patchItem(item.id, { active: v })}
                label={`${item.active ? 'כבה' : 'הפעל'} ${item.name}`}
              />
            </div>
          ))}
        </Card>
      ))}

      {/* ── Add / edit sheet ── */}
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'עריכת פריט' : 'פריט חדש'}>
        {editing && (
          <ItemForm
            form={editing}
            setForm={setEditing}
            categoryNames={categoryNames}
            onSave={() => saveForm(editing)}
            onCancel={() => setEditing(null)}
            onDelete={editing.id ? () => setConfirmDel(supplierItems.find(i => i.id === editing.id)) : null}
          />
        )}
      </Sheet>

      {/* ── Delete confirmation ── */}
      <Sheet open={!!confirmDel} onClose={() => setConfirmDel(null)} title="למחוק את הפריט לגמרי?">
        {confirmDel && (
          <>
            <p className="text-h3 text-text-primary font-bold mb-2">{confirmDel.name}</p>
            <p className="text-body text-text-secondary mb-6">
              הפריט וכל ההגדרות שלו יימחקו. אם הוא רק יצא מהעונה, עדיף לכבות אותו.
            </p>
            <div className="flex gap-3">
              <Button variant="danger" fullWidth onClick={() => deleteItem(confirmDel)}>כן, מחק</Button>
              <Button variant="ghost" fullWidth onClick={() => setConfirmDel(null)}>ביטול</Button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}

function ItemForm({ form, setForm, categoryNames, onSave, onCancel, onDelete }) {
  const set = patch => setForm(f => ({ ...f, ...patch }));
  const valid = form.name.trim() && (form.category !== NEW_CAT || form.newCategory.trim());

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto -mx-1 px-1 pb-1">
      <Input label="שם" value={form.name} onChange={e => set({ name: e.target.value })} autoFocus={!form.id} />

      <Field label="קטגוריה">
        <select
          value={form.category}
          onChange={e => set({ category: e.target.value })}
          className="w-full h-14 px-4 rounded-2xl bg-bg-inset text-text-primary text-body border border-border outline-none"
        >
          {categoryNames.map(c => <option key={c} value={c}>{c}</option>)}
          <option value={NEW_CAT}>+ קטגוריה חדשה…</option>
        </select>
        {form.category === NEW_CAT && (
          <Input placeholder="שם הקטגוריה החדשה" value={form.newCategory} onChange={e => set({ newCategory: e.target.value })} className="mt-2" />
        )}
      </Field>

      <Field label="יחידה">
        <div className="grid grid-cols-4 gap-2">
          {UNIT_KEYS.map(u => (
            <button
              key={u}
              onClick={() => set({ unit: u, step: String(UNITS[u].defaultStep) })}
              className="h-12 rounded-xl text-label font-bold transition-all"
              style={form.unit === u
                ? { background: 'rgba(212,237,49,0.14)', border: '1px solid rgba(212,237,49,0.5)', color: '#d4ed31' }
                : { background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              {UNITS[u].label}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Input label="קפיצה" inputMode="decimal" value={form.step} onChange={e => set({ step: e.target.value })} />
        <Input label="מינימום" inputMode="decimal" value={form.min} onChange={e => set({ min: e.target.value })} />
        <Input label="מקסימום" inputMode="decimal" value={form.max} onChange={e => set({ max: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="מצב הזמנה">
          <select
            value={form.mode}
            onChange={e => set({ mode: e.target.value })}
            className="w-full h-14 px-4 rounded-2xl bg-bg-inset text-text-primary text-body border border-border outline-none"
          >
            {MODE_KEYS.map(m => <option key={m} value={m}>{MODES[m]}</option>)}
          </select>
        </Field>
        <Input label="כמות קבועה" inputMode="decimal" value={form.standing_qty} onChange={e => set({ standing_qty: e.target.value })}
          hint={form.mode === 'standing' ? 'ממולא מראש בכל הזמנה' : 'בשימוש רק במצב "קבוע יומי"'} />
      </div>

      <Input label="רמז (מוצג מתחת לשם)" value={form.hint} onChange={e => set({ hint: e.target.value })} placeholder="למשל: לרוב 2" />
      <Input label="הערה לספק (נכנסת להודעה בסוגריים)" value={form.supplier_note} onChange={e => set({ supplier_note: e.target.value })} placeholder="למשל: סגור, לא שטוף" />
      <Input label="הערה פנימית" value={form.note} onChange={e => set({ note: e.target.value })} placeholder="למשל: לא בעונה" />

      <div className="flex items-center justify-between px-1">
        <span className="text-label text-text-secondary">פריט פעיל (מופיע בהזמנה)</span>
        <Toggle checked={form.active} onChange={v => set({ active: v })} label="פריט פעיל" />
      </div>

      <div className="flex gap-3 pt-1">
        <Button variant="primary" fullWidth onClick={onSave} disabled={!valid}>שמור</Button>
        <Button variant="ghost" fullWidth onClick={onCancel}>ביטול</Button>
      </div>
      {onDelete && (
        <Button variant="danger" fullWidth icon={Trash2} onClick={onDelete}>מחק פריט</Button>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-label text-text-secondary px-1">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative w-14 h-8 rounded-full flex-shrink-0 transition-colors"
      style={{ background: checked ? '#d4ed31' : 'rgba(255,255,255,0.14)' }}
    >
      <span
        className="absolute top-1 w-6 h-6 rounded-full transition-all"
        style={{ background: checked ? '#0E0E0E' : 'rgba(255,255,255,0.7)', right: checked ? 4 : 28 }}
      />
    </button>
  );
}
