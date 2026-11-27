import { render, screen } from '@testing-library/react';
import { WeekView } from './TeamSchedule';

let mockStore = {};
jest.mock('../../hooks/useFirestoreDoc', () => ({
  useFirestoreDoc: (docId, fallback) => [mockStore[docId] ?? fallback, () => {}, { loaded: true, error: null }],
}));

const WEEK = '2026-12-06';
beforeEach(() => { mockStore = {}; });

test('not published yet', () => {
  render(<WeekView week={WEEK} me="ofek" />);
  expect(screen.getByText('הסידור לשבוע הזה עוד לא פורסם')).toBeInTheDocument();
});

test('shows who works each shift and marks me', () => {
  mockStore[`schedule_published_${WEEK}`] = { slots: { '0-morning-cold-0': 'keshem', '0-morning-hot-0': 'ofek' } };
  render(<WeekView week={WEEK} me="ofek" />);
  expect(screen.getByText('אופק (אתה)')).toBeInTheDocument();
  expect(screen.getByText('קסם ברכה')).toBeInTheDocument();
  expect(screen.getAllByText('אין שיבוץ').length).toBe(13);
});

test('shows arrival times, a changed day time, and a cook note', () => {
  mockStore[`schedule_published_${WEEK}`] = {
    slots: { '0-morning-hot-0': 'ofek', '0-morning-cold-0': 'keshem' },
    details: { '0-morning-cold-0': { time: '10:00', note: 'אחרי הספק' } },
    times: { '1-evening': '16:00' },
  };
  render(<WeekView week={WEEK} me="ofek" />);
  expect(screen.getAllByText('הגעה 7:45')).toHaveLength(7);
  expect(screen.getByText('הגעה 16:00')).toBeInTheDocument();
  expect(screen.getAllByText('הגעה 14:45')).toHaveLength(6);
  expect(screen.getByText('10:00')).toBeInTheDocument();
  expect(screen.getByText('אחרי הספק')).toBeInTheDocument();
});
