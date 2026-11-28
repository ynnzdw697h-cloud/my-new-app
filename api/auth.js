/**
 * POST /api/auth  { pin }
 * Validates a chef PIN server-side and returns a Firebase custom token
 * with tenantId + role claims. The client uses signInWithCustomToken()
 * to establish a Firebase Auth session, which Firestore Rules then enforce.
 *
 * Chefs live in Firestore (teamServer/{tenant}/chefs, PIN stored only as a hash).
 * The built-in chefs that have no record yet still log in with the PINs kept in Vercel
 * (CHEF_PINS / CHEF_PINS_<ID>); their first login moves them to Firestore.
 *
 * Required env vars:
 *   FIREBASE_SERVICE_ACCOUNT_JSON — contents of the Firebase service account JSON file
 */
const { admin, TENANT_ID, STATIC_CHEFS, chefsCol, loadDocs } = require('./_team');
const { hashPin, matchPin, loadEnvPins } = require('./_pinlib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const { pin } = req.body || {};
  if (!pin) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  try {
    // PIN-only login: the PIN identifies the user. PINs are unique —
    // if two users ever share a PIN, refuse rather than guess who it is.
    const docs    = await loadDocs();
    const matches = matchPin(pin, { docs, staticChefs: STATIC_CHEFS, envPins: loadEnvPins() });

    if (matches.length !== 1) {
      if (matches.length > 1) console.error('[Auth] Duplicate PIN');
      await new Promise(r => setTimeout(r, 400)); // slow down guessing
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    const m = matches[0];
    let chef;
    if (m.source === 'db') {
      chef = m.doc;
    } else {
      // First login of a built-in chef: save a record with the PIN as a hash.
      chef = {
        id: m.chef.id, displayName: m.chef.displayName, role: 'chef', stations: m.chef.stations,
        admin: m.chef.admin, active: true, mustChangePin: false, createdAt: Date.now(),
      };
      try {
        const { id, ...rest } = chef;
        await chefsCol().doc(id).set({ ...rest, ...hashPin(pin) }, { merge: true });
      } catch (err) {
        console.error('[Auth] could not move chef to Firestore:', err.message); // login still works
      }
    }

    // uid must be unique per user. Using tenantId:chefId ensures cross-tenant uniqueness.
    const token = await admin.auth().createCustomToken(`${TENANT_ID}:${chef.id}`, {
      tenantId:    TENANT_ID,
      role:        'chef', // token role stays 'chef' for everyone; manager rights are the `admin` claim
      displayName: chef.displayName,
      chefId:      chef.id,
      admin:       chef.admin === true,
    });

    return res.status(200).json({
      token,
      chefId:        chef.id,
      tenantId:      TENANT_ID,
      role:          'chef',
      admin:         chef.admin === true,
      stations:      chef.stations || ['hot', 'cold'],
      displayName:   chef.displayName,
      mustChangePin: chef.mustChangePin === true,
    });
  } catch (err) {
    console.error('[Auth] login failed:', err);
    return res.status(500).json({ error: 'TOKEN_CREATION_FAILED', message: err.message });
  }
};
