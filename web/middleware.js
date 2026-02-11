import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'email_reader_session';

export function middleware(request) {
  if (!request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionCookie) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/signin', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*']
};
