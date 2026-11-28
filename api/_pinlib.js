// Pure helpers for chef PINs (no Firebase here, so they can be unit-tested).
// Files starting with "_" in api/ are not exposed by Vercel as endpoints.
const crypto = require('crypto');

const SCRYPT_N = 8192;
const WEAK_PINS = new Set(['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '9876']);

function hashPin(pin, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin), s, 32, { N: SCRYPT_N }).toString('hex');
  return { pinHash: hash, pinSalt: s };
}

function verifyPin(pin, pinHash, pinSalt) {
  if (!pinHash || !pinSalt) return false;
  const got = crypto.scryptSync(String(pin), pinSalt, 32, { N: SCRYPT_N });
  const want = Buffer.from(pinHash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

// A chosen PIN must be exactly 4 digits and not an obvious one.
function pinFormatError(pin) {
  if (!/^\d{4}$/.test(String(pin))) return 'BAD_FORMAT';
  if (WEAK_PINS.has(String(pin))) return 'TOO_SIMPLE';
  return null;
}

/**
 * Every login candidate that matches this PIN.
 *   docs:         [{ id, active, pinHash, pinSalt, ... }]  from Firestore
 *   staticChefs:  [{ id, ... }]                            the built-in list (legacy)
 *   envPins:      { id: '1234' }                           PINs still kept in Vercel
 * A chef that has a Firestore document is managed there; the Vercel PIN is ignored.
 */
function matchPin(pin, { docs = [], staticChefs = [], envPins = {} }) {
  const matches = [];
  const hasDoc = new Set();
  for (const d of docs) {
    // A record without a PIN (e.g. a built-in chef that was only deactivated) does not take over from Vercel.
    if (d.pinHash || d.active === false) hasDoc.add(d.id);
    if (d.active === false) continue;
    if (verifyPin(pin, d.pinHash, d.pinSalt)) matches.push({ id: d.id, source: 'db', doc: d });
  }
  for (const c of staticChefs) {
    if (hasDoc.has(c.id)) continue;
    if (envPins[c.id] && String(envPins[c.id]) === String(pin)) matches.push({ id: c.id, source: 'env', chef: c });
  }
  return matches;
}

// Random 4-digit PIN that nobody else uses and that is not an obvious one.
function generateUniquePin(ctx, rand = crypto.randomInt) {
  for (let i = 0; i < 500; i++) {
    const pin = String(rand(0, 10000)).padStart(4, '0');
    if (pinFormatError(pin)) continue;
    if (matchPin(pin, ctx).length === 0) return pin;
  }
  throw new Error('NO_FREE_PIN');
}

function newChefId() {
  return 'c' + crypto.randomBytes(4).toString('hex');
}

// Legacy PINs from Vercel: CHEF_PINS = {"yamski":"1234",...} plus CHEF_PINS_<ID> = "1234" or {"id":"1234"}
function loadEnvPins(env = process.env) {
  let pins = {};
  try {
    pins = JSON.parse(env.CHEF_PINS || '{}');
  } catch {
    console.error('[Auth] CHEF_PINS is not valid JSON');
  }
  Object.keys(env).filter(k => k.startsWith('CHEF_PINS_')).forEach(k => {
    const id = k.slice('CHEF_PINS_'.length).toLowerCase();
    const raw = String(env[k] || '').trim();
    try {
      const v = JSON.parse(raw);
      if (v && typeof v === 'object') { Object.assign(pins, v); return; }
    } catch { /* plain PIN */ }
    if (raw) pins[id] = raw.replace(/^['"]|['"]$/g, '');
  });
  return pins;
}

module.exports = { hashPin, verifyPin, pinFormatError, matchPin, generateUniquePin, newChefId, loadEnvPins };
