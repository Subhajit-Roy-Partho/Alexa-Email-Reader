import { NextResponse } from 'next/server';
import csrfModule from '@/lib/csrf';
import sessionModule from '@/lib/session';
import loginServiceModule from '@/lib/loginService';

export const runtime = 'nodejs';

const { assertCsrf } = csrfModule;
const { setSessionCookie } = sessionModule;
const { authenticateWithPassword } = loginServiceModule;

function resolveTarget(rawTarget) {
  const target = String(rawTarget || '/dashboard');
  return target.startsWith('/') ? target : '/dashboard';
}

export async function POST(request) {
  let target = '/dashboard';

  try {
    const formData = await request.formData();
    target = resolveTarget(formData.get('next'));
    await assertCsrf(request, formData);
    const auth = await authenticateWithPassword(
      formData.get('email'),
      formData.get('password')
    );

    const userId = auth.userId;
    setSessionCookie(userId);

    const redirectUrl = new URL(target, request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const failUrl = new URL('/signin', request.url);
    failUrl.searchParams.set('next', target);
    failUrl.searchParams.set('error', String(error.message || 'Sign in failed'));
    return NextResponse.redirect(failUrl);
  }
}
