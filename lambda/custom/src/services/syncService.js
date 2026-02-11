'use strict';

const config = require('../config');
const repository = require('../store/repository');
const { getConnector } = require('../connectors');
const oauthRefreshService = require('./oauthRefreshService');

function isSameMessage(a, b) {
    return String(a || '') === String(b || '');
}

async function syncAccount(userId, account) {
    const connector = getConnector(account.provider);
    const previousState = await repository.getMailboxState(userId, account.accountId);
    const context = {
        previousState,
        async resolveAccessToken(currentAccount) {
            return oauthRefreshService.resolveAccessToken(userId, currentAccount);
        }
    };

    const unreadCount = await connector.getUnreadCount(account, context);
    const messages = await connector.getRecentMessages(account, config.maxCachedMessages, context);
    const normalizedMessages = (messages || []).slice(0, config.maxCachedMessages);

    const previousIds = new Set((previousState?.messages || []).map((message) => message.id));
    const newMessages = normalizedMessages.filter((message) => !previousIds.has(message.id));

    const state = {
        unreadCount,
        messages: normalizedMessages,
        lastSyncAt: new Date().toISOString(),
        provider: account.provider
    };

    if (context.snapshot?.seenUids) {
        state.seenUids = context.snapshot.seenUids;
    }

    await repository.upsertMailboxState(userId, account.accountId, state);
    await repository.upsertAccount(userId, {
        accountId: account.accountId,
        provider: account.provider,
        label: account.label,
        authType: account.authType,
        status: account.status || 'ACTIVE',
        lastSyncAt: state.lastSyncAt,
        credentialsBlob: account.credentialsBlob
    });

    return {
        account,
        unreadCount,
        messages: normalizedMessages,
        newMessages
    };
}

function isStateStale(mailboxState) {
    if (!mailboxState?.lastSyncAt) {
        return true;
    }
    const lastSync = new Date(mailboxState.lastSyncAt).getTime();
    if (Number.isNaN(lastSync)) {
        return true;
    }
    return (Date.now() - lastSync) / 60_000 >= config.staleSyncMinutes;
}

async function syncIfStale(userId, account) {
    const mailboxState = await repository.getMailboxState(userId, account.accountId);
    if (!mailboxState || isStateStale(mailboxState)) {
        return syncAccount(userId, account);
    }

    return {
        account,
        unreadCount: mailboxState.unreadCount || 0,
        messages: mailboxState.messages || [],
        newMessages: []
    };
}

async function syncUser(userId, accounts) {
    const results = [];
    for (const account of accounts) {
        try {
            results.push(await syncAccount(userId, account));
        } catch (error) {
            results.push({
                account,
                unreadCount: 0,
                messages: [],
                newMessages: [],
                error: error.message
            });
        }
    }
    return results;
}

async function listDueUsers() {
    const duePrefs = await repository.listDueUsers(new Date());
    return duePrefs.map((prefs) => ({
        userId: prefs.userId,
        pollingMinutes: prefs.pollingMinutes || config.defaultPollingMinutes
    }));
}

async function markUserNextDue(userId, pollingMinutes) {
    await repository.upsertUserPrefs(userId, {
        pollingMinutes,
        nextDueAt: new Date(Date.now() + pollingMinutes * 60_000).toISOString()
    });
}

module.exports = {
    syncAccount,
    syncIfStale,
    syncUser,
    listDueUsers,
    markUserNextDue,
    isStateStale,
    isSameMessage
};
