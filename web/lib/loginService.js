const store = require('./store');
const { normalizeEmail, userIdFromEmail } = require('./security');
const {
  normalizePassword,
  validatePassword,
  hashPassword,
  verifyPassword
} = require('./userAuth');

function nowIso() {
  return new Date().toISOString();
}

function hasPasswordProfile(profile) {
  return Boolean(profile?.passwordHash && profile?.passwordSalt);
}

async function createPasswordProfile(userId, email, password) {
  const passwordParts = await hashPassword(password);
  return store.upsertUserProfile(userId, {
    email,
    locale: 'en-US',
    authType: 'local-password',
    ...passwordParts,
    passwordUpdatedAt: nowIso()
  });
}

async function authenticateWithPassword(emailInput, passwordInput) {
  const email = normalizeEmail(emailInput);
  if (!email || !email.includes('@')) {
    throw new Error('Valid email is required');
  }

  const password = normalizePassword(passwordInput);
  validatePassword(password);

  const userId = userIdFromEmail(email);
  const existingProfile = await store.getUserProfile(userId);

  if (!existingProfile) {
    await createPasswordProfile(userId, email, password);
    return {
      userId,
      mode: 'created'
    };
  }

  if (!hasPasswordProfile(existingProfile)) {
    await createPasswordProfile(userId, email, password);
    return {
      userId,
      mode: 'migrated'
    };
  }

  const isValidPassword = await verifyPassword(
    password,
    existingProfile.passwordHash,
    existingProfile.passwordSalt
  );

  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  return {
    userId,
    mode: 'authenticated'
  };
}

module.exports = {
  authenticateWithPassword
};
