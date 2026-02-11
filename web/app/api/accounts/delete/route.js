import { NextResponse } from 'next/server';
import csrfModule from '@/lib/csrf';
import sessionModule from '@/lib/session';
import accountsModule from '@/lib/accounts';

export const runtime = 'nodejs';

const { assertCsrf } = csrfModule;
const { getCurrentSession } = sessionModule;
const { deleteAccount } = accountsModule;

export async function POST(request) {
  try {
    const session = getCurrentSession();
    if (!session?.userId) {
      return NextResponse.redirect(new URL('/signin?next=/dashboard', request.url));
    }

    const formData = await request.formData();
    await assertCsrf(request, formData);
    await deleteAccount(session.userId, String(formData.get('accountId') || ''));

    return NextResponse.redirect(new URL('/dashboard?saved=delete', request.url));
  } catch (error) {
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
