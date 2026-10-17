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
const CHEFS = [
  { id: 'yamski',       displayName: 'ימסקי',     role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'kaydi',        displayName: 'קיידי',      role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'shontz',       displayName: 'שונצה',      role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'noam_s',       displayName: 'נועם הנמוך', role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'noam_t',       displayName: 'נועם הגבוה', role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'ortal',        displayName: 'אורטל',       role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'or',           displayName: 'אור',         role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'nitzan',       displayName: 'ניצן',        role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'checker_main', displayName: 'קבלה',        role: 'checker', tenantId: 'villa-acadia' },
];

function loadPins() {
  try {
    return JSON.parse(process.env.CHEF_PINS || '{}');
  } catch {
    console.error('[Auth] CHEF_PINS is not valid JSON');
    return {};
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const { chefId, pin } = req.body || {};

  if (!chefId || !pin) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  const chef = CHEFS.find(c => c.id === chefId);
  const expectedPin = chef && loadPins()[chef.id];

  if (!chef || !expectedPin || String(expectedPin) !== String(pin)) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }

  try {
    // uid must be unique per user. Using tenantId:chefId ensures cross-tenant uniqueness.
    const uid = `${chef.tenantId}:${chef.id}`;

    const token = await admin.auth().createCustomToken(uid, {
      tenantId:    chef.tenantId,
      role:        chef.role,
      displayName: chef.displayName,
    });

    return res.status(200).json({
      token,
      tenantId:    chef.tenantId,
      role:        chef.role,
      displayName: chef.displayName,
    });
  } catch (err) {
    console.error('[Auth] createCustomToken failed:', err);
    return res.status(500).json({ error: 'TOKEN_CREATION_FAILED', message: err.message });
  }
};
