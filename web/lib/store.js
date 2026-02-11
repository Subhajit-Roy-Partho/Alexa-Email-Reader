const { v4: uuidv4 } = require('uuid');
const turso = require('./turso');
const keys = require('./keys');

function nowIso() {
  return new Date().toISOString();
}

async function getDbClient() {
  await turso.ensureSchema();
  return turso.getClient();
}

function parseRowData(row) {
  if (!row || typeof row.data !== 'string') {
    return null;
  }
  return JSON.parse(row.data);
}

async function getItem(pk, sk) {
  const db = await getDbClient();
  const result = await db.execute({
    sql: 'SELECT data FROM entities WHERE pk = ? AND sk = ? LIMIT 1',
    args: [pk, sk]
  });

  const row = result.rows?.[0] || null;
  return parseRowData(row);
}

async function putItem(item) {
  const db = await getDbClient();
  const createdAt = item.createdAt || nowIso();
  const updatedAt = item.updatedAt || nowIso();

  await db.execute({
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

async function queryUser(userId, prefix) {
  const db = await getDbClient();
  const result = await db.execute({
    sql: `
      SELECT data
      FROM entities
      WHERE pk = ? AND sk LIKE ?
      ORDER BY sk ASC
    `,
    args: [keys.userPk(userId), `${prefix}%`]
  });

  return (result.rows || [])
    .map(parseRowData)
    .filter(Boolean);
}

async function getUserProfile(userId) {
  return getItem(keys.userPk(userId), keys.profileSk());
}

async function upsertUserProfile(userId, changes = {}) {
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
  return queryUser(userId, 'ACCOUNT#');
}

async function getPrefs(userId) {
  return getItem(keys.userPk(userId), keys.prefsSk());
}

async function upsertPrefs(userId, changes = {}) {
  const existing = await getPrefs(userId);
  const merged = {
    PK: keys.userPk(userId),
    SK: keys.prefsSk(),
    entityType: 'USER_PREFS',
    userId,
    pollingMinutes: existing?.pollingMinutes || 15,
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
    ...existing,
    ...changes
  };
  await putItem(merged);
  return merged;
}

async function upsertAccount(userId, account) {
  const accountId = account.accountId || uuidv4();
  const existing = await getItem(keys.userPk(userId), keys.accountSk(accountId));
  const merged = {
    PK: keys.userPk(userId),
    SK: keys.accountSk(accountId),
    entityType: 'LINKED_ACCOUNT',
    userId,
    accountId,
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
    status: 'ACTIVE',
    ...existing,
    ...account,
    accountId
  };
  await putItem(merged);
  return merged;
}

async function getTokenRecord(hash, type) {
  return getItem(keys.tokenPk(hash), type);
}

async function putTokenRecord(hash, type, payload) {
  await putItem({
    PK: keys.tokenPk(hash),
    SK: type,
    entityType: 'OAUTH_TOKEN',
    ...payload
  });
}

module.exports = {
  getUserProfile,
  upsertUserProfile,
  listAccounts,
  getPrefs,
  upsertPrefs,
  upsertAccount,
  getTokenRecord,
  putTokenRecord
};
