'use strict';

const config = require('../config');
const repository = require('../store/repository');
const { decryptJson } = require('../security/cryptoService');

function normalizeLabel(input) {
    return String(input || '').trim().toLowerCase();
}

async function hydrateAccount(account) {
    if (!account) {
        return null;
    }

    let credentials = account.credentials || null;
    if (!credentials && account.credentialsBlob) {
        credentials = await decryptJson(account.credentialsBlob);
    }

    return {
        ...account,
        provider: String(account.provider || '').toLowerCase(),
        status: account.status || 'ACTIVE',
        credentials
    };
}

async function listAccounts(userId) {
    const accounts = await repository.listAccounts(userId);
    const hydrated = [];
    for (const account of accounts) {
        if ((account.status || 'ACTIVE') === 'DISCONNECTED') {
            continue;
        }
        hydrated.push(await hydrateAccount(account));
    }
    return hydrated;
}

async function listAccountSummaries(userId) {
    const accounts = await listAccounts(userId);
    return accounts.map((account) => ({
        accountId: account.accountId,
        label: account.label,
        provider: account.provider,
        status: account.status,
        lastSyncAt: account.lastSyncAt || null
    }));
}

async function getActiveAccountId(userId) {
    const prefs = await repository.getUserPrefs(userId);
    return prefs?.activeAccountId || null;
}

async function resolveAccount(userId, requestedLabel) {
    const accounts = await listAccounts(userId);
    if (!accounts.length) {
        return null;
    }

    if (requestedLabel) {
        const requested = normalizeLabel(requestedLabel);
        const exact = accounts.find((account) => normalizeLabel(account.label) === requested);
        if (exact) {
            return exact;
        }

        const partial = accounts.find((account) => normalizeLabel(account.label).includes(requested));
        if (partial) {
            return partial;
        }
    }

    const activeAccountId = await getActiveAccountId(userId);
    if (activeAccountId) {
        const active = accounts.find((account) => account.accountId === activeAccountId);
        if (active) {
            return active;
        }
    }

    return accounts[0];
}

async function setActiveAccount(userId, requestedLabel) {
    const account = await resolveAccount(userId, requestedLabel);
    if (!account) {
        return null;
    }

    await repository.upsertUserPrefs(userId, {
        activeAccountId: account.accountId
    });

    return account;
}

function normalizePollingMinutes(inputMinutes) {
    const value = Number.parseInt(inputMinutes, 10);
    if (!Number.isInteger(value)) {
        return null;
    }
    if (value < 15) {
        return 15;
    }
    if ([15, 30, 60].includes(value)) {
        return value;
    }
    if (value <= 45) {
        return 30;
    }
    return 60;
}

function nextDueIso(minutes) {
    return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function setPollingInterval(userId, requestedMinutes) {
    const pollingMinutes = normalizePollingMinutes(requestedMinutes) || config.defaultPollingMinutes;
    return repository.upsertUserPrefs(userId, {
        pollingMinutes,
        nextDueAt: nextDueIso(pollingMinutes)
    });
}

async function captureRuntimeUserContext(userId, context) {
    const profile = {
        locale: context.locale,
        lastSeenAt: new Date().toISOString(),
        notificationPermission: context.notificationPermission || 'UNKNOWN',
        apiEndpoint: context.apiEndpoint || null,
        apiAccessToken: context.apiAccessToken || null
    };

    return repository.upsertUserProfile(userId, profile);
}

async function ensureAccountLimit(userId, incomingAccounts = 0) {
    const existing = await listAccounts(userId);
    return existing.length + incomingAccounts <= config.maxLinkedAccounts;
}

module.exports = {
    listAccounts,
    listAccountSummaries,
    resolveAccount,
    setActiveAccount,
    setPollingInterval,
    captureRuntimeUserContext,
    ensureAccountLimit
};
