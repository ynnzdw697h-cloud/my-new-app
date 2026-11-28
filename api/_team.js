// Shared server side for chefs: the built-in list, Firestore access, token checks.
const admin = require('firebase-admin');

const TENANT_ID = 'villa-acadia';

// Built-in chefs (legacy). Their PINs come from Vercel until they log in once;
// from then on they live in Firestore like everyone else.
const STATIC_CHEFS = [
  { id: 'yamski', displayName: 'דורון',    admin: true,  stations: ['hot', 'cold', 'checker'] },
  { id: 'kedar',  displayName: 'קידר',     admin: true,  stations: ['hot', 'cold', 'checker'] },
  { id: 'keshem', displayName: 'קסם ברכה', admin: false, stations: ['hot', 'cold'] },
  { id: 'ofek',   displayName: 'אופק',     admin: false, stations: ['hot', 'cold'] },
  { id: 'andrei', displayName: 'אנדריי',   admin: false, stations: ['hot', 'cold'] },
];

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

// Server-only: no Firestore rule matches this path, so no app user can read or write it.
const chefsCol = () => admin.firestore().collection(`teamServer/${TENANT_ID}/chefs`);

async function loadDocs() {
  const snap = await chefsCol().get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Creates the Firestore record of a built-in chef (first login, first reset...).
async function ensureDoc(id, docs) {
  const found = docs.find(d => d.id === id);
  if (found) return found;
  const base = STATIC_CHEFS.find(c => c.id === id);
  if (!base) return null;
  const doc = {
    displayName: base.displayName, role: 'chef', stations: base.stations,
    admin: base.admin, active: true, mustChangePin: false, createdAt: Date.now(),
  };
  await chefsCol().doc(id).set(doc, { merge: true });
  return { id, ...doc };
}

// The signed-in manager asking for a change: Authorization: Bearer <Firebase ID token>
async function requireAuth(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer (.+)$/);
  if (!m) return null;
  try {
    const t = await admin.auth().verifyIdToken(m[1]);
    return t.tenantId === TENANT_ID ? t : null;
  } catch {
    return null;
  }
}

module.exports = { admin, TENANT_ID, STATIC_CHEFS, chefsCol, loadDocs, ensureDoc, requireAuth };
