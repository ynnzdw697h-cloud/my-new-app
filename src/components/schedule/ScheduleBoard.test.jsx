
import { render, screen, fireEvent } from '@testing-library/react';
import ScheduleBoard from './ScheduleBoard';

// In-memory stand-in for Firestore
let mockStore = {};
jest.mock('../../hooks/useFirestoreDoc', () => ({
  useFirestoreDoc: (docId, fallback) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [v, setV] = require('react').useState(mockStore[docId] ?? fallback);
    const set = u => setV(prev => { const next = typeof u === 'function' ? u(prev) : u; mockStore[docId] = next; return next; });
    return [v, set, { loaded: true, error: null }];
  },
}));
jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    AnimatePresence: ({ children }) => <>{children}</>,
    motion: new Proxy({}, { get: () => React.forwardRef(({ initial, animate, exit, transition, ...p }, ref) => <div ref={ref} {...p} />) }),
    useReducedMotion: () => true,
  };
});

const WEEK = '2026-12-06';
// Only Sunday morning, one hot + one cold cook needed
const template = {
  days: Array.from({ length: 7 }, (_, i) => ({
    morning: i === 0 ? { hot: 1, cold: 1, air: 0, checker: 0 } : {},
    evening: {},
  })),
  deadline: { day: 4, hour: 12 },
};
const prof = ratings => ({ ratings, note: '', min: 0, max: 6, senior: true, inSchedule: true });
const profiles = { ofek: prof({ hot: 8 }), keshem: prof({ cold: 7, hot: 5 }) };
const availability = {
  ofek:   { shifts: { '0-morning': 2 }, submittedAt: 'x' },
  keshem: { shifts: { '0-morning': 1 }, submittedAt: 'x' },
};

function renderBoard() {
  return render(<ScheduleBoard week={WEEK} template={template} profiles={profiles} availability={availability} availabilityLoaded />);
}
const draft = () => mockStore[`draft_${WEEK}`]?.assignments || {};

beforeEach(() => { mockStore = {}; });

jest.mock('../ui/Sheet', () => ({
  Sheet: ({ open, title, children }) => (open ? <div role="dialog" aria-label={title}>{children}</div> : null),
  canAutoFocus: () => false,
}));

test('tap a slot: the list shows who prefers, who can, who cannot', () => {
  renderBoard();
  fireEvent.click(screen.getByRole('button', { name: 'פס חם: ריק' }));
  const names = screen.getAllByRole('button', { name: /: (מעדיף|יכול|לא יכול|לא הגיש|לא עובד בפס הזה)$/ }).map(b => b.getAttribute('aria-label'));
  expect(names[0]).toBe('אופק: מעדיף');
  expect(names[1]).toBe('קסם ברכה: יכול');
  expect(names).toContain('דורון: לא הגיש');
});

test('tap a slot, pick a name: the cook is placed', () => {
  renderBoard();
  fireEvent.click(screen.getByRole('button', { name: 'פס חם: ריק' }));
  fireEvent.click(screen.getByRole('button', { name: 'אופק: מעדיף' }));
  expect(draft()['0-morning-hot-0']).toEqual({ chefId: 'ofek' });
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('picking a cook against a rule places them and offers undo', () => {
  renderBoard();
  fireEvent.click(screen.getByRole('button', { name: 'פס קר: ריק' }));
  fireEvent.click(screen.getByRole('button', { name: 'אופק: לא עובד בפס הזה' }));
  expect(draft()['0-morning-cold-0']).toEqual({ chefId: 'ofek' });
  expect(screen.getByText(/שובץ למרות: לא עובד בפס הזה/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ביטול' }));
  expect(draft()['0-morning-cold-0']).toBeUndefined();
});

test('auto-assign, approve, then remove from the slot list with undo', () => {
  renderBoard();
  fireEvent.click(screen.getByRole('button', { name: 'שיבוץ אוטומטי' }));
  expect(draft()['0-morning-hot-0']).toMatchObject({ chefId: 'ofek', auto: true });
  expect(draft()['0-morning-cold-0']).toMatchObject({ chefId: 'keshem', auto: true });
  fireEvent.click(screen.getByRole('button', { name: 'אישור 2 הצעות' }));
  expect(draft()['0-morning-hot-0']).toEqual({ chefId: 'ofek' });

  fireEvent.click(screen.getByRole('button', { name: 'פס חם: אופק' }));
  fireEvent.click(screen.getByRole('button', { name: 'הוצאת אופק מהמשבצת' }));
  expect(draft()['0-morning-hot-0']).toBeUndefined();
  fireEvent.click(screen.getByRole('button', { name: 'ביטול' }));
  expect(draft()['0-morning-hot-0']).toEqual({ chefId: 'ofek' });
});

const dt = () => ({ setData: () => {}, getData: () => '', effectAllowed: '', dropEffect: '' });

test('drag a cook onto a slot, then drag them to another slot', () => {
  renderBoard();
  fireEvent.dragStart(screen.getAllByText('קסם ברכה')[0], { dataTransfer: dt() });
  fireEvent.drop(screen.getByRole('button', { name: 'פס קר: ריק' }), { dataTransfer: dt() });
  expect(draft()['0-morning-cold-0']).toEqual({ chefId: 'keshem' });

  // Move keshem (hot level 5) from cold to hot in the same shift: allowed, old slot emptied
  fireEvent.dragStart(screen.getByRole('button', { name: 'פס קר: קסם ברכה' }), { dataTransfer: dt() });
  fireEvent.drop(screen.getByRole('button', { name: 'פס חם: ריק' }), { dataTransfer: dt() });
  expect(draft()['0-morning-hot-0']).toEqual({ chefId: 'keshem' });
  expect(draft()['0-morning-cold-0']).toBeUndefined();
});

test('publish: only after suggestions are approved, then cooks get the slots', () => {
  renderBoard();
  fireEvent.click(screen.getByRole('button', { name: 'שיבוץ אוטומטי' }));
  expect(screen.getByRole('button', { name: 'פרסום הסידור' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'אישור 2 הצעות' }));
  fireEvent.click(screen.getByRole('button', { name: 'פרסום הסידור' }));
  expect(mockStore[`schedule_published_${WEEK}`].slots).toEqual({ '0-morning-hot-0': 'ofek', '0-morning-cold-0': 'keshem' });
  expect(screen.getByRole('button', { name: 'עדכון הסידור' })).toBeDisabled();

  // A change after publishing can be published again
  fireEvent.click(screen.getByRole('button', { name: 'פס חם: אופק' }));
  fireEvent.click(screen.getByRole('button', { name: 'הוצאת אופק מהמשבצת' }));
  expect(screen.getByText('יש שינויים שלא פורסמו')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'עדכון הסידור' }));
  expect(mockStore[`schedule_published_${WEEK}`].slots).toEqual({ '0-morning-cold-0': 'keshem' });
});
