// Kitchen users.
// role 'admin' = full app access (all pages incl. קבלת סחורה).
// stations = which stations the user can pick after entering their PIN.
export const CHEFS = [
  { id: 'yamski', displayName: 'דורון',    emoji: '👨‍🍳', role: 'admin', stations: ['hot', 'cold', 'checker'] },
  { id: 'kedar',  displayName: 'קידר',     emoji: '👨‍🍳', role: 'admin', stations: ['hot', 'cold', 'checker'] },
  { id: 'keshem', displayName: 'קסם ברכה', emoji: '👨‍🍳', role: 'chef',  stations: ['hot', 'cold'] },
  { id: 'ofek',   displayName: 'אופק',     emoji: '👨‍🍳', role: 'chef',  stations: ['hot', 'cold'] },
  { id: 'andrei', displayName: 'אנדריי',   emoji: '👨‍🍳', role: 'chef',  stations: ['hot', 'cold'] },
];

export const SESSION_KEY = 'villa_akadia_session';
