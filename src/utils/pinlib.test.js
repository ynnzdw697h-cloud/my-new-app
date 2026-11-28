// Tests for the server-side PIN logic (api/_pinlib.js)
const {
  hashPin, verifyPin, pinFormatError, matchPin, generateUniquePin, newChefId, loadEnvPins,
} = require('../../api/_pinlib');

const staticChefs = [{ id: 'ofek' }, { id: 'andrei' }];

test('hash then verify', () => {
  const h = hashPin('4821');
  expect(verifyPin('4821', h.pinHash, h.pinSalt)).toBe(true);
  expect(verifyPin('4822', h.pinHash, h.pinSalt)).toBe(false);
  expect(verifyPin('4821', undefined, undefined)).toBe(false);
});

test('same PIN gets a different hash each time (random salt)', () => {
  expect(hashPin('4821').pinHash).not.toBe(hashPin('4821').pinHash);
});

test('PIN format: 4 digits, not obvious', () => {
  expect(pinFormatError('4821')).toBeNull();
  expect(pinFormatError('482')).toBe('BAD_FORMAT');
  expect(pinFormatError('48211')).toBe('BAD_FORMAT');
  expect(pinFormatError('48a1')).toBe('BAD_FORMAT');
  expect(pinFormatError('1111')).toBe('TOO_SIMPLE');
  expect(pinFormatError('1234')).toBe('TOO_SIMPLE');
});

test('match from Firestore record', () => {
  const docs = [{ id: 'c1', active: true, ...hashPin('4821') }];
  const m = matchPin('4821', { docs, staticChefs, envPins: {} });
  expect(m).toHaveLength(1);
  expect(m[0]).toMatchObject({ id: 'c1', source: 'db' });
  expect(matchPin('0000', { docs, staticChefs, envPins: {} })).toHaveLength(0);
});

test('deactivated chef cannot log in', () => {
  const docs = [{ id: 'c1', active: false, ...hashPin('4821') }];
  expect(matchPin('4821', { docs, staticChefs, envPins: {} })).toHaveLength(0);
});

test('built-in chef logs in with the Vercel PIN until he has a record', () => {
  const m = matchPin('5555', { docs: [], staticChefs, envPins: { ofek: '5555' } });
  expect(m).toHaveLength(1);
  expect(m[0]).toMatchObject({ id: 'ofek', source: 'env' });
});

test('once a built-in chef has a record with a PIN, the Vercel PIN stops working', () => {
  const docs = [{ id: 'ofek', active: true, ...hashPin('7391') }];
  expect(matchPin('5555', { docs, staticChefs, envPins: { ofek: '5555' } })).toHaveLength(0);
  expect(matchPin('7391', { docs, staticChefs, envPins: { ofek: '5555' } })).toHaveLength(1);
});

test('a record without a PIN (only deactivated before) does not cut off the Vercel PIN', () => {
  const docs = [{ id: 'ofek', active: true }];
  expect(matchPin('5555', { docs, staticChefs, envPins: { ofek: '5555' } })).toHaveLength(1);
});

test('two chefs with the same PIN: both match, so the server refuses the login', () => {
  const docs = [{ id: 'c1', active: true, ...hashPin('4821') }];
  expect(matchPin('4821', { docs, staticChefs, envPins: { ofek: '4821' } })).toHaveLength(2);
});

test('generated PIN is 4 digits, not obvious, and not used by anyone', () => {
  const docs = [{ id: 'c1', active: true, ...hashPin('4821') }];
  for (let i = 0; i < 30; i++) {
    const pin = generateUniquePin({ docs, staticChefs, envPins: { ofek: '5555' } });
    expect(pin).toMatch(/^\d{4}$/);
    expect(pinFormatError(pin)).toBeNull();
    expect(['4821', '5555']).not.toContain(pin);
  }
});

test('generator skips taken and obvious PINs', () => {
  const docs = [{ id: 'c1', active: true, ...hashPin('4821') }];
  const seq = [1234, 4821, 7, 9000];
  const pin = generateUniquePin({ docs, staticChefs, envPins: {} }, () => seq.shift());
  expect(pin).toBe('0007');
});

test('chef id', () => {
  expect(newChefId()).toMatch(/^c[0-9a-f]{8}$/);
});

test('Vercel PIN variables', () => {
  expect(loadEnvPins({ CHEF_PINS: '{"a":"1111"}', CHEF_PINS_B: '2222', CHEF_PINS_C: '{"c":"3333"}' }))
    .toEqual({ a: '1111', b: '2222', c: '3333' });
  expect(loadEnvPins({ CHEF_PINS: 'not json' })).toEqual({});
});
