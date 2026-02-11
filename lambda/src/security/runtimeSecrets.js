'use strict';

const AWS = require('aws-sdk');
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

function collectCandidates(values) {
    const seen = new Set();
    const result = [];

    for (const value of values) {
        const normalized = String(value || '').trim();
        if (!normalized || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        result.push(normalized);
    }

    return result;
}

function getSecretTableNames() {
    return collectCandidates([
        process.env.ALEXA_SECRET_TABLE,
        config.secretTable,
        process.env.EMAIL_READER_TABLE,
        config.tableName,
        getSecretTableName(),
        'EmailReader'
    ]);
}

async function discoverTableNames(client) {
    const discovered = [];
    let exclusiveStartTableName;

    try {
        do {
            const response = await client.listTables({
                ExclusiveStartTableName: exclusiveStartTableName
            }).promise();

            discovered.push(...(response.TableNames || []));
            exclusiveStartTableName = response.LastEvaluatedTableName;
        } while (exclusiveStartTableName);
    } catch (_error) {
        return [];
    }

    return discovered.filter((name) => /email|reader|secret|alexa/i.test(String(name)));
}

function getSecretRegions() {
    return collectCandidates([
        '__default__',
        process.env.ALEXA_SECRET_REGION,
        process.env.EMAIL_READER_AWS_REGION,
        process.env.AWS_REGION,
        'us-east-1',
        'eu-west-1',
        'us-west-2'
    ]);
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

function isResourceNotFoundError(error) {
    const message = String(error?.message || '');
    return error?.code === 'ResourceNotFoundException'
        || /Requested resource not found/i.test(message);
}

function createDocumentClient(region) {
    if (region === '__default__') {
        return documentClient;
    }

    return new AWS.DynamoDB.DocumentClient({
        region,
        convertEmptyValues: true
    });
}

async function loadSecretsFromDynamo() {
    const seedTableNames = getSecretTableNames();
    const regions = getSecretRegions();
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

    for (const region of regions) {
        const client = createDocumentClient(region);
        const discoveredTableNames = await discoverTableNames(client);
        const tableNames = collectCandidates([...seedTableNames, ...discoveredTableNames]);

        for (const tableName of tableNames) {
            let tableMissing = false;

            for (const key of keyCandidates) {
                try {
                    const response = await client.get({
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
                    if (isResourceNotFoundError(error)) {
                        lastError = error;
                        tableMissing = true;
                        break;
                    }
                    lastError = error;
                }
            }

            if (tableMissing) {
                continue;
            }
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
