const { cookies } = require('next/headers');
const config = require('./config');
const { createSignedValue, verifySignedValue } = require('./security');

const SESSION_COOKIE = 'email_reader_session';

function createSessionToken(userId) {
  return createSignedValue(
    {
      userId,
      iat: Date.now(),
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30
    },
    config.sessionSecret
  );
}

function parseSessionToken(token) {
  const payload = verifySignedValue(token, config.sessionSecret);
  if (!payload) {
    return null;
  }
  if (payload.exp <= Date.now()) {
    return null;
  }
  return payload;
}

function setSessionCookie(userId) {
  const token = createSessionToken(userId);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });
}

function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}

function getCurrentSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return parseSessionToken(token);
}

module.exports = {
  SESSION_COOKIE,
  setSessionCookie,
  clearSessionCookie,
  getCurrentSession,
  createSessionToken,
  parseSessionToken
};
