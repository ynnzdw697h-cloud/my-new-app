import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Plus } from 'lucide-react';
import { Button, Input, Sheet, SkeletonList } from '../ui';
import { STATIONS } from '../../data/stations';
import { applyRoster } from '../../data/roster';
import { teamCall, teamErrorText } from '../../utils/teamApi';
import { Toggle } from './parts';

const STATION_IDS = ['hot', 'cold', 'checker'];
const stationLabel = id => STATIONS[id]?.name || id;

// "צוות" — managers add a cook, get an automatic code, reset a code, or switch a cook off.
export default function TeamManager() {
  const [chefs, setChefs]   = useState(null);
  const [error, setError]   = useState('');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [shown, setShown]   = useState(null); // { name, pin } — a code to hand to the cook

  const load = useCallback(async () => {
    try {
      const { chefs: list } = await teamCall({ action: 'list' });
      setChefs(list);
      applyRoster(list); // the rest of the app sees the change at once
      setError('');
    } catch (e) {
      setError(teamErrorText(e));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const current = chefs?.find(c => c.id === openId);
  const active   = (chefs || []).filter(c => c.active);
  const inactive = (chefs || []).filter(c => !c.active);

  return (
    <div className="space-y-4">
      <p className="text-base text-text-secondary">
        כאן מוסיפים טבח חדש. האפליקציה מייצרת לו קוד אוטומטי, ובכניסה הראשונה הוא יכול להחליף אותו בקוד משלו.
      </p>

      <Button fullWidth icon={Plus} onClick={() => setAdding(true)}>הוספת טבח</Button>

      {error && <p className="text-lg font-semibold" style={{ color: '#ef4444' }} role="alert">{error}</p>}
      {!chefs && !error && <SkeletonList />}

      {chefs && (
        <div className="space-y-3">
          {active.map(c => <Row key={c.id} chef={c} onOpen={() => setOpenId(c.id)} />)}
          {inactive.length > 0 && (
            <>
              <p className="text-base text-text-tertiary pt-2">לא פעילים ({inactive.length})</p>
              {inactive.map(c => <Row key={c.id} chef={c} onOpen={() => setOpenId(c.id)} />)}
            </>
          )}
        </div>
      )}

      <AddSheet
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={(chef, pin) => { setAdding(false); setShown({ name: chef.displayName, pin }); load(); }}
      />

      <ChefSheet
        chef={current}
        onClose={() => setOpenId(null)}
        onChanged={load}
        onNewPin={pin => { setShown({ name: current.displayName, pin }); setOpenId(null); load(); }}
      />

      <CodeSheet shown={shown} onClose={() => setShown(null)} />
    </div>
  );
}

function Row({ chef, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl px-5 py-4 min-h-[72px] flex items-center gap-3 text-right transition-colors duration-150 active:bg-white/5"
      style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', opacity: chef.active ? 1 : 0.55 }}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="text-lg font-semibold text-text-primary">
          {chef.displayName}{chef.admin ? ' · מנהל' : ''}
        </div>
        <div className="text-base text-text-secondary">
          {chef.stations.map(stationLabel).join(' · ')}
          {chef.active && chef.mustChangePin ? ' · עוד לא נכנס' : ''}
        </div>
      </div>
      <ChevronLeft size={20} strokeWidth={1.5} className="text-text-tertiary flex-shrink-0" aria-hidden="true" />
    </button>
  );
}

function AddSheet({ open, onClose, onAdded }) {
  const [name, setName]         = useState('');
  const [stations, setStations] = useState(['hot', 'cold']);
  const [isAdmin, setIsAdmin]   = useState(false);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (open) { setName(''); setStations(['hot', 'cold']); setIsAdmin(false); setError(''); }
  }, [open]);

  const toggle = id => setStations(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const { chef, pin } = await teamCall({ action: 'add', displayName: name, stations, admin: isAdmin });
      onAdded(chef, pin);
    } catch (e) {
      setError(teamErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="טבח חדש">
      <div className="space-y-4">
        <Input label="שם" value={name} onChange={e => setName(e.target.value)} />
        <div className="space-y-2">
          <p className="text-base text-text-secondary px-1">באילו פסים הוא עובד</p>
          {STATION_IDS.map(id => (
            <Toggle key={id} checked={stations.includes(id)} onChange={() => toggle(id)}>{stationLabel(id)}</Toggle>
          ))}
        </div>
        <Toggle checked={isAdmin} onChange={setIsAdmin}>מנהל (רואה הכול, כולל סידור וצוות)</Toggle>
        {error && <p className="text-lg font-semibold" style={{ color: '#ef4444' }} role="alert">{error}</p>}
        <Button fullWidth disabled={busy || !name.trim() || stations.length === 0} onClick={submit}>
          הוספה וייצור קוד
        </Button>
      </div>
    </Sheet>
  );
}

function ChefSheet({ chef, onClose, onChanged, onNewPin }) {
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setError(''); }, [chef?.id]);

  async function run(fn) {
    setBusy(true);
    setError('');
    try { await fn(); } catch (e) { setError(teamErrorText(e)); } finally { setBusy(false); }
  }
  const reset = () => run(async () => {
    const { pin } = await teamCall({ action: 'resetPin', chefId: chef.id });
    onNewPin(pin);
  });
  const setActive = active => run(async () => {
    await teamCall({ action: 'setActive', chefId: chef.id, active });
    await onChanged();
    if (!active) onClose();
  });

  return (
    <Sheet open={!!chef} onClose={onClose} title={chef?.displayName || ''}>
      {chef && (
        <div className="space-y-3">
          <p className="text-base text-text-secondary">
            {chef.stations.map(stationLabel).join(' · ')}{chef.admin ? ' · מנהל' : ''}
          </p>
          {chef.active && (
            <>
              <Button fullWidth variant="secondary" disabled={busy} onClick={reset}>קוד חדש (שכח את הקוד)</Button>
              <p className="text-base text-text-tertiary px-1">הקוד הישן יפסיק לעבוד. הקוד החדש יוצג פעם אחת.</p>
            </>
          )}
          {chef.active
            ? <Button fullWidth variant="danger" disabled={busy} onClick={() => setActive(false)}>השבתה (עזב את המטבח)</Button>
            : <Button fullWidth variant="secondary" disabled={busy} onClick={() => setActive(true)}>החזרה לפעילות</Button>}
          {!chef.active && <p className="text-base text-text-tertiary px-1">אחרי ההחזרה צריך ליצור לו קוד חדש.</p>}
          {error && <p className="text-lg font-semibold" style={{ color: '#ef4444' }} role="alert">{error}</p>}
        </div>
      )}
    </Sheet>
  );
}

// The code is shown once, with a ready WhatsApp message.
function CodeSheet({ shown, onClose }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { setCopied(false); }, [shown]);
  if (!shown) return <Sheet open={false} onClose={onClose} title="" />;

  const guide = `${window.location.origin}/guide.html`;
  const text = `היי ${shown.name}, הקוד האישי שלך לאפליקציית המטבח הוא ${shown.pin}. בכניסה הראשונה אפשר להחליף אותו בקוד משלך. איך מתקינים ומשתמשים: ${guide}`;

  async function copy() {
    try { await navigator.clipboard.writeText(shown.pin); setCopied(true); } catch (_) { /* ignore */ }
  }

  return (
    <Sheet open onClose={onClose} title={`הקוד של ${shown.name}`}>
      <div className="space-y-4">
        <div className="text-center text-5xl font-bold tabular-nums text-text-primary py-4" dir="ltr" style={{ letterSpacing: '0.3em' }}>
          {shown.pin}
        </div>
        <p className="text-base text-text-secondary">
          הקוד מוצג רק עכשיו. אם הוא יאבד, אפשר ליצור קוד חדש מרשימת הצוות.
        </p>
        <Button fullWidth variant="secondary" onClick={copy}>{copied ? 'הועתק' : 'העתקת הקוד'}</Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center h-14 rounded-2xl font-semibold text-lg bg-white text-[#121212] active:bg-white/75"
        >
          שליחה בוואטסאפ
        </a>
      </div>
    </Sheet>
  );
}
