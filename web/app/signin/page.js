import Link from 'next/link';
import csrfModule from '@/lib/csrf';

const { issueCsrfToken } = csrfModule;

export default function SignInPage({ searchParams }) {
  const csrfToken = issueCsrfToken();
  const next = typeof searchParams?.next === 'string' ? searchParams.next : '/dashboard';

  return (
    <section className="card">
      <h1>Sign in</h1>
      <p className="small">Use your email identity for mailbox management and Alexa account linking.</p>
      <form method="post" action="/api/session/login">
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <input type="hidden" name="next" value={next} />
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" placeholder="you@example.com" required />
        <button type="submit">Sign in</button>
      </form>
      <p className="small">
        By continuing you agree to the <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.
      </p>
    </section>
  );
}
