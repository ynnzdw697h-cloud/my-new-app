import { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, UtensilsCrossed, ChevronLeft } from 'lucide-react';
import { RECIPES } from '../data/recipes';
import { MAIN_DISHES } from '../data/mainDishes';
import { useFirestoreArray } from '../hooks/useFirestoreArray';
import { StatusMark } from './PrepCelebrations';
import { MISSING_STATUS, missingStatus } from './ShiftNotes';

const GROUP_LIMIT = 5;
const RECENT_KEY  = 'villa_akadia_recent_recipes';
const RECENT_MAX  = 5;

// "צ'יראשי" = "צ׳יראשי" = "ציראשי": ignore geresh/quote marks, spaces and dashes.
// Final letters count as regular ones, so "קיצוץ" also finds "קיצוצי".
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const norm = s => String(s || '')
  .replace(/[׳'"״`\s\-–—־.,]/g, '')
  .replace(/[ךםןףץ]/g, c => FINALS[c])
  .toLowerCase();

// Recently opened recipes/dishes, per device. Storage can fail (private mode) — then just no list.
function readRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
}
export function rememberRecent(kind, id) {
  try {
    const next = [{ kind, id }, ...readRecent().filter(r => !(r.kind === kind && String(r.id) === String(id)))];
    localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, RECENT_MAX)));
  } catch { /* ignore */ }
}

function Highlight({ text, query }) {
  const nq = norm(query);
  if (!nq) return text;
  const chars = [...text];
  const map = [];
  let flat = '';
  chars.forEach((ch, i) => { const n = norm(ch); if (n) { flat += n; map.push(i); } });
  const at = flat.indexOf(nq);
  if (at < 0) return text;
  const a = map[at];
  const b = map[at + nq.length - 1] + 1;
  return (
    <>
      {chars.slice(0, a).join('')}
      <span style={{ color: '#3B82F6' }}>{chars.slice(a, b).join('')}</span>
      {chars.slice(b).join('')}
    </>
  );
}

function Row({ lead, title, sub, query, trail, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 min-h-[64px] rounded-xl text-right transition-colors duration-150 active:bg-white/5"
    >
      <span className="w-9 h-9 flex items-center justify-center flex-shrink-0">{lead}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-lg font-medium leading-snug text-text-primary truncate">
          <Highlight text={title} query={query} />
        </span>
        {sub && <span className="block text-sm text-text-secondary truncate">{sub}</span>}
      </span>
      {trail || <ChevronLeft size={18} className="flex-shrink-0 text-text-secondary" strokeWidth={1.5} />}
    </button>
  );
}

function Group({ title, count, children, extra, onMore }) {
  return (
    <div className="pt-3">
      <div className="px-3 pb-1 text-sm font-semibold text-text-secondary">
        {title} · <span className="tabular-nums">{count}</span>
      </div>
      {children}
      {extra > 0 && (
        <button onClick={onMore} className="w-full min-h-[48px] px-3 text-right text-base font-medium" style={{ color: '#3B82F6' }}>
          עוד <span className="tabular-nums">{extra}</span>
        </button>
      )}
    </div>
  );
}

const recipeIcon = kind => (
  <span className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary" style={{ background: 'rgba(255,255,255,0.06)' }}>
    {kind === 'dish' ? <UtensilsCrossed size={18} strokeWidth={1.5} /> : <BookOpen size={18} strokeWidth={1.5} />}
  </span>
);

/* ════════════════════════════════════════════════════
   Full-screen search: recipes, dishes, today's checklist, open shortages
════════════════════════════════════════════════════ */
export default function GlobalSearch({ prep, stationName, stationColor, onClose, onPick }) {
  const [query, setQuery]       = useState('');
  const [expanded, setExpanded] = useState({});
  const inputRef = useRef(null);

  const [customRecipes] = useFirestoreArray('custom_recipes');
  const [customDishes]  = useFirestoreArray('custom_dishes');
  const [missingItems]  = useFirestoreArray('missing_items');

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => { setExpanded({}); }, [query]);

  const book = [
    ...[...RECIPES, ...customRecipes].map(r => ({ kind: 'prep', item: r, ings: (r.ingredients || []).map(i => i.name) })),
    ...[...MAIN_DISHES, ...customDishes].map(d => ({
      kind: 'dish', item: d,
      ings: [...(d.directIngredients || []).map(i => i.name), ...(d.subRecipes || []).map(s => s.name)],
    })),
  ];
  const tasks = prep?.progress?.allTasks || [];
  const openMissing = missingItems.filter(i => missingStatus(i) !== 'arrived');

  const nq = norm(query);
  const pick = (type, payload) => { onPick(type, payload); onClose(); };

  const recipeRow = ({ kind, item }, via) => (
    <Row
      key={`${kind}-${item.id}`}
      lead={recipeIcon(kind)}
      title={item.name}
      sub={[kind === 'dish' ? 'מנה' : 'הכנה', item.category, via && `מכיל: ${via}`].filter(Boolean).join(' · ')}
      query={query}
      onClick={() => pick('recipe', { kind, item })}
    />
  );

  let body;
  if (!nq) {
    const recent = readRecent()
      .map(r => book.find(b => b.kind === r.kind && String(b.item.id) === String(r.id)))
      .filter(Boolean);
    body = recent.length > 0 ? (
      <div className="pt-3">
        <div className="px-3 pb-1 text-sm font-semibold text-text-secondary">נפתחו לאחרונה</div>
        {recent.map(b => recipeRow(b))}
      </div>
    ) : (
      <p className="text-center text-text-secondary text-base py-16 px-6">הקלד שם של מתכון, מנה, הכנה או חוסר</p>
    );
  } else {
    // Name matches first, then recipes that only contain the word as an ingredient
    const byName = book.filter(b => norm(b.item.name).includes(nq));
    const byIng  = book
      .filter(b => !byName.includes(b))
      .map(b => [b, b.ings.find(n => norm(n).includes(nq))])
      .filter(([, via]) => via);
    const recipeRows = [...byName.map(b => recipeRow(b)), ...byIng.map(([b, via]) => recipeRow(b, via))];

    // A task matches by its name, or by one of its sub-items (shown as "כולל: ...")
    const taskHits = tasks
      .map(t => [t, norm(t.task).includes(nq) ? null : (t.subItems || []).find(s => norm(s.label).includes(nq))?.label])
      .filter(([t, via]) => via || norm(t.task).includes(nq));
    const missHits = openMissing.filter(m => norm(m.text).includes(nq));

    const limit = (key, rows) => (expanded[key] ? rows : rows.slice(0, GROUP_LIMIT));
    const more  = (key, rows) => (expanded[key] ? 0 : Math.max(0, rows.length - GROUP_LIMIT));
    const open  = key => () => setExpanded(e => ({ ...e, [key]: true }));

    const taskRows = taskHits.map(([t, via]) => {
      const status = prep.taskStatus(t);
      const label  = { todo: 'לא התחיל', progress: 'בתהליך', stuck: 'חסר / תקוע', done: 'מוכן' }[status];
      return (
        <Row
          key={t.id}
          lead={<StatusMark status={status} color={stationColor} size={24} />}
          title={t.task}
          sub={[label, `משמרת ${t.shift}`, via && `כולל: ${via}`].filter(Boolean).join(' · ')}
          query={query}
          onClick={() => pick('task', t)}
        />
      );
    });
    const missRows = missHits.map(m => {
      const s = MISSING_STATUS[missingStatus(m)];
      const ordered = missingStatus(m) === 'ordered';
      return (
        <Row
          key={m.id}
          lead={<StatusMark status={s.mark} color={stationColor} size={24} />}
          title={m.text}
          sub={[m.author && `דיווח: ${m.author}`, m.time].filter(Boolean).join(' · ')}
          query={query}
          trail={
            <span
              className="flex-shrink-0 text-sm font-semibold px-2 py-0.5 rounded-lg"
              style={ordered ? { background: '#F59E0B20', color: '#fbbf24' } : { background: '#EF444420', color: '#f87171' }}
            >{s.label}</span>
          }
          onClick={() => pick('missing', m)}
        />
      );
    });

    const nothing = !recipeRows.length && !taskRows.length && !missRows.length;
    body = nothing ? (
      <div className="text-center py-16 px-6">
        <p className="text-lg text-text-primary">לא נמצא "{query.trim()}"</p>
        <p className="text-base text-text-secondary mt-1">אפשר לנסות מילה אחרת או חלק מהשם</p>
      </div>
    ) : (
      <>
        {recipeRows.length > 0 && (
          <Group title="מתכונים ומנות" count={recipeRows.length} extra={more('r', recipeRows)} onMore={open('r')}>
            {limit('r', recipeRows)}
          </Group>
        )}
        {taskRows.length > 0 && (
          <Group title={`צ׳ק ליסט היום · ${stationName}`} count={taskRows.length} extra={more('t', taskRows)} onMore={open('t')}>
            {limit('t', taskRows)}
          </Group>
        )}
        {missRows.length > 0 && (
          <Group title="חוסרים פתוחים" count={missRows.length} extra={more('m', missRows)} onMore={open('m')}>
            {limit('m', missRows)}
          </Group>
        )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }} dir="rtl" role="dialog" aria-label="חיפוש">
      <div className="flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 p-3 max-w-xl mx-auto">
        <label
          className="flex-1 flex items-center gap-3 h-14 px-4 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: `1px solid ${stationColor}60` }}
        >
          <Search size={20} strokeWidth={1.75} className="flex-shrink-0 text-text-secondary" />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="מה מחפשים?"
            autoComplete="off"
            className="flex-1 min-w-0 bg-transparent text-lg text-text-primary focus:outline-none"
            style={{ caretColor: stationColor }}
          />
          {query && (
            <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="נקה" className="w-10 h-10 -ml-2 flex items-center justify-center text-text-secondary">
              <X size={20} />
            </button>
          )}
        </label>
        <button onClick={onClose} className="h-14 px-3 text-base text-text-secondary">סגור</button>
      </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-8 max-w-xl w-full mx-auto">
        {body}
      </div>
    </div>
  );
}
