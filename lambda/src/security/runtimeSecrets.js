'use strict';

const config = require('../config');
const { documentClient } = require('../store/dynamoClient');

const DEFAULT_CACHE_SECONDS = 300;
const DEFAULT_SECRET_PK = 'SYSTEM#SECRETS';
const DEFAULT_SECRET_SK = 'RUNTIME#PRIMARY';
const DEFAULT_SECRET_ID_KEY = 'id';

let cachedSecrets = null;
let cacheExpiresAt = 0;
let inflightLoad = null;

function nowMs() {
    return Date.now();
}

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function getCacheSeconds() {
    return parsePositiveInt(process.env.ALEXA_SECRET_CACHE_SECONDS, config.secretCacheSeconds || DEFAULT_CACHE_SECONDS);
}

function getSecretTableName() {
    return process.env.ALEXA_SECRET_TABLE
        || config.secretTable
        || process.env.EMAIL_READER_TABLE
        || config.tableName
        || 'EmailReader';
}

function getSecretPk() {
    return process.env.ALEXA_SECRET_PK || config.secretPk || DEFAULT_SECRET_PK;
}

function getSecretSk() {
    return process.env.ALEXA_SECRET_SK || config.secretSk || DEFAULT_SECRET_SK;
}

function getSecretIdKey() {
    const keyName = process.env.ALEXA_SECRET_ID_KEY || config.secretIdKey || DEFAULT_SECRET_ID_KEY;
    return String(keyName || '').trim() || DEFAULT_SECRET_ID_KEY;
}

function getSecretId() {
    const explicit = process.env.ALEXA_SECRET_ID || config.secretId || '';
    if (String(explicit || '').trim()) {
        return String(explicit).trim();
    }
    return `${getSecretPk()}#${getSecretSk()}`;
}

function readEnvValue(key) {
    const raw = process.env[key];
    if (typeof raw !== 'string') {
        return null;
    }
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
}

function toSecretMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }
    const mapped = {};
    for (const [key, entry] of Object.entries(value)) {
        if (entry === null || entry === undefined) {
            continue;
        }
        mapped[key] = String(entry);
    }
    return mapped;
}

async function loadSecretsFromDynamo() {
    const tableName = getSecretTableName();
    const keyCandidates = [
        {
            PK: getSecretPk(),
            SK: getSecretSk()
        },
        {
            [getSecretIdKey()]: getSecretId()
        }
    ];

    let lastError = null;

    for (const key of keyCandidates) {
        try {
            const response = await documentClient.get({
                TableName: tableName,
                Key: key
            }).promise();

            if (response.Item) {
                return toSecretMap(response.Item.secretValues);
            }
        } catch (error) {
            if (error?.code === 'ValidationException') {
                lastError = error;
                continue;
            }
            throw error;
        }
    }

    if (lastError) {
        throw lastError;
    }

    return {};
}

async function getCachedSecretMap() {
    if (cachedSecrets && nowMs() < cacheExpiresAt) {
        return cachedSecrets;
    }

    if (!inflightLoad) {
        inflightLoad = (async () => {
            const loaded = await loadSecretsFromDynamo();
            const ttlSeconds = getCacheSeconds();
            cachedSecrets = loaded;
            cacheExpiresAt = nowMs() + ttlSeconds * 1000;
            return loaded;
        })()
            .finally(() => {
                inflightLoad = null;
            });
    }

    return inflightLoad;
}

async function getSecretValue(key, options = {}) {
    const required = options.required === true;

    const envValue = readEnvValue(key);
    if (envValue !== null) {
        return envValue;
    }

    const secretMap = await getCachedSecretMap();
    const secretValue = typeof secretMap[key] === 'string' ? secretMap[key].trim() : '';
    if (secretValue) {
        return secretValue;
    }

    if (required) {
        throw new Error(`Missing runtime secret: ${key}`);
    }

    return null;
}

function clearSecretCache() {
    cachedSecrets = null;
    cacheExpiresAt = 0;
    inflightLoad = null;
}

module.exports = {
    getSecretValue,
    clearSecretCache
};
