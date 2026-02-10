'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const repository = require('../src/store/repository');
const accountService = require('../src/services/accountService');

test('setPollingInterval enforces 15-minute minimum and allowed buckets', async () => {
    const originalUpsertUserPrefs = repository.upsertUserPrefs;

    try {
        let captured;
        repository.upsertUserPrefs = async (_userId, payload) => {
            captured = payload;
            return { userId: 'user-1', ...payload };
        };

        const minResult = await accountService.setPollingInterval('user-1', '5');
        assert.equal(minResult.pollingMinutes, 15);
        assert.equal(captured.pollingMinutes, 15);

        const roundedResult = await accountService.setPollingInterval('user-1', '47');
        assert.equal(roundedResult.pollingMinutes, 60);

        const exactResult = await accountService.setPollingInterval('user-1', '30');
        assert.equal(exactResult.pollingMinutes, 30);
    } finally {
        repository.upsertUserPrefs = originalUpsertUserPrefs;
    }
});

test('resolveAccount picks named account and falls back to active account', async () => {
    const originalListAccounts = repository.listAccounts;
    const originalGetUserPrefs = repository.getUserPrefs;

    try {
        repository.listAccounts = async () => ([
            { accountId: 'a1', label: 'Personal Gmail', provider: 'gmail', status: 'ACTIVE' },
            { accountId: 'a2', label: 'Work Outlook', provider: 'outlook', status: 'ACTIVE' }
        ]);
        repository.getUserPrefs = async () => ({ activeAccountId: 'a2' });

        const named = await accountService.resolveAccount('user-1', 'personal');
        assert.equal(named.accountId, 'a1');

        const fallback = await accountService.resolveAccount('user-1');
        assert.equal(fallback.accountId, 'a2');
    } finally {
        repository.listAccounts = originalListAccounts;
        repository.getUserPrefs = originalGetUserPrefs;
    }
});
