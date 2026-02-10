import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Email Reader Sign-In',
  description: 'Account linking and mailbox management for Alexa Email Reader'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="nav">
          <Link href="/">Email Reader</Link>
          <nav className="row">
            <Link href="/signin">Sign in</Link>
            <Link href="/dashboard">Dashboard</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
