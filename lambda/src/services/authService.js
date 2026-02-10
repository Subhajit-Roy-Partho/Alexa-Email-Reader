'use strict';

const repository = require('../store/repository');
const { hashToken } = require('../utils/tokenHash');

function isExpired(expiresAt) {
    if (!expiresAt) {
        return false;
    }
    return new Date(expiresAt).getTime() <= Date.now();
}

async function resolveUserIdFromAccessToken(accessToken) {
    if (!accessToken) {
        return null;
    }

    const tokenHash = hashToken(accessToken);
    const tokenRecord = await repository.getTokenRecordByHash(tokenHash, 'ACCESS');
    if (!tokenRecord) {
        return null;
    }

    if (isExpired(tokenRecord.expiresAt)) {
        return null;
    }

    return tokenRecord.userId || null;
}

module.exports = {
    resolveUserIdFromAccessToken
};
