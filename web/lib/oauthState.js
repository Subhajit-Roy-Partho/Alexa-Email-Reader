const config = require('./config');
const { createSignedValue, verifySignedValue } = require('./security');

function createProviderState(payload) {
  return createSignedValue(
    {
      ...payload,
      iat: Date.now(),
      exp: Date.now() + 1000 * 60 * 10
    },
    config.sessionSecret
  );
}

function parseProviderState(state) {
  const payload = verifySignedValue(state, config.sessionSecret);
  if (!payload) {
    return null;
  }
  if (payload.exp <= Date.now()) {
    return null;
  }
  return payload;
}

module.exports = {
  createProviderState,
  parseProviderState
};
