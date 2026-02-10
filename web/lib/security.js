const crypto = require('crypto');
const AWS = require('aws-sdk');
const config = require('./config');

const kms = new AWS.KMS({ region: config.awsRegion });

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function unbase64url(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function signHmac(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createSignedValue(payloadObject, secret) {
  const payload = base64url(JSON.stringify(payloadObject));
  const sig = signHmac(payload, secret);
  return `${payload}.${sig}`;
}

function verifySignedValue(value, secret) {
  if (!value || !value.includes('.')) {
    return null;
  }
  const [payload, sig] = value.split('.');
  const expected = signHmac(payload, secret);
  if (sig !== expected) {
    return null;
  }
  try {
    return JSON.parse(unbase64url(payload));
  } catch (_error) {
    return null;
  }
}

function getFallbackKey() {
  if (!config.appEncryptionKey) {
    return null;
  }
  const key = Buffer.from(config.appEncryptionKey, 'base64');
  return key.length === 32 ? key : null;
}

async function encryptJson(payload) {
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');

  if (config.kmsKeyId) {
    const dataKey = await kms.generateDataKey({
      KeyId: config.kmsKeyId,
      KeySpec: 'AES_256'
    }).promise();

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', dataKey.Plaintext, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

    return {
      mode: 'kms-envelope',
      encryptedDataKey: dataKey.CiphertextBlob.toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64')
    };
  }

  const fallbackKey = getFallbackKey();
  if (!fallbackKey) {
    return {
      mode: 'plaintext-base64',
      ciphertext: plaintext.toString('base64')
    };
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', fallbackKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    mode: 'aes-gcm',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function userIdFromEmail(email) {
  return crypto.createHash('sha256').update(normalizeEmail(email)).digest('hex').slice(0, 24);
}

module.exports = {
  hashToken,
  randomToken,
  createSignedValue,
  verifySignedValue,
  encryptJson,
  normalizeEmail,
  userIdFromEmail
};
