import './globals.css';
import Link from 'next/link';
import csrfModule from '@/lib/csrf';
import sessionModule from '@/lib/session';

export const metadata = {
  title: 'Email Reader',
  description: 'Account linking and mailbox management for Alexa Email Reader'
};

const { issueCsrfToken } = csrfModule;
const { getCurrentSession } = sessionModule;

export default function RootLayout({ children }) {
  const session = getCurrentSession();
  const csrfToken = issueCsrfToken();

  return (
    <html lang="en">
      <body>
        <header className="site-nav">
          <div className="site-nav-inner">
            <Link href="/" className="brand">Email Reader</Link>
            <nav className="nav-links">
              <Link href="/dashboard" className="nav-link">Dashboard</Link>
              {!session?.userId ? (
                <Link href="/signin" className="nav-link nav-link-cta">Sign in</Link>
              ) : (
                <form method="post" action="/api/session/logout">
                  <input type="hidden" name="csrfToken" value={csrfToken} />
                  <button type="submit" className="btn btn-secondary">Sign out</button>
                </form>
              )}
            </nav>
          </div>
        </header>
        <main className="page-shell">{children}</main>
      </body>
    </html>
  );
}
