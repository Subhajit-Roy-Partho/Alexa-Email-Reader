const config = require('./config');
const { randomToken, createSignedValue, verifySignedValue } = require('./security');

const CSRF_TTL_MS = 1000 * 60 * 60 * 12;

function issueCsrfToken() {
  const token = randomToken(24);
  return createSignedValue(
    {
      token,
      iat: Date.now(),
      exp: Date.now() + CSRF_TTL_MS
    },
    config.csrfSecret
  );
}

function readCsrfToken(request, formData) {
  return formData?.get('csrfToken')
    || request.headers.get('x-csrf-token')
    || '';
}

async function assertCsrf(request, formData) {
  const provided = readCsrfToken(request, formData);
  const parsed = verifySignedValue(String(provided || ''), config.csrfSecret);
  if (!parsed?.token || Number(parsed.exp || 0) <= Date.now()) {
    throw new Error('Invalid CSRF token');
  }
}

module.exports = {
  issueCsrfToken,
  readCsrfToken,
  assertCsrf
};
