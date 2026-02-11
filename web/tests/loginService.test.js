const test = require('node:test');
const assert = require('node:assert/strict');

const loginService = require('../lib/loginService');
const store = require('../lib/store');
const security = require('../lib/security');
const userAuth = require('../lib/userAuth');

test('authenticateWithPassword creates profile for new user', async () => {
  const originalGet = store.getUserProfile;
  const originalUpsert = store.upsertUserProfile;

  let savedProfile = null;

  try {
    store.getUserProfile = async () => null;
    store.upsertUserProfile = async (_userId, payload) => {
      savedProfile = payload;
      return payload;
    };

    const result = await loginService.authenticateWithPassword('user@example.com', 'new-pass-123');
    assert.equal(result.mode, 'created');
    assert.equal(result.userId, security.userIdFromEmail('user@example.com'));
    assert.equal(savedProfile.authType, 'local-password');
    assert.equal(savedProfile.passwordAlgo, 'scrypt-v1');
    assert.ok(savedProfile.passwordHash);
    assert.ok(savedProfile.passwordSalt);
  } finally {
    store.getUserProfile = originalGet;
    store.upsertUserProfile = originalUpsert;
  }
});

test('authenticateWithPassword migrates legacy profile without password', async () => {
  const originalGet = store.getUserProfile;
  const originalUpsert = store.upsertUserProfile;

  let upsertCount = 0;

  try {
    store.getUserProfile = async () => ({
      userId: 'u1',
      email: 'legacy@example.com'
    });
    store.upsertUserProfile = async (_userId, payload) => {
      upsertCount += 1;
      return payload;
    };

    const result = await loginService.authenticateWithPassword('legacy@example.com', 'legacy-pass-123');
    assert.equal(result.mode, 'migrated');
    assert.equal(upsertCount, 1);
  } finally {
    store.getUserProfile = originalGet;
    store.upsertUserProfile = originalUpsert;
  }
});

test('authenticateWithPassword rejects invalid password for existing profile', async () => {
  const originalGet = store.getUserProfile;

  try {
    const auth = await userAuth.hashPassword('correct-pass-123');
    store.getUserProfile = async () => ({
      userId: 'u2',
      email: 'existing@example.com',
      authType: 'local-password',
      passwordHash: auth.passwordHash,
      passwordSalt: auth.passwordSalt
    });

    await assert.rejects(
      loginService.authenticateWithPassword('existing@example.com', 'wrong-pass-123'),
      /Invalid email or password/
    );
  } finally {
    store.getUserProfile = originalGet;
  }
});
