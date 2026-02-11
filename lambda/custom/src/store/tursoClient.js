'use strict';

const { createClient } = require('@libsql/client');
const { getSecretValue } = require('../security/runtimeSecrets');

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS entities (
  pk TEXT NOT NULL,
  sk TEXT NOT NULL,
  entity_type TEXT,
  user_id TEXT,
  next_due_at TEXT,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (pk, sk)
)
`;

const CREATE_USER_PREFIX_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_entities_user_prefix
ON entities (pk, sk)
`;

const CREATE_DUE_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_entities_due_lookup
ON entities (entity_type, next_due_at)
`;

let clientPromise = null;
let schemaInitPromise = null;

async function createTursoClient() {
    const url = await getSecretValue('TURSO_DATABASE_URL', { required: true });
    const authToken = await getSecretValue('TURSO_AUTH_TOKEN', { required: true });
    return createClient({
        url,
        authToken
    });
}

async function getClient() {
    if (!clientPromise) {
        clientPromise = createTursoClient();
    }
    return clientPromise;
}

async function ensureSchema() {
    if (!schemaInitPromise) {
        schemaInitPromise = (async () => {
            const client = await getClient();
            await client.execute(CREATE_TABLE_SQL);
            await client.execute(CREATE_USER_PREFIX_INDEX_SQL);
            await client.execute(CREATE_DUE_INDEX_SQL);
        })();
    }
    return schemaInitPromise;
}

module.exports = {
    getClient,
    ensureSchema
};
