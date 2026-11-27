/**
 * POST /api/auth
 * Validates a chef PIN server-side and returns a Firebase custom token
 * with tenantId + role claims. The client uses signInWithCustomToken()
 * to establish a Firebase Auth session, which Firestore Rules then enforce.
 *
 * Required env vars:
 *   FIREBASE_SERVICE_ACCOUNT_JSON — contents of the Firebase service account JSON file
 */

const admin = require('firebase-admin');

// Lazy-initialize Firebase Admin (persists across warm invocations)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Chef registry. PINs are NOT stored here — the repo is public.
// They come from the CHEF_PINS env var (set in Vercel), e.g. {"yamski":"4821","kaydi":"9307",...}
// In a future version this can be fetched from Firestore per-tenant.
// Token role stays 'chef' for everyone (same claims Firestore has always seen);
// the extra admin screens for דורון/קידר are decided client-side in src/data/chefs.js.
// `admin: true` is a separate claim: Firestore Rules use it to lock manager-only data
// (cook ratings, schedule drafts) under tenantsAdmin/{tenantId}/...
const CHEFS = [
  { id: 'yamski', displayName: 'דורון',    role: 'chef', tenantId: 'villa-acadia', admin: true },
  { id: 'kedar',  displayName: 'קידר',     role: 'chef', tenantId: 'villa-acadia', admin: true },
  { id: 'keshem', displayName: 'קסם ברכה', role: 'chef', tenantId: 'villa-acadia' },
  { id: 'ofek',   displayName: 'אופק',     role: 'chef', tenantId: 'villa-acadia' },
  { id: 'andrei', displayName: 'אנדריי',   role: 'chef', tenantId: 'villa-acadia' },
];

// Extra cooks can get their own variable instead of editing CHEF_PINS:
// CHEF_PINS_ANDREI = "1234" (or {"andrei":"1234"}) adds the PIN for chef id 'andrei'.
function loadPins() {
  let pins = {};
  try {
    pins = JSON.parse(process.env.CHEF_PINS || '{}');
  } catch {
    console.error('[Auth] CHEF_PINS is not valid JSON');
  }
  Object.keys(process.env).filter(k => k.startsWith('CHEF_PINS_')).forEach(k => {
    const id = k.slice('CHEF_PINS_'.length).toLowerCase();
    const raw = String(process.env[k] || '').trim();
    try {
      const v = JSON.parse(raw);
      if (v && typeof v === 'object') { Object.assign(pins, v); return; }
    } catch { /* plain PIN */ }
    if (raw) pins[id] = raw.replace(/^['"]|['"]$/g, '');
  });
  return pins;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const { pin } = req.body || {};

  if (!pin) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  // PIN-only login: the PIN identifies the user. PINs must be unique —
  // if two users ever share a PIN, refuse rather than guess who it is.
  const pins    = loadPins();
  const matches = CHEFS.filter(c => pins[c.id] && String(pins[c.id]) === String(pin));

  if (matches.length !== 1) {
    if (matches.length > 1) console.error('[Auth] Duplicate PIN in CHEF_PINS');
    await new Promise(r => setTimeout(r, 400)); // slow down guessing
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }

  const chef = matches[0];

  try {
    // uid must be unique per user. Using tenantId:chefId ensures cross-tenant uniqueness.
    const uid = `${chef.tenantId}:${chef.id}`;

    const token = await admin.auth().createCustomToken(uid, {
      tenantId:    chef.tenantId,
      role:        chef.role,
      displayName: chef.displayName,
      chefId:      chef.id,
      admin:       chef.admin === true,
    });

    return res.status(200).json({
      token,
      chefId:      chef.id,
      tenantId:    chef.tenantId,
      role:        chef.role,
      displayName: chef.displayName,
    });
  } catch (err) {
    console.error('[Auth] createCustomToken failed:', err);
    return res.status(500).json({ error: 'TOKEN_CREATION_FAILED', message: err.message });
  }
};
