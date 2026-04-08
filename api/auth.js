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

// Chef registry — source of truth for PIN validation.
// In a future version this can be fetched from Firestore per-tenant.
const CHEFS = [
  { id: 'yamski',       displayName: 'ימסקי',     pin: '1234', role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'kaydi',        displayName: 'קיידי',      pin: '1111', role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'shontz',       displayName: 'שונצה',      pin: '2222', role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'noam_s',       displayName: 'נועם הנמוך', pin: '3333', role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'noam_t',       displayName: 'נועם הגבוה', pin: '4444', role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'ortal',        displayName: 'אורטל',       pin: '5555', role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'or',           displayName: 'אור',         pin: '6666', role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'nitzan',       displayName: 'ניצן',        pin: '7777', role: 'chef',    tenantId: 'villa-acadia' },
  { id: 'checker_main', displayName: 'קבלה',        pin: '0000', role: 'checker', tenantId: 'villa-acadia' },
];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const { chefId, pin } = req.body || {};

  if (!chefId || !pin) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  const chef = CHEFS.find(c => c.id === chefId);

  if (!chef || chef.pin !== pin) {
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
