'use strict';

const repository = require('../store/repository');
const accountService = require('./accountService');
const syncService = require('./syncService');
const oauthRefreshService = require('./oauthRefreshService');
const { getConnector } = require('../connectors');

function parseLimit(limit) {
    const parsed = Number.parseInt(limit, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return 3;
    }
    return Math.min(parsed, 10);
}

function buildContext(userId, account) {
    return {
        async resolveAccessToken(currentAccount) {
            return oauthRefreshService.resolveAccessToken(userId, currentAccount);
        }
    };
}

async function getUnreadCount(userId, accountLabel) {
    const account = await accountService.resolveAccount(userId, accountLabel);
    if (!account) {
        return { account: null, unreadCount: 0 };
    }

    const result = await syncService.syncIfStale(userId, account);
    return { account, unreadCount: result.unreadCount };
}

async function getLatestEmails(userId, accountLabel, limit) {
    const account = await accountService.resolveAccount(userId, accountLabel);
    if (!account) {
        return { account: null, messages: [] };
    }

    const targetLimit = parseLimit(limit);
    const result = await syncService.syncIfStale(userId, account);
    const messages = (result.messages || []).slice(0, targetLimit);

    return { account, messages };
}

async function getEmailsByCategory(userId, accountLabel, category, limit) {
    const account = await accountService.resolveAccount(userId, accountLabel);
    if (!account) {
        return { account: null, messages: [], category };
    }

    const connector = getConnector(account.provider);
    if (!connector.getMessagesByCategory) {
        const result = await syncService.syncIfStale(userId, account);
        const filtered = (result.messages || []).filter(
            (m) => m.category === String(category).toLowerCase()
        );
        return { account, messages: filtered.slice(0, parseLimit(limit)), category };
    }

    const context = buildContext(userId, account);
    const messages = await connector.getMessagesByCategory(account, category, parseLimit(limit), context);
    return { account, messages, category };
}

async function getEmailByIndex(userId, accountLabel, index) {
    const account = await accountService.resolveAccount(userId, accountLabel);
    if (!account) {
        return { account: null, message: null };
    }

    const mailbox = await repository.getMailboxState(userId, account.accountId);
    const messages = mailbox?.messages || [];
    const idx = Number.parseInt(index, 10);
    const normalizedIndex = Number.isInteger(idx) && idx > 0 ? idx - 1 : 0;

    return {
        account,
        message: messages[normalizedIndex] || null,
        index: normalizedIndex + 1,
        totalMessages: messages.length
    };
}

async function markEmailRead(userId, accountLabel, messageId) {
    const account = await accountService.resolveAccount(userId, accountLabel);
    if (!account) {
        return { success: false, reason: 'no-account' };
    }

    const connector = getConnector(account.provider);
    if (!connector.markMessageAsRead) {
        return { success: false, reason: 'not-supported' };
    }

    const context = buildContext(userId, account);
    await connector.markMessageAsRead(account, messageId, context);

    const mailbox = await repository.getMailboxState(userId, account.accountId);
    if (mailbox?.messages) {
        const updated = mailbox.messages.map((m) =>
            m.id === messageId ? { ...m, isUnread: false } : m
        );
        await repository.upsertMailboxState(userId, account.accountId, { messages: updated });
    }

    return { success: true };
}

async function markEmailUnread(userId, accountLabel, messageId) {
    const account = await accountService.resolveAccount(userId, accountLabel);
    if (!account) {
        return { success: false, reason: 'no-account' };
    }

    const connector = getConnector(account.provider);
    if (!connector.markMessageAsUnread) {
        return { success: false, reason: 'not-supported' };
    }

    const context = buildContext(userId, account);
    await connector.markMessageAsUnread(account, messageId, context);

    const mailbox = await repository.getMailboxState(userId, account.accountId);
    if (mailbox?.messages) {
        const updated = mailbox.messages.map((m) =>
            m.id === messageId ? { ...m, isUnread: true } : m
        );
        await repository.upsertMailboxState(userId, account.accountId, { messages: updated });
    }

    return { success: true };
}

async function archiveEmail(userId, accountLabel, messageId) {
    const account = await accountService.resolveAccount(userId, accountLabel);
    if (!account) {
        return { success: false, reason: 'no-account' };
    }

    const connector = getConnector(account.provider);
    if (!connector.archiveMessage) {
        return { success: false, reason: 'not-supported' };
    }

    const context = buildContext(userId, account);
    await connector.archiveMessage(account, messageId, context);

    const mailbox = await repository.getMailboxState(userId, account.accountId);
    if (mailbox?.messages) {
        const updated = mailbox.messages.filter((m) => m.id !== messageId);
        await repository.upsertMailboxState(userId, account.accountId, { messages: updated });
    }

    return { success: true };
}

async function deleteEmail(userId, accountLabel, messageId) {
    const account = await accountService.resolveAccount(userId, accountLabel);
    if (!account) {
        return { success: false, reason: 'no-account' };
    }

    const connector = getConnector(account.provider);
    if (!connector.trashMessage) {
        return { success: false, reason: 'not-supported' };
    }

    const context = buildContext(userId, account);
    await connector.trashMessage(account, messageId, context);

    const mailbox = await repository.getMailboxState(userId, account.accountId);
    if (mailbox?.messages) {
        const updated = mailbox.messages.filter((m) => m.id !== messageId);
        await repository.upsertMailboxState(userId, account.accountId, { messages: updated });
    }

    return { success: true };
}

async function createEmailDraft(userId, accountLabel, { to, subject, body }) {
    const account = await accountService.resolveAccount(userId, accountLabel);
    if (!account) {
        return { account: null, draftId: null };
    }

    const connector = getConnector(account.provider);
    if (!connector.createDraft) {
        return { account, draftId: null, reason: 'not-supported' };
    }

    const context = buildContext(userId, account);
    const draftId = await connector.createDraft(account, { to, subject, body }, context);
    return { account, draftId };
}

async function sendEmailDraft(userId, accountLabel, draftId) {
    const account = await accountService.resolveAccount(userId, accountLabel);
    if (!account) {
        return { success: false, reason: 'no-account' };
    }

    const connector = getConnector(account.provider);
    if (!connector.sendDraft) {
        return { success: false, reason: 'not-supported' };
    }

    const context = buildContext(userId, account);
    await connector.sendDraft(account, draftId, context);
    return { success: true };
}

async function listEmailDrafts(userId, accountLabel) {
    const account = await accountService.resolveAccount(userId, accountLabel);
    if (!account) {
        return { account: null, drafts: [] };
    }

    const connector = getConnector(account.provider);
    if (!connector.listDrafts) {
        return { account, drafts: [] };
    }

    const context = buildContext(userId, account);
    const drafts = await connector.listDrafts(account, 5, context);
    return { account, drafts };
}

module.exports = {
    getUnreadCount,
    getLatestEmails,
    getEmailsByCategory,
    getEmailByIndex,
    markEmailRead,
    markEmailUnread,
    archiveEmail,
    deleteEmail,
    createEmailDraft,
    sendEmailDraft,
    listEmailDrafts
};
