import { NextResponse } from 'next/server';
import sessionModule from '@/lib/session';
import oauthStateModule from '@/lib/oauthState';
import providerOAuthModule from '@/lib/providerOAuth';

export const runtime = 'nodejs';

const { getCurrentSession } = sessionModule;
const { createProviderState } = oauthStateModule;
const { getMicrosoftAuthorizeUrl } = providerOAuthModule;

export async function GET(request) {
  const session = getCurrentSession();
  if (!session?.userId) {
    return NextResponse.redirect(new URL('/signin?next=/dashboard', request.url));
  }

  const state = createProviderState({ userId: session.userId, provider: 'outlook' });
  return NextResponse.redirect(getMicrosoftAuthorizeUrl(state));
}
