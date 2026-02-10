function userPk(userId) {
  return `USER#${userId}`;
}

function profileSk() {
  return 'PROFILE';
}

function accountSk(accountId) {
  return `ACCOUNT#${accountId}`;
}

function prefsSk() {
  return 'PREFS';
}

function tokenPk(hash) {
  return `TOKEN#${hash}`;
}

module.exports = {
  userPk,
  profileSk,
  accountSk,
  prefsSk,
  tokenPk
};
