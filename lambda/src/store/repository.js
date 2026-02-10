'use strict';

const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { documentClient } = require('./dynamoClient');
const keys = require('./keyBuilder');

function nowIso() {
    return new Date().toISOString();
}

async function getItem(pk, sk) {
    const response = await documentClient.get({
        TableName: config.tableName,
        Key: { PK: pk, SK: sk }
    }).promise();
    return response.Item || null;
}

async function putItem(item) {
    await documentClient.put({
        TableName: config.tableName,
        Item: item
    }).promise();
}

async function queryByUser(userId, skPrefix) {
    const result = await documentClient.query({
        TableName: config.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
            ':pk': keys.userPk(userId),
            ':prefix': skPrefix
        }
    }).promise();
    return result.Items || [];
}

async function getTokenRecordByHash(tokenHash, tokenType) {
    return getItem(keys.tokenPk(tokenHash), tokenType);
}

async function getUserProfile(userId) {
    return getItem(keys.userPk(userId), keys.profileSk());
}

async function upsertUserProfile(userId, changes) {
    const existing = await getUserProfile(userId);
    const merged = {
        PK: keys.userPk(userId),
        SK: keys.profileSk(),
        entityType: 'USER_PROFILE',
        userId,
        createdAt: existing?.createdAt || nowIso(),
        updatedAt: nowIso(),
        ...existing,
        ...changes
    };
    await putItem(merged);
    return merged;
}

async function listAccounts(userId) {
    return queryByUser(userId, 'ACCOUNT#');
}

async function getAccount(userId, accountId) {
    return getItem(keys.userPk(userId), keys.accountSk(accountId));
}

async function upsertAccount(userId, account) {
    const accountId = account.accountId || uuidv4();
    const existing = await getAccount(userId, accountId);
    const merged = {
        PK: keys.userPk(userId),
        SK: keys.accountSk(accountId),
        entityType: 'LINKED_ACCOUNT',
        userId,
        accountId,
        createdAt: existing?.createdAt || nowIso(),
        updatedAt: nowIso(),
        ...existing,
        ...account,
        accountId
    };
    await putItem(merged);
    return merged;
}

async function getUserPrefs(userId) {
    return getItem(keys.userPk(userId), keys.prefsSk());
}

async function upsertUserPrefs(userId, changes) {
    const existing = await getUserPrefs(userId);
    const merged = {
        PK: keys.userPk(userId),
        SK: keys.prefsSk(),
        entityType: 'USER_PREFS',
        userId,
        createdAt: existing?.createdAt || nowIso(),
        updatedAt: nowIso(),
        pollingMinutes: existing?.pollingMinutes || config.defaultPollingMinutes,
        nextDueAt: existing?.nextDueAt || nowIso(),
        ...existing,
        ...changes
    };
    await putItem(merged);
    return merged;
}

async function getMailboxState(userId, accountId) {
    return getItem(keys.userPk(userId), keys.mailboxSk(accountId));
}

async function upsertMailboxState(userId, accountId, changes) {
    const existing = await getMailboxState(userId, accountId);
    const merged = {
        PK: keys.userPk(userId),
        SK: keys.mailboxSk(accountId),
        entityType: 'MAILBOX_STATE',
        userId,
        accountId,
        createdAt: existing?.createdAt || nowIso(),
        updatedAt: nowIso(),
        messages: existing?.messages || [],
        unreadCount: existing?.unreadCount || 0,
        ...existing,
        ...changes
    };
    await putItem(merged);
    return merged;
}

async function listDueUsers(now = new Date()) {
    const response = await documentClient.scan({
        TableName: config.tableName,
        FilterExpression: 'entityType = :type AND nextDueAt <= :nowIso',
        ExpressionAttributeValues: {
            ':type': 'USER_PREFS',
            ':nowIso': now.toISOString()
        }
    }).promise();
    return response.Items || [];
}

module.exports = {
    getTokenRecordByHash,
    getUserProfile,
    upsertUserProfile,
    listAccounts,
    getAccount,
    upsertAccount,
    getUserPrefs,
    upsertUserPrefs,
    getMailboxState,
    upsertMailboxState,
    listDueUsers
};
