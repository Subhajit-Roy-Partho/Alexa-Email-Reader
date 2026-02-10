const DEFAULT_BASE_URL = 'http://localhost:3000';

module.exports = {
  tableName: process.env.EMAIL_READER_TABLE || 'EmailReader',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  appBaseUrl: process.env.APP_BASE_URL || DEFAULT_BASE_URL,
  sessionSecret: process.env.SESSION_SECRET || 'change-this-session-secret',
  csrfSecret: process.env.CSRF_SECRET || 'change-this-csrf-secret',
  maxLinkedAccounts: Number.parseInt(process.env.MAX_LINKED_ACCOUNTS || '3', 10),
  appEncryptionKey: process.env.APP_ENCRYPTION_KEY,
  kmsKeyId: process.env.KMS_KEY_ID,
  alexaClientId: process.env.ALEXA_OAUTH_CLIENT_ID || 'email-reader-alexa',
  alexaClientSecret: process.env.ALEXA_OAUTH_CLIENT_SECRET || 'change-this-client-secret',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  microsoftClientId: process.env.MICROSOFT_CLIENT_ID || '',
  microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET || ''
};
