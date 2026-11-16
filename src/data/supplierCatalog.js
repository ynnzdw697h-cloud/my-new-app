// Logic + fixed vocab for the supplier catalog (items themselves live in Firestore).
import alehAlehSeed from './seeds/alehAlehSeed.json';

// Firestore doc (tenants/{t}/kitchen/{CATALOG_DOC}) → { data: [items], seeded: { [supplierId]: true } }
export const CATALOG_DOC = 'supplier_catalog';

// Order log is split per month to keep each doc small: supplier_order_log_2026_11
export function orderLogDocId(date = new Date()) {
  return `supplier_order_log_${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// One-time seed data per supplier id
export const SEEDS = {
  aleh_aleh: alehAlehSeed,
};

export const UNITS = {
  kg:    { label: 'ק״ג',  msg: 'ק״ג',    defaultStep: 0.5 },
  pack:  { label: 'נספ״ק', msg: 'נספ״ק', defaultStep: 1 },
  unit:  { label: 'יח׳',  msg: 'יח׳',    defaultStep: 1 },
  bunch: { label: 'צרור', msg: 'צרורות', defaultStep: 1 },
};
export const UNIT_KEYS = Object.keys(UNITS);

export const MODES = {
  standing:   'קבוע יומי',
  par:        'מינ׳–מקס׳',
  when_out:   'רק כשנגמר',
  on_request: 'לפי בקשה',
  manual:     'ידני',
};
export const MODE_KEYS = Object.keys(MODES);

// Turn a seed file into catalog items (adds ids, supplier, tenant, nulls for missing fields)
export function seedToItems(supplierId, seed, tenantId) {
  const rows = [
    ...(seed.items || []).map(i => ({ ...i, active: true })),
    ...(seed.inactive_items || []).map(i => ({ ...i, active: false })),
  ];
  const stamp = Date.now().toString(36);
  return rows.map((r, idx) => ({
    id:            `${supplierId}_${stamp}_${idx}`,
    tenant_id:     tenantId,
    supplier:      supplierId,
    name:          r.name,
    category:      r.category,
    unit:          r.unit,
    step:          r.step ?? null,
    mode:          r.mode ?? 'manual',
    standing_qty:  r.standing_qty ?? null,
    min:           r.min ?? null,
    max:           r.max ?? null,
    hint:          r.hint ?? null,
    supplier_note: r.supplier_note ?? null,
    note:          r.note ?? null,
    active:        r.active !== false,
  }));
}

// ── Numbers ──
export function roundQty(n) {
  return Math.round(n * 1000) / 1000;
}

// 0.25, 0.5, 1, 2 — no trailing zeros
export function formatQty(n) {
  return String(roundQty(Number(n) || 0));
}

export function parseQty(v) {
  if (v === '' || v === null || v === undefined) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function defaultQty(item) {
  return item.mode === 'standing' && item.standing_qty != null ? item.standing_qty : 0;
}

// Small hint under the item name
export function itemHint(item) {
  if (item.hint) return item.hint;
  if (item.min != null && item.max != null) return item.min === item.max ? formatQty(item.min) : `${formatQty(item.min)}–${formatQty(item.max)}`;
  if (item.min != null) return `מינ׳ ${formatQty(item.min)}`;
  if (item.max != null) return `עד ${formatQty(item.max)}`;
  return null;
}

// ── Dates ──
export function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function tomorrowISO(from = new Date()) {
  return toISODate(new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1));
}

// "2026-11-10" → "10.11.2026"
export function formatDeliveryDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}.${m}.${y}`;
}

// ── Message ──
// lines: [{ item, qty }] in catalog order, qty > 0
export function buildOrderMessage({ title, supplierName, deliveryDate, lines, notes }) {
  let text = `*${title} – ${supplierName}*\n`;
  text += `תאריך: ${formatDeliveryDate(deliveryDate)}\n\n`;
  for (const { item, qty } of lines) {
    const name = item.supplier_note ? `${item.name} (${item.supplier_note})` : item.name;
    const unit = UNITS[item.unit]?.msg || item.unit;
    text += `• ${name} – ${formatQty(qty)} ${unit}\n`;
  }
  text += `\nסה״כ ${lines.length} פריטים`;
  const n = (notes || '').trim();
  if (n) text += `\n\nהערות: ${n}`;
  return text;
}

// Categories in first-appearance order: [{ name, items }]
export function groupByCategory(items) {
  const map = new Map();
  for (const it of items) {
    if (!map.has(it.category)) map.set(it.category, []);
    map.get(it.category).push(it);
  }
  return [...map.entries()].map(([name, list]) => ({ name, items: list }));
}
