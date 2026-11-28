import { auth } from '../firebase';

// Calls /api/team. Throws Error(code) with the server's error code, e.g. 'PIN_TAKEN'.
async function post(body, withToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (withToken) {
    const user = auth.currentUser;
    if (!user) throw new Error('UNAUTHORIZED');
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }
  let res;
  try {
    res = await fetch('/api/team', { method: 'POST', headers, body: JSON.stringify(body) });
  } catch (_) {
    throw new Error('NETWORK');
  }
  let data = {};
  try { data = await res.json(); } catch (_) { /* no body */ }
  if (!res.ok) throw new Error(data.error || 'SERVER_ERROR');
  return data;
}

// A signed-in chef / manager
export const teamCall = body => post(body, true);
// The chef proving himself with his current PIN (used right after login)
export const pinCall = body => post(body, false);

export const TEAM_ERRORS = {
  NETWORK:          'אין חיבור לשרת. נסה שוב.',
  UNAUTHORIZED:     'צריך להתחבר מחדש.',
  FORBIDDEN:        'רק מנהל יכול לעשות את זה.',
  INVALID_CREDENTIALS: 'הקוד הנוכחי שגוי.',
  BAD_FORMAT:       'הקוד חייב להיות 4 ספרות.',
  TOO_SIMPLE:       'הקוד פשוט מדי, כמו 1234 או 1111. בחר אחר.',
  SAME_PIN:         'זה הקוד הנוכחי שלך. בחר קוד אחר.',
  PIN_TAKEN:        'הקוד הזה כבר בשימוש. בחר אחר.',
  NAME_REQUIRED:    'צריך לכתוב שם.',
  NAME_TAKEN:       'יש כבר טבח בשם הזה.',
  STATION_REQUIRED: 'צריך לבחור לפחות פס אחד.',
  CANNOT_DEACTIVATE_SELF: 'אי אפשר להשבית את עצמך.',
  NO_FREE_PIN:      'לא נמצא קוד פנוי. נסה שוב.',
  SERVER_ERROR:     'משהו השתבש. נסה שוב.',
};
export const teamErrorText = e => TEAM_ERRORS[e?.message] || TEAM_ERRORS.SERVER_ERROR;
