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
