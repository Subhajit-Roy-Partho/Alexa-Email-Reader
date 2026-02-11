const test = require('node:test');
const assert = require('node:assert/strict');

const userAuth = require('../lib/userAuth');

test('hashPassword and verifyPassword roundtrip', async () => {
  const auth = await userAuth.hashPassword('strong-pass-123');
  assert.equal(auth.passwordAlgo, 'scrypt-v1');
  assert.ok(auth.passwordHash);
  assert.ok(auth.passwordSalt);

  const valid = await userAuth.verifyPassword('strong-pass-123', auth.passwordHash, auth.passwordSalt);
  const invalid = await userAuth.verifyPassword('wrong-password', auth.passwordHash, auth.passwordSalt);

  assert.equal(valid, true);
  assert.equal(invalid, false);
});

test('validatePassword enforces minimum length', () => {
  assert.throws(() => userAuth.validatePassword('short'), /at least 8 characters/);
});
