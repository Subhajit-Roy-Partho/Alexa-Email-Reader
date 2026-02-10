import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="card">
      <h1>Alexa Email Reader Setup</h1>
      <p>
        Link your mailbox accounts here so Alexa can read unread counts, latest messages, and trigger new-mail notifications.
      </p>
      <ul>
        <li>Connect Gmail with OAuth</li>
        <li>Connect Outlook with OAuth</li>
        <li>Add custom IMAP/POP/SMTP credentials</li>
      </ul>
      <p>
        <Link href="/signin">Continue to sign in</Link>
      </p>
      <p className="small">
        After linking, return to the Alexa app and complete account linking for the skill.
      </p>
    </section>
  );
}
