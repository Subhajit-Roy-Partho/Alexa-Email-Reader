const test = require('node:test');
const assert = require('node:assert/strict');

const tokenStore = require('../lib/tokenStore');
const store = require('../lib/store');
const security = require('../lib/security');

test('authorization code lifecycle and token issuance', async () => {
  const originalPut = store.putTokenRecord;
  const originalGet = store.getTokenRecord;

  const memory = new Map();

  try {
    store.putTokenRecord = async (hash, type, payload) => {
      memory.set(`${hash}:${type}`, payload);
    };
    store.getTokenRecord = async (hash, type) => memory.get(`${hash}:${type}`) || null;

    const code = await tokenStore.createAuthorizationCode({
      userId: 'user-1',
      clientId: 'email-reader-alexa',
      redirectUri: 'https://layla.amazon.com/api/skill/link/M2',
      scope: 'profile'
    });

    const consumed = await tokenStore.consumeAuthorizationCode(
      code,
      'email-reader-alexa',
      'https://layla.amazon.com/api/skill/link/M2'
    );

    assert.equal(consumed.userId, 'user-1');

    const token = await tokenStore.issueAccessAndRefreshTokens({
      userId: 'user-1',
      clientId: 'email-reader-alexa'
    });

    const accessRecord = await store.getTokenRecord(security.hashToken(token.access_token), 'ACCESS');
    assert.equal(accessRecord.userId, 'user-1');
  } finally {
    store.putTokenRecord = originalPut;
    store.getTokenRecord = originalGet;
  }
});
