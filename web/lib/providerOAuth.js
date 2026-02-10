const config = require('./config');

function getGoogleAuthorizeUrl(state) {
  if (!config.googleClientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
  }
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', config.googleClientId);
  url.searchParams.set('redirect_uri', `${config.appBaseUrl}/api/providers/google/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/gmail.readonly');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return url.toString();
}

async function exchangeGoogleCode(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uri: `${config.appBaseUrl}/api/providers/google/callback`
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status}`);
  }

  const token = await response.json();
  const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });

  if (!profileResponse.ok) {
    throw new Error(`Google profile fetch failed: ${profileResponse.status}`);
  }

  const profile = await profileResponse.json();

  return {
    provider: 'gmail',
    label: profile.emailAddress || 'Gmail',
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
    tokenType: token.token_type || 'Bearer'
  };
}

function getMicrosoftAuthorizeUrl(state) {
  if (!config.microsoftClientId) {
    throw new Error('MICROSOFT_CLIENT_ID is not configured');
  }
  const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  url.searchParams.set('client_id', config.microsoftClientId);
  url.searchParams.set('redirect_uri', `${config.appBaseUrl}/api/providers/microsoft/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('scope', 'offline_access openid profile email Mail.Read');
  url.searchParams.set('state', state);
  return url.toString();
}

async function exchangeMicrosoftCode(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: config.microsoftClientId,
    client_secret: config.microsoftClientSecret,
    redirect_uri: `${config.appBaseUrl}/api/providers/microsoft/callback`
  });

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    throw new Error(`Microsoft token exchange failed: ${response.status}`);
  }

  const token = await response.json();

  const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName', {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });

  if (!profileResponse.ok) {
    throw new Error(`Microsoft profile fetch failed: ${profileResponse.status}`);
  }

  const profile = await profileResponse.json();

  return {
    provider: 'outlook',
    label: profile.mail || profile.userPrincipalName || profile.displayName || 'Outlook',
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
    tokenType: token.token_type || 'Bearer'
  };
}

module.exports = {
  getGoogleAuthorizeUrl,
  exchangeGoogleCode,
  getMicrosoftAuthorizeUrl,
  exchangeMicrosoftCode
};
