import { NextResponse } from 'next/server';
import tokenStoreModule from '@/lib/tokenStore';

export const runtime = 'nodejs';

const { revokeToken } = tokenStoreModule;

export async function POST(request) {
  const rawBody = await request.text();
  const body = new URLSearchParams(rawBody);
  const token = body.get('token') || '';
  if (!token) {
    return NextResponse.json({ error: 'token_required' }, { status: 400 });
  }

  await revokeToken(token);
  return new NextResponse(null, { status: 200 });
}
