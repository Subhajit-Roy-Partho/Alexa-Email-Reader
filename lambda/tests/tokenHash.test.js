'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { hashToken } = require('../src/utils/tokenHash');

test('hashToken returns stable sha256 hash', () => {
    const first = hashToken('abc123');
    const second = hashToken('abc123');
    const third = hashToken('xyz789');

    assert.equal(first, second);
    assert.notEqual(first, third);
    assert.equal(first.length, 64);
});
