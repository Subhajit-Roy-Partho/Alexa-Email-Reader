const config = require('./config');
const store = require('./store');
const { hashToken, randomToken } = require('./security');

function expiresIn(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

async function createAuthorizationCode({ userId, clientId, redirectUri, scope }) {
  const code = randomToken(24);
  const codeHash = hashToken(code);
  await store.putTokenRecord(codeHash, 'AUTH_CODE', {
    userId,
    clientId,
    redirectUri,
    scope,
    expiresAt: expiresIn(300),
    consumed: false,
    createdAt: new Date().toISOString()
  });
  return code;
}

async function consumeAuthorizationCode(code, clientId, redirectUri) {
  const hash = hashToken(code);
  const record = await store.getTokenRecord(hash, 'AUTH_CODE');
  if (!record) {
    return null;
  }
  if (record.consumed) {
    return null;
  }
  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    return null;
  }
  if (record.clientId !== clientId || record.redirectUri !== redirectUri) {
    return null;
  }

  await store.putTokenRecord(hash, 'AUTH_CODE', {
    ...record,
    consumed: true,
    consumedAt: new Date().toISOString()
  });

  return record;
}

async function issueAccessAndRefreshTokens({ userId, clientId, scope = 'profile' }) {
  const accessToken = randomToken(32);
  const refreshToken = randomToken(32);

  await store.putTokenRecord(hashToken(accessToken), 'ACCESS', {
    userId,
    clientId,
    scope,
    expiresAt: expiresIn(3600),
    createdAt: new Date().toISOString()
  });

  await store.putTokenRecord(hashToken(refreshToken), 'REFRESH', {
    userId,
    clientId,
    scope,
    expiresAt: expiresIn(60 * 60 * 24 * 90),
    createdAt: new Date().toISOString()
  });

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: refreshToken,
    scope
  };
}

async function refreshAccessToken(refreshToken, clientId) {
  const record = await store.getTokenRecord(hashToken(refreshToken), 'REFRESH');
  if (!record) {
    return null;
  }
  if (record.clientId !== clientId) {
    return null;
  }
  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return issueAccessAndRefreshTokens({
    userId: record.userId,
    clientId,
    scope: record.scope || 'profile'
  });
}

async function revokeToken(token) {
  const hash = hashToken(token);
  const access = await store.getTokenRecord(hash, 'ACCESS');
  const refresh = await store.getTokenRecord(hash, 'REFRESH');

  if (access) {
    await store.putTokenRecord(hash, 'ACCESS', {
      ...access,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      revokedAt: new Date().toISOString()
    });
  }

  if (refresh) {
    await store.putTokenRecord(hash, 'REFRESH', {
      ...refresh,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      revokedAt: new Date().toISOString()
    });
  }

  return true;
}

function validateClient(clientId, clientSecret) {
  return clientId === config.alexaClientId && clientSecret === config.alexaClientSecret;
}

module.exports = {
  createAuthorizationCode,
  consumeAuthorizationCode,
  issueAccessAndRefreshTokens,
  refreshAccessToken,
  revokeToken,
  validateClient
};
