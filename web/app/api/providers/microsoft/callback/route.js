import { NextResponse } from 'next/server';
import oauthStateModule from '@/lib/oauthState';
import providerOAuthModule from '@/lib/providerOAuth';
import accountsModule from '@/lib/accounts';

export const runtime = 'nodejs';

const { parseProviderState } = oauthStateModule;
const { exchangeMicrosoftCode } = providerOAuthModule;
const { addOAuthAccount } = accountsModule;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code') || '';
    const state = searchParams.get('state') || '';

    const parsed = parseProviderState(state);
    if (!parsed?.userId || parsed.provider !== 'outlook') {
      throw new Error('Invalid state');
    }

    const tokenData = await exchangeMicrosoftCode(code);
    await addOAuthAccount(parsed.userId, tokenData);

    return NextResponse.redirect(new URL('/dashboard?connected=outlook', request.url));
  } catch (error) {
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
