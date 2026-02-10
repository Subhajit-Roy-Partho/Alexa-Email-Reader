import { NextResponse } from 'next/server';
import csrfModule from '@/lib/csrf';
import sessionModule from '@/lib/session';

export const runtime = 'nodejs';

const { assertCsrf } = csrfModule;
const { clearSessionCookie } = sessionModule;

export async function POST(request) {
  try {
    const formData = await request.formData();
    await assertCsrf(request, formData);
    clearSessionCookie();
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
