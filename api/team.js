/**
 * POST /api/team  { action, ... }   — chef management
 *
 *   list                         (any signed-in chef)  -> { chefs: [...] }
 *   add     {displayName, stations, admin}   (manager) -> { chef, pin }   pin is shown once
 *   resetPin {chefId}                         (manager) -> { pin }
 *   setActive {chefId, active}                (manager)
 *   changePin {pin, newPin}   (the chef, with the current PIN) -> { ok }
 *   keepPin   {pin}           (the chef keeps the PIN they were given) -> { ok }
 *
 * PINs are stored only as hashes in teamServer/{tenant}/chefs (no app user can read that path).
 */
const { STATIC_CHEFS, chefsCol, loadDocs, ensureDoc, requireAuth } = require('./_team');
const { hashPin, matchPin, pinFormatError, generateUniquePin, newChefId, loadEnvPins } = require('./_pinlib');

const STATIONS = ['hot', 'cold', 'checker'];

const ctxOf = docs => ({ docs, staticChefs: STATIC_CHEFS, envPins: loadEnvPins() });
const fail = (res, status, error) => res.status(status).json({ error });

// Built-in chefs without a record yet are shown as normal members.
function roster(docs, forManager) {
  const byId = new Map(docs.map(d => [d.id, d]));
  const all = STATIC_CHEFS.map(c => byId.get(c.id) || { id: c.id, ...c, active: true })
    .concat(docs.filter(d => !STATIC_CHEFS.some(c => c.id === d.id)));
  return all.map(d => {
    const out = {
      id: d.id, displayName: d.displayName, stations: d.stations || ['hot', 'cold'],
      admin: d.admin === true, active: d.active !== false,
    };
    if (forManager) out.mustChangePin = d.mustChangePin === true;
    return out;
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'METHOD_NOT_ALLOWED');
  const body = req.body || {};
  const { action } = body;

  try {
    // ── Actions by the chef himself, identified by his current PIN ──
    if (action === 'changePin' || action === 'keepPin') {
      const docs = await loadDocs();
      const ctx = ctxOf(docs);
      const matches = matchPin(body.pin, ctx);
      if (matches.length !== 1) {
        await new Promise(r => setTimeout(r, 400));
        return fail(res, 401, 'INVALID_CREDENTIALS');
      }
      const id = matches[0].id;
      if (action === 'keepPin') {
        if (matches[0].source === 'db') await chefsCol().doc(id).set({ mustChangePin: false }, { merge: true });
        return res.status(200).json({ ok: true });
      }
      const bad = pinFormatError(body.newPin);
      if (bad) return fail(res, 400, bad);
      if (String(body.newPin) === String(body.pin)) return fail(res, 400, 'SAME_PIN');
      // The new PIN must not belong to anybody else
      if (matchPin(body.newPin, ctx).length > 0) return fail(res, 409, 'PIN_TAKEN');
      await ensureDoc(id, docs);
      await chefsCol().doc(id).set({ ...hashPin(body.newPin), mustChangePin: false }, { merge: true });
      return res.status(200).json({ ok: true });
    }

    // ── Everything below needs a signed-in chef ──
    const user = await requireAuth(req);
    if (!user) return fail(res, 401, 'UNAUTHORIZED');
    const docs = await loadDocs();

    if (action === 'list') {
      return res.status(200).json({ chefs: roster(docs, user.admin === true) });
    }

    // ── Manager only ──
    if (user.admin !== true) return fail(res, 403, 'FORBIDDEN');
    const ctx = ctxOf(docs);

    if (action === 'add') {
      const displayName = String(body.displayName || '').trim().slice(0, 40);
      const stations = (Array.isArray(body.stations) ? body.stations : []).filter(s => STATIONS.includes(s));
      if (!displayName) return fail(res, 400, 'NAME_REQUIRED');
      if (stations.length === 0) return fail(res, 400, 'STATION_REQUIRED');
      if (roster(docs, false).some(c => c.displayName === displayName)) return fail(res, 409, 'NAME_TAKEN');
      const id = newChefId();
      const pin = generateUniquePin(ctx);
      const doc = {
        displayName, role: 'chef', stations, admin: body.admin === true, active: true,
        mustChangePin: true, createdAt: Date.now(), ...hashPin(pin),
      };
      await chefsCol().doc(id).set(doc);
      return res.status(200).json({ pin, chef: { id, displayName, stations, admin: doc.admin, active: true, mustChangePin: true } });
    }

    const target = String(body.chefId || '');
    const exists = roster(docs, false).some(c => c.id === target);
    if (!exists) return fail(res, 404, 'NOT_FOUND');

    if (action === 'resetPin') {
      const pin = generateUniquePin(ctx);
      await ensureDoc(target, docs);
      await chefsCol().doc(target).set({ ...hashPin(pin), mustChangePin: true }, { merge: true });
      return res.status(200).json({ pin });
    }

    if (action === 'setActive') {
      const active = body.active === true;
      if (!active && target === user.chefId) return fail(res, 400, 'CANNOT_DEACTIVATE_SELF');
      await ensureDoc(target, docs);
      await chefsCol().doc(target).set({ active }, { merge: true });
      return res.status(200).json({ ok: true });
    }

    return fail(res, 400, 'UNKNOWN_ACTION');
  } catch (err) {
    console.error('[Team]', action, err);
    return fail(res, 500, err.message === 'NO_FREE_PIN' ? 'NO_FREE_PIN' : 'SERVER_ERROR');
  }
};
