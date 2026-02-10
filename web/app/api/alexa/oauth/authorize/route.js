import { NextResponse } from 'next/server';
import configModule from '@/lib/config';
import sessionModule from '@/lib/session';
import tokenStoreModule from '@/lib/tokenStore';

export const runtime = 'nodejs';

const config = configModule;
const { getCurrentSession } = sessionModule;
const { createAuthorizationCode } = tokenStoreModule;

function isAllowedRedirectUri(redirectUri) {
  try {
    const parsed = new URL(redirectUri);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
      return false;
    }
    return parsed.hostname.includes('amazon') || parsed.hostname === 'localhost';
  } catch (_error) {
    return false;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('client_id') || '';
  const redirectUri = searchParams.get('redirect_uri') || '';
  const responseType = searchParams.get('response_type') || '';
  const state = searchParams.get('state') || '';
  const scope = searchParams.get('scope') || 'profile';

  if (clientId !== config.alexaClientId) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 400 });
  }

  if (responseType !== 'code') {
    return NextResponse.json({ error: 'unsupported_response_type' }, { status: 400 });
  }

  if (!isAllowedRedirectUri(redirectUri)) {
    return NextResponse.json({ error: 'invalid_redirect_uri' }, { status: 400 });
  }

  const session = getCurrentSession();
  if (!session?.userId) {
    const next = encodeURIComponent(`${new URL(request.url).pathname}${new URL(request.url).search}`);
    return NextResponse.redirect(new URL(`/signin?next=${next}`, request.url));
  }

  const code = await createAuthorizationCode({
    userId: session.userId,
    clientId,
    redirectUri,
    scope
  });

  const callback = new URL(redirectUri);
  callback.searchParams.set('code', code);
  if (state) {
    callback.searchParams.set('state', state);
  }

  return NextResponse.redirect(callback);
}
