const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const { documentClient } = require('./dynamo');
const keys = require('./keys');

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

async function queryUser(userId, prefix) {
  const response = await documentClient.query({
    TableName: config.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: {
      ':pk': keys.userPk(userId),
      ':prefix': prefix
    }
  }).promise();
  return response.Items || [];
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
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
