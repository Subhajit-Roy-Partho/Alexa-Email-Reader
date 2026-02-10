import { NextResponse } from 'next/server';
import configModule from '@/lib/config';
import tokenStoreModule from '@/lib/tokenStore';

export const runtime = 'nodejs';

const config = configModule;
const {
  validateClient,
  consumeAuthorizationCode,
  issueAccessAndRefreshTokens,
  refreshAccessToken
} = tokenStoreModule;

function parseBasicAuth(header) {
  if (!header || !header.startsWith('Basic ')) {
    return null;
  }
  const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
  const sep = decoded.indexOf(':');
  if (sep === -1) {
    return null;
  }
  return {
    clientId: decoded.slice(0, sep),
    clientSecret: decoded.slice(sep + 1)
  };
}

export async function POST(request) {
  const rawBody = await request.text();
  const body = new URLSearchParams(rawBody);

  const basicAuth = parseBasicAuth(request.headers.get('authorization'));
  const clientId = body.get('client_id') || basicAuth?.clientId || '';
  const clientSecret = body.get('client_secret') || basicAuth?.clientSecret || '';

  if (!validateClient(clientId, clientSecret)) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401 });
  }

  const grantType = body.get('grant_type') || '';

  if (grantType === 'authorization_code') {
    const code = body.get('code') || '';
    const redirectUri = body.get('redirect_uri') || '';
    const record = await consumeAuthorizationCode(code, clientId, redirectUri);
    if (!record) {
      return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
    }

    const token = await issueAccessAndRefreshTokens({
      userId: record.userId,
      clientId,
      scope: record.scope || 'profile'
    });

    return NextResponse.json(token, { status: 200 });
  }

  if (grantType === 'refresh_token') {
    const refreshToken = body.get('refresh_token') || '';
    const token = await refreshAccessToken(refreshToken, clientId);
    if (!token) {
      return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
    }
    return NextResponse.json(token, { status: 200 });
  }

  return NextResponse.json({
    error: 'unsupported_grant_type',
    supported: ['authorization_code', 'refresh_token'],
    clientId: config.alexaClientId
  }, { status: 400 });
}
