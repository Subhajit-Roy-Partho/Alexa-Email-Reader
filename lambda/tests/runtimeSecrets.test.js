'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { documentClient } = require('../src/store/dynamoClient');
const runtimeSecrets = require('../src/security/runtimeSecrets');

test('runtime secret loader supports env precedence, cache, ttl expiry, and required failures', async () => {
    const originalGet = documentClient.get;
    const originalEnv = {
        TEST_ENV_ONLY_SECRET: process.env.TEST_ENV_ONLY_SECRET,
        TEST_DDB_SECRET: process.env.TEST_DDB_SECRET,
        ALEXA_SECRET_CACHE_SECONDS: process.env.ALEXA_SECRET_CACHE_SECONDS,
        ALEXA_SECRET_ID_KEY: process.env.ALEXA_SECRET_ID_KEY,
        ALEXA_SECRET_ID: process.env.ALEXA_SECRET_ID
    };

    let getCount = 0;
    const fakeGet = () => ({
        promise: async () => {
            getCount += 1;
            return {
                Item: {
                    secretValues: {
                        TEST_DDB_SECRET: 'ddb-value'
                    }
                }
            };
        }
    });

    try {
        runtimeSecrets.clearSecretCache();
        documentClient.get = fakeGet;

        process.env.TEST_ENV_ONLY_SECRET = 'env-value';
        process.env.ALEXA_SECRET_CACHE_SECONDS = '300';
        const fromEnv = await runtimeSecrets.getSecretValue('TEST_ENV_ONLY_SECRET', { required: true });
        assert.equal(fromEnv, 'env-value');
        assert.equal(getCount, 0);

        delete process.env.TEST_DDB_SECRET;
        runtimeSecrets.clearSecretCache();
        const firstRead = await runtimeSecrets.getSecretValue('TEST_DDB_SECRET', { required: true });
        const secondRead = await runtimeSecrets.getSecretValue('TEST_DDB_SECRET', { required: true });
        assert.equal(firstRead, 'ddb-value');
        assert.equal(secondRead, 'ddb-value');
        assert.equal(getCount, 1);

        process.env.ALEXA_SECRET_CACHE_SECONDS = '0';
        runtimeSecrets.clearSecretCache();
        await runtimeSecrets.getSecretValue('TEST_DDB_SECRET', { required: true });
        await runtimeSecrets.getSecretValue('TEST_DDB_SECRET', { required: true });
        assert.equal(getCount, 3);

        runtimeSecrets.clearSecretCache();
        documentClient.get = () => ({
            promise: async () => ({ Item: { secretValues: {} } })
        });

        await assert.rejects(
            runtimeSecrets.getSecretValue('MISSING_REQUIRED_SECRET', { required: true }),
            /Missing runtime secret: MISSING_REQUIRED_SECRET/
        );

        runtimeSecrets.clearSecretCache();
        documentClient.get = (params) => ({
            promise: async () => {
                if (Object.prototype.hasOwnProperty.call(params.Key, 'PK')) {
                    const error = new Error('wrong key schema');
                    error.code = 'ValidationException';
                    throw error;
                }
                if (params.Key.id === 'SYSTEM#SECRETS#RUNTIME#PRIMARY') {
                    return {
                        Item: {
                            secretValues: {
                                TEST_DDB_SECRET: 'ddb-value-from-id'
                            }
                        }
                    };
                }
                return { Item: null };
            }
        });

        process.env.ALEXA_SECRET_ID_KEY = 'id';
        process.env.ALEXA_SECRET_ID = 'SYSTEM#SECRETS#RUNTIME#PRIMARY';
        const idSchemaValue = await runtimeSecrets.getSecretValue('TEST_DDB_SECRET', { required: true });
        assert.equal(idSchemaValue, 'ddb-value-from-id');
    } finally {
        runtimeSecrets.clearSecretCache();
        documentClient.get = originalGet;

        if (originalEnv.TEST_ENV_ONLY_SECRET === undefined) {
            delete process.env.TEST_ENV_ONLY_SECRET;
        } else {
            process.env.TEST_ENV_ONLY_SECRET = originalEnv.TEST_ENV_ONLY_SECRET;
        }

        if (originalEnv.TEST_DDB_SECRET === undefined) {
            delete process.env.TEST_DDB_SECRET;
        } else {
            process.env.TEST_DDB_SECRET = originalEnv.TEST_DDB_SECRET;
        }

        if (originalEnv.ALEXA_SECRET_CACHE_SECONDS === undefined) {
            delete process.env.ALEXA_SECRET_CACHE_SECONDS;
        } else {
            process.env.ALEXA_SECRET_CACHE_SECONDS = originalEnv.ALEXA_SECRET_CACHE_SECONDS;
        }

        if (originalEnv.ALEXA_SECRET_ID_KEY === undefined) {
            delete process.env.ALEXA_SECRET_ID_KEY;
        } else {
            process.env.ALEXA_SECRET_ID_KEY = originalEnv.ALEXA_SECRET_ID_KEY;
        }

        if (originalEnv.ALEXA_SECRET_ID === undefined) {
            delete process.env.ALEXA_SECRET_ID;
        } else {
            process.env.ALEXA_SECRET_ID = originalEnv.ALEXA_SECRET_ID;
        }
    }
});
