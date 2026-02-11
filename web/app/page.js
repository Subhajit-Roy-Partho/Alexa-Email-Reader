import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="hero card">
      <p className="eyebrow">Alexa Companion</p>
      <h1>Voice-first email, with secure account control</h1>
      <p className="lead">
        Connect your mailbox accounts, choose defaults, and control polling from one dashboard.
        Alexa can then read unread counts, latest messages, and full email bodies.
      </p>
      <div className="hero-actions">
        <Link href="/signin" className="btn">Sign in to continue</Link>
        <Link href="/dashboard" className="btn btn-secondary">Open dashboard</Link>
      </div>
      <ul className="clean feature-grid">
        <li>
          <h3>Secure login</h3>
          <p>Email + password authentication with hashed credentials.</p>
        </li>
        <li>
          <h3>OAuth providers</h3>
          <p>Link Gmail and Outlook from the dashboard in a few clicks.</p>
        </li>
        <li>
          <h3>Manual protocols</h3>
          <p>Add IMAP or POP accounts using app-password credentials.</p>
        </li>
      </ul>
      <p className="small">
        After linking, return to the Alexa app and finish account linking for the skill.
      </p>
    </section>
  );
}
