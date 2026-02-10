import { NextResponse } from 'next/server';
import csrfModule from '@/lib/csrf';
import sessionModule from '@/lib/session';
import storeModule from '@/lib/store';
import securityModule from '@/lib/security';

export const runtime = 'nodejs';

const { assertCsrf } = csrfModule;
const { setSessionCookie } = sessionModule;
const { upsertUserProfile } = storeModule;
const { normalizeEmail, userIdFromEmail } = securityModule;

export async function POST(request) {
  try {
    const formData = await request.formData();
    await assertCsrf(request, formData);

    const email = normalizeEmail(formData.get('email'));
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const userId = userIdFromEmail(email);
    await upsertUserProfile(userId, {
      email,
      locale: 'en-US'
    });

    setSessionCookie(userId);

    const target = String(formData.get('next') || '/dashboard');
    const redirectUrl = new URL(target.startsWith('/') ? target : '/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
