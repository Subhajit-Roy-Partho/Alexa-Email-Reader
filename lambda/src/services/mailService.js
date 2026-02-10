'use strict';

const repository = require('../store/repository');
const accountService = require('./accountService');
const syncService = require('./syncService');

function parseLimit(limit) {
    const parsed = Number.parseInt(limit, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return 3;
    }
    return Math.min(parsed, 10);
}

async function getUnreadCount(userId, accountLabel) {
    const account = await accountService.resolveAccount(userId, accountLabel);
    if (!account) {
        return {
            account: null,
            unreadCount: 0
        };
    }

    const result = await syncService.syncIfStale(userId, account);
    return {
        account,
        unreadCount: result.unreadCount
    };
}

async function getLatestEmails(userId, accountLabel, limit) {
    const account = await accountService.resolveAccount(userId, accountLabel);
    if (!account) {
        return {
            account: null,
            messages: []
        };
    }

    const targetLimit = parseLimit(limit);
    const result = await syncService.syncIfStale(userId, account);
    const messages = (result.messages || []).slice(0, targetLimit);

    return {
        account,
        messages
    };
}

async function getEmailByIndex(userId, accountLabel, index) {
    const account = await accountService.resolveAccount(userId, accountLabel);
    if (!account) {
        return {
            account: null,
            message: null
        };
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

module.exports = {
    getUnreadCount,
    getLatestEmails,
    getEmailByIndex
};
