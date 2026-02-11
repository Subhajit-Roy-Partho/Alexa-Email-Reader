const config = require('./config');
const store = require('./store');
const { encryptJson } = require('./security');

function normalizeProvider(provider) {
  return String(provider || '').trim().toLowerCase();
}

function normalizeLabel(label, provider) {
  const trimmed = String(label || '').trim();
  if (trimmed) {
    return trimmed;
  }
  return `${provider} account`;
}

async function assertAccountCapacity(userId) {
  const existing = await store.listAccounts(userId);
  if (existing.filter((item) => item.status !== 'DISCONNECTED').length >= config.maxLinkedAccounts) {
    throw new Error(`Account limit reached (${config.maxLinkedAccounts})`);
  }
}

async function addManualAccount(userId, input) {
  await assertAccountCapacity(userId);
  const provider = normalizeProvider(input.provider);
  const label = normalizeLabel(input.label, provider);

  const credentials = {
    host: input.host,
    port: Number.parseInt(input.port || '', 10) || (provider === 'pop' ? 995 : 993),
    secure: input.secure !== 'false',
    username: input.username,
    password: input.password,
    smtpHost: input.smtpHost || '',
    smtpPort: Number.parseInt(input.smtpPort || '', 10) || 587,
    smtpSecure: input.smtpSecure === 'true'
  };

  const credentialsBlob = await encryptJson(credentials);
  return store.upsertAccount(userId, {
    provider,
    label,
    authType: 'manual',
    credentialsBlob,
    status: 'ACTIVE'
  });
}

async function addOAuthAccount(userId, payload) {
  await assertAccountCapacity(userId);
  const credentialsBlob = await encryptJson({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    expiresAt: payload.expiresAt,
    tokenType: payload.tokenType || 'Bearer'
  });

  return store.upsertAccount(userId, {
    provider: normalizeProvider(payload.provider),
    label: normalizeLabel(payload.label, payload.provider),
    authType: 'oauth',
    credentialsBlob,
    status: 'ACTIVE'
  });
}

async function setDefaultAccount(userId, accountId) {
  const accounts = await store.listAccounts(userId);
  const exists = accounts.some((account) => account.accountId === accountId && account.status !== 'DISCONNECTED');
  if (!exists) {
    throw new Error('Unknown account');
  }
  return store.upsertPrefs(userId, {
    activeAccountId: accountId
  });
}

async function setPollingInterval(userId, pollingMinutes) {
  const value = Number.parseInt(pollingMinutes, 10);
  let normalized = 15;
  if ([15, 30, 60].includes(value)) {
    normalized = value;
  } else if (value > 15 && value <= 45) {
    normalized = 30;
  } else if (value > 45) {
    normalized = 60;
  }

  return store.upsertPrefs(userId, {
    pollingMinutes: normalized,
    nextDueAt: new Date(Date.now() + normalized * 60_000).toISOString()
  });
}

async function deleteAccount(userId, accountId) {
  const targetId = String(accountId || '').trim();
  if (!targetId) {
    throw new Error('Account id is required');
  }

  const accounts = await store.listAccounts(userId);
  const target = accounts.find((account) => account.accountId === targetId && account.status !== 'DISCONNECTED');
  if (!target) {
    throw new Error('Unknown account');
  }

  await store.upsertAccount(userId, {
    accountId: targetId,
    status: 'DISCONNECTED',
    disconnectedAt: new Date().toISOString()
  });

  const prefs = await store.getPrefs(userId);
  if (prefs?.activeAccountId === targetId) {
    const remaining = accounts.filter((account) => account.accountId !== targetId && account.status !== 'DISCONNECTED');
    await store.upsertPrefs(userId, {
      activeAccountId: remaining[0]?.accountId || null
    });
  }
}

module.exports = {
  addManualAccount,
  addOAuthAccount,
  setDefaultAccount,
  setPollingInterval,
  deleteAccount
};
