import Link from 'next/link';
import { redirect } from 'next/navigation';
import csrfModule from '@/lib/csrf';
import sessionModule from '@/lib/session';

const { issueCsrfToken } = csrfModule;
const { getCurrentSession } = sessionModule;

export default function SignInPage({ searchParams }) {
  const session = getCurrentSession();
  if (session?.userId) {
    redirect('/dashboard');
  }

  const csrfToken = issueCsrfToken();
  const next = typeof searchParams?.next === 'string' ? searchParams.next : '/dashboard';
  const error = typeof searchParams?.error === 'string' ? searchParams.error : '';

  return (
    <section className="auth-shell">
      <div className="auth-card card">
        <p className="eyebrow">Secure Access</p>
        <h1>Sign in to Email Reader</h1>
        <p className="small">Use your email and password to manage mailbox links for Alexa.</p>
        {error ? <p className="notice error">{error}</p> : null}
        <form method="post" action="/api/session/login">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="next" value={next} />
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" placeholder="At least 8 characters" autoComplete="current-password" required minLength={8} />
          <button type="submit" className="btn">Sign in</button>
        </form>
        <p className="small">
          First login with a new email creates your account. Legacy users will set a password on first login.
        </p>
        <p className="small">
          By continuing you agree to the <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.
        </p>
      </div>
      <div className="auth-side card">
        <h2>Mailbox Linking</h2>
        <ul className="clean bullet-list">
          <li>Connect Gmail and Outlook with OAuth from dashboard.</li>
          <li>Add IMAP/POP accounts for custom providers.</li>
          <li>Use Alexa voice commands after linking succeeds.</li>
        </ul>
      </div>
    </section>
  );
}
