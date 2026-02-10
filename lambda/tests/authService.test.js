'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const repository = require('../src/store/repository');
const authService = require('../src/services/authService');
const { hashToken } = require('../src/utils/tokenHash');

test('resolveUserIdFromAccessToken returns user id for valid token', async () => {
    const originalGetter = repository.getTokenRecordByHash;

    try {
        repository.getTokenRecordByHash = async (tokenHash, tokenType) => {
            assert.equal(tokenType, 'ACCESS');
            assert.equal(tokenHash, hashToken('valid-token'));
            return {
                userId: 'user-123',
                expiresAt: new Date(Date.now() + 3600_000).toISOString()
            };
        };

        const userId = await authService.resolveUserIdFromAccessToken('valid-token');
        assert.equal(userId, 'user-123');
    } finally {
        repository.getTokenRecordByHash = originalGetter;
    }
});

test('resolveUserIdFromAccessToken returns null for expired token', async () => {
    const originalGetter = repository.getTokenRecordByHash;

    try {
        repository.getTokenRecordByHash = async () => ({
            userId: 'user-123',
            expiresAt: new Date(Date.now() - 1000).toISOString()
        });

        const userId = await authService.resolveUserIdFromAccessToken('expired-token');
        assert.equal(userId, null);
    } finally {
        repository.getTokenRecordByHash = originalGetter;
    }
});
