'use strict';

const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { documentClient } = require('./dynamoClient');
const turso = require('./tursoClient');
const keys = require('./keyBuilder');

function nowIso() {
    return new Date().toISOString();
}

function parseEntityRow(row) {
    if (!row || typeof row.data !== 'string') {
        return null;
    }
    return JSON.parse(row.data);
}

async function getDynamoItem(pk, sk) {
    const response = await documentClient.get({
        TableName: config.tableName,
        Key: { PK: pk, SK: sk }
    }).promise();
    return response.Item || null;
}

async function putDynamoItem(item) {
    await documentClient.put({
        TableName: config.tableName,
        Item: item
    }).promise();
}

async function getTursoClient() {
    await turso.ensureSchema();
    return turso.getClient();
}

async function getTursoItem(pk, sk) {
    const client = await getTursoClient();
    const result = await client.execute({
        sql: 'SELECT data FROM entities WHERE pk = ? AND sk = ? LIMIT 1',
        args: [pk, sk]
    });
    return parseEntityRow(result.rows?.[0] || null);
}

async function putTursoItem(item) {
    const client = await getTursoClient();
    const createdAt = item.createdAt || nowIso();
    const updatedAt = item.updatedAt || nowIso();

    await client.execute({
        sql: `
            INSERT INTO entities (pk, sk, entity_type, user_id, next_due_at, data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(pk, sk) DO UPDATE SET
                entity_type = excluded.entity_type,
                user_id = excluded.user_id,
                next_due_at = excluded.next_due_at,
                data = excluded.data,
                updated_at = excluded.updated_at
        `,
        args: [
            item.PK,
            item.SK,
            item.entityType || null,
            item.userId || null,
            item.nextDueAt || null,
            JSON.stringify(item),
            createdAt,
            updatedAt
        ]
    });
}

async function queryUserFromTurso(userId, skPrefix) {
    const client = await getTursoClient();
    const result = await client.execute({
        sql: `
            SELECT data
            FROM entities
            WHERE pk = ? AND sk LIKE ?
            ORDER BY sk ASC
        `,
        args: [keys.userPk(userId), `${skPrefix}%`]
    });

    return (result.rows || [])
        .map(parseEntityRow)
        .filter(Boolean);
}

async function getTokenRecordByHash(tokenHash, tokenType) {
    return getTursoItem(keys.tokenPk(tokenHash), tokenType);
}

async function getUserProfile(userId) {
    return getDynamoItem(keys.userPk(userId), keys.profileSk());
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
    await putDynamoItem(merged);
    return merged;
}

async function listAccounts(userId) {
    return queryUserFromTurso(userId, 'ACCOUNT#');
}

async function getAccount(userId, accountId) {
    return getTursoItem(keys.userPk(userId), keys.accountSk(accountId));
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
    await putTursoItem(merged);
    return merged;
}

async function getUserPrefs(userId) {
    return getTursoItem(keys.userPk(userId), keys.prefsSk());
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
    await putTursoItem(merged);
    return merged;
}

async function getMailboxState(userId, accountId) {
    return getDynamoItem(keys.userPk(userId), keys.mailboxSk(accountId));
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
    await putDynamoItem(merged);
    return merged;
}

async function listDueUsers(now = new Date()) {
    const client = await getTursoClient();
    const result = await client.execute({
        sql: `
            SELECT data
            FROM entities
            WHERE entity_type = ? AND next_due_at <= ?
            ORDER BY next_due_at ASC
        `,
        args: ['USER_PREFS', now.toISOString()]
    });

    return (result.rows || [])
        .map(parseEntityRow)
        .filter(Boolean);
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
