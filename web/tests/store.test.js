const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

test('turso-backed store supports profile/account/prefs/token lifecycle', async () => {
  const dbPath = path.join(os.tmpdir(), `email-reader-web-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
  process.env.TURSO_DATABASE_URL = `file:${dbPath}`;
  delete process.env.TURSO_AUTH_TOKEN;

  const store = require('../lib/store');

  const profile = await store.upsertUserProfile('user-1', { email: 'user@example.com' });
  assert.equal(profile.userId, 'user-1');

  const fetchedProfile = await store.getUserProfile('user-1');
  assert.equal(fetchedProfile.email, 'user@example.com');

  const account = await store.upsertAccount('user-1', {
    provider: 'gmail',
    label: 'Personal Gmail',
    authType: 'oauth',
    credentialsBlob: { mode: 'plaintext-base64', ciphertext: 'dGVzdA==' }
  });

  const accounts = await store.listAccounts('user-1');
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].accountId, account.accountId);

  await store.upsertPrefs('user-1', {
    pollingMinutes: 30,
    nextDueAt: '2099-01-01T00:00:00.000Z'
  });
  const prefs = await store.getPrefs('user-1');
  assert.equal(prefs.pollingMinutes, 30);

  await store.putTokenRecord('hash-1', 'ACCESS', {
    userId: 'user-1',
    clientId: 'email-reader-alexa',
    scope: 'profile',
    expiresAt: '2099-01-01T00:00:00.000Z'
  });

  const token = await store.getTokenRecord('hash-1', 'ACCESS');
  assert.equal(token.userId, 'user-1');

  try {
    await fs.rm(dbPath, { force: true });
  } catch (_error) {
    // Ignore cleanup issues in test environments that keep file handles open briefly.
  }
});
