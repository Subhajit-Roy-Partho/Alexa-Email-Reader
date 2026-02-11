const crypto = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(crypto.scrypt);
const PASSWORD_MIN_LENGTH = 8;

function normalizePassword(input) {
  return String(input || '');
}

function validatePassword(password) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
}

async function deriveHash(password, salt) {
  const keyBuffer = await scryptAsync(password, salt, 64);
  return Buffer.from(keyBuffer).toString('hex');
}

async function hashPassword(password) {
  const normalized = normalizePassword(password);
  validatePassword(normalized);

  const passwordSalt = crypto.randomBytes(16).toString('hex');
  const passwordHash = await deriveHash(normalized, passwordSalt);

  return {
    passwordHash,
    passwordSalt,
    passwordAlgo: 'scrypt-v1'
  };
}

async function verifyPassword(password, hash, salt) {
  const normalized = normalizePassword(password);
  if (!normalized || !hash || !salt) {
    return false;
  }

  const derived = await deriveHash(normalized, salt);
  const derivedBuffer = Buffer.from(derived, 'hex');
  const hashBuffer = Buffer.from(hash, 'hex');

  if (derivedBuffer.length !== hashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedBuffer, hashBuffer);
}

module.exports = {
  PASSWORD_MIN_LENGTH,
  normalizePassword,
  validatePassword,
  hashPassword,
  verifyPassword
};
