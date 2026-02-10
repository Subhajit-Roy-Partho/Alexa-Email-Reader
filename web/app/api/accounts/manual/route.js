import { NextResponse } from 'next/server';
import csrfModule from '@/lib/csrf';
import sessionModule from '@/lib/session';
import accountsModule from '@/lib/accounts';

export const runtime = 'nodejs';

const { assertCsrf } = csrfModule;
const { getCurrentSession } = sessionModule;
const { addManualAccount } = accountsModule;

export async function POST(request) {
  try {
    const session = getCurrentSession();
    if (!session?.userId) {
      return NextResponse.redirect(new URL('/signin?next=/dashboard', request.url));
    }

    const formData = await request.formData();
    await assertCsrf(request, formData);

    await addManualAccount(session.userId, {
      provider: formData.get('provider'),
      label: formData.get('label'),
      host: formData.get('host'),
      port: formData.get('port'),
      username: formData.get('username'),
      password: formData.get('password'),
      secure: 'true',
      smtpHost: formData.get('smtpHost'),
      smtpPort: formData.get('smtpPort'),
      smtpSecure: 'false'
    });

    return NextResponse.redirect(new URL('/dashboard?saved=manual', request.url));
  } catch (error) {
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
