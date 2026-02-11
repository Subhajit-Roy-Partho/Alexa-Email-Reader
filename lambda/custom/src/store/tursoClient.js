'use strict';

const hrana = require('@libsql/hrana-client');
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

function normalizeTursoUrl(rawUrl) {
    const value = String(rawUrl || '').trim();
    if (!value) {
        throw new Error('TURSO_DATABASE_URL is required');
    }

    if (value.startsWith('libsql://')) {
        return `https://${value.slice('libsql://'.length)}`;
    }

    if (value.startsWith('https://') || value.startsWith('http://') || value.startsWith('wss://') || value.startsWith('ws://')) {
        return value;
    }

    throw new Error(`Unsupported TURSO_DATABASE_URL protocol: ${value}`);
}

function normalizeStatement(statement) {
    if (typeof statement === 'string') {
        return {
            sql: statement,
            args: []
        };
    }

    if (statement && typeof statement.sql === 'string') {
        return {
            sql: statement.sql,
            args: Array.isArray(statement.args) ? statement.args.map((arg) => (arg === undefined ? null : arg)) : []
        };
    }

    throw new Error('Unsupported SQL statement format');
}

function statementReturnsRows(sql) {
    const normalized = String(sql || '').trim().toUpperCase();
    return normalized.startsWith('SELECT') || normalized.startsWith('WITH') || normalized.startsWith('PRAGMA');
}

function createExecuteAdapter(rawClient) {
    return {
        async execute(statement) {
            const normalized = normalizeStatement(statement);
            const sqlInput = normalized.args.length ? [normalized.sql, normalized.args] : normalized.sql;
            const stream = rawClient.openStream();

            try {
                if (statementReturnsRows(normalized.sql)) {
                    const result = await stream.query(sqlInput);
                    return {
                        rows: result.rows || []
                    };
                }

                await stream.run(sqlInput);
                return {
                    rows: []
                };
            } finally {
                if (typeof stream.closeGracefully === 'function') {
                    stream.closeGracefully();
                } else {
                    stream.close();
                }
            }
        }
    };
}

async function createTursoClient() {
    const url = await getSecretValue('TURSO_DATABASE_URL', { required: true });
    const authToken = await getSecretValue('TURSO_AUTH_TOKEN', { required: true });
    const client = hrana.openHttp(normalizeTursoUrl(url), authToken);
    return createExecuteAdapter(client);
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
