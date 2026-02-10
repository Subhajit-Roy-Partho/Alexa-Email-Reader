const { cookies } = require('next/headers');
const config = require('./config');
const { randomToken, createSignedValue, verifySignedValue } = require('./security');

const CSRF_COOKIE = 'email_reader_csrf';

function issueCsrfToken() {
  const token = randomToken(24);
  const signed = createSignedValue({ token, iat: Date.now() }, config.csrfSecret);
  cookies().set(CSRF_COOKIE, signed, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12
  });
  return token;
}

function readCsrfToken() {
  const raw = cookies().get(CSRF_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  const parsed = verifySignedValue(raw, config.csrfSecret);
  return parsed?.token || null;
}

async function assertCsrf(request, formData) {
  const expected = readCsrfToken();
  const provided = formData?.get('csrfToken')
    || request.headers.get('x-csrf-token')
    || '';

  if (!expected || !provided || expected !== provided) {
    throw new Error('Invalid CSRF token');
  }
}

module.exports = {
  issueCsrfToken,
  readCsrfToken,
  assertCsrf
};
