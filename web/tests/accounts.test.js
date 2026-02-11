const test = require('node:test');
const assert = require('node:assert/strict');

const accounts = require('../lib/accounts');
const store = require('../lib/store');

test('deleteAccount soft deletes and reassigns active account', async () => {
  const originalList = store.listAccounts;
  const originalGetPrefs = store.getPrefs;
  const originalUpsertAccount = store.upsertAccount;
  const originalUpsertPrefs = store.upsertPrefs;

  let accountUpdate = null;
  let prefsUpdate = null;

  try {
    store.listAccounts = async () => ([
      { accountId: 'a1', status: 'ACTIVE' },
      { accountId: 'a2', status: 'ACTIVE' }
    ]);
    store.getPrefs = async () => ({ activeAccountId: 'a1' });
    store.upsertAccount = async (_userId, payload) => {
      accountUpdate = payload;
      return payload;
    };
    store.upsertPrefs = async (_userId, payload) => {
      prefsUpdate = payload;
      return payload;
    };

    await accounts.deleteAccount('user-1', 'a1');
    assert.equal(accountUpdate.accountId, 'a1');
    assert.equal(accountUpdate.status, 'DISCONNECTED');
    assert.equal(prefsUpdate.activeAccountId, 'a2');
  } finally {
    store.listAccounts = originalList;
    store.getPrefs = originalGetPrefs;
    store.upsertAccount = originalUpsertAccount;
    store.upsertPrefs = originalUpsertPrefs;
  }
});

test('deleteAccount clears active account when deleting last active mailbox', async () => {
  const originalList = store.listAccounts;
  const originalGetPrefs = store.getPrefs;
  const originalUpsertAccount = store.upsertAccount;
  const originalUpsertPrefs = store.upsertPrefs;

  let prefsUpdate = null;

  try {
    store.listAccounts = async () => ([
      { accountId: 'solo', status: 'ACTIVE' }
    ]);
    store.getPrefs = async () => ({ activeAccountId: 'solo' });
    store.upsertAccount = async () => ({});
    store.upsertPrefs = async (_userId, payload) => {
      prefsUpdate = payload;
      return payload;
    };

    await accounts.deleteAccount('user-1', 'solo');
    assert.equal(prefsUpdate.activeAccountId, null);
  } finally {
    store.listAccounts = originalList;
    store.getPrefs = originalGetPrefs;
    store.upsertAccount = originalUpsertAccount;
    store.upsertPrefs = originalUpsertPrefs;
  }
});
