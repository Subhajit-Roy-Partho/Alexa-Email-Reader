const test = require('node:test');
const assert = require('node:assert/strict');

const security = require('../lib/security');

test('createSignedValue and verifySignedValue roundtrip', () => {
  const signed = security.createSignedValue({ hello: 'world' }, 'secret-key');
  const parsed = security.verifySignedValue(signed, 'secret-key');
  assert.equal(parsed.hello, 'world');

  const bad = security.verifySignedValue(`${signed}x`, 'secret-key');
  assert.equal(bad, null);
});

test('userIdFromEmail is stable and normalized', () => {
  const a = security.userIdFromEmail('User@Example.com');
  const b = security.userIdFromEmail('user@example.com');
  assert.equal(a, b);
  assert.equal(a.length, 24);
});

test('encryptJson in web runtime does not use kms-envelope mode', async () => {
  const encrypted = await security.encryptJson({ hello: 'world' });
  assert.notEqual(encrypted.mode, 'kms-envelope');
  assert.equal(typeof encrypted.ciphertext, 'string');
  assert.ok(encrypted.ciphertext.length > 0);
});
