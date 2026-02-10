'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const syncService = require('../src/services/syncService');

test('isStateStale identifies missing and outdated state', () => {
    assert.equal(syncService.isStateStale(null), true);
    assert.equal(syncService.isStateStale({}), true);

    const fresh = {
        lastSyncAt: new Date(Date.now() - 30_000).toISOString()
    };
    assert.equal(syncService.isStateStale(fresh), false);

    const old = {
        lastSyncAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    };
    assert.equal(syncService.isStateStale(old), true);
});
