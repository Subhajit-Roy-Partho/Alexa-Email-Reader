'use strict';

const HOSTED_FALLBACK_APP_ENCRYPTION_KEY = 't0wxiRovu3j91bBkEEjAFq32+wr8RZa5BQ4VPhCGChU=';

function asInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : fallback;
}

module.exports = {
    tableName: process.env.EMAIL_READER_TABLE || 'EmailReader',
    kmsKeyId: process.env.KMS_KEY_ID,
    appEncryptionKey: process.env.APP_ENCRYPTION_KEY || HOSTED_FALLBACK_APP_ENCRYPTION_KEY,
    defaultLocale: process.env.DEFAULT_LOCALE || 'en-US',
    defaultPollingMinutes: asInt(process.env.DEFAULT_POLLING_MINUTES, 15),
    maxLinkedAccounts: asInt(process.env.MAX_LINKED_ACCOUNTS, 3),
    maxCachedMessages: asInt(process.env.MAX_CACHED_MESSAGES, 10),
    staleSyncMinutes: asInt(process.env.STALE_SYNC_MINUTES, 5),
    tokenClientId: process.env.ALEXA_OAUTH_CLIENT_ID || '',
    tokenClientSecret: process.env.ALEXA_OAUTH_CLIENT_SECRET || '',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    microsoftClientId: process.env.MICROSOFT_CLIENT_ID || '',
    microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    notificationsEnabled: process.env.NOTIFICATIONS_ENABLED !== 'false'
};
