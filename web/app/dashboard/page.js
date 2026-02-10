import { redirect } from 'next/navigation';
import csrfModule from '@/lib/csrf';
import sessionModule from '@/lib/session';
import storeModule from '@/lib/store';

const { issueCsrfToken } = csrfModule;
const { getCurrentSession } = sessionModule;
const { listAccounts, getPrefs } = storeModule;

export default async function DashboardPage() {
  const session = getCurrentSession();
  if (!session?.userId) {
    redirect('/signin?next=/dashboard');
  }

  const [accounts, prefs] = await Promise.all([
    listAccounts(session.userId),
    getPrefs(session.userId)
  ]);

  const csrfToken = issueCsrfToken();

  return (
    <section className="row" style={{ alignItems: 'flex-start' }}>
      <div className="card" style={{ flex: 1, minWidth: 280 }}>
        <h2>Connected Accounts</h2>
        <ul className="clean">
          {accounts.length ? accounts.map((account) => (
            <li key={account.accountId} style={{ marginBottom: '0.8rem' }}>
              <strong>{account.label}</strong> ({account.provider})
              <div className="small">Auth: {account.authType}</div>
              <form method="post" action="/api/accounts/default">
                <input type="hidden" name="csrfToken" value={csrfToken} />
                <input type="hidden" name="accountId" value={account.accountId} />
                <button type="submit" className="secondary">Set as default</button>
              </form>
            </li>
          )) : <li>No account connected yet.</li>}
        </ul>

        <h3>OAuth Connect</h3>
        <div className="row">
          <a href="/api/providers/google/connect"><button type="button">Connect Gmail</button></a>
          <a href="/api/providers/microsoft/connect"><button type="button" className="secondary">Connect Outlook</button></a>
        </div>
      </div>

      <div className="card" style={{ flex: 1, minWidth: 280 }}>
        <h2>Add IMAP / POP / SMTP</h2>
        <form method="post" action="/api/accounts/manual">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <label>Label</label>
          <input name="label" placeholder="Work Mail" required />
          <label>Provider</label>
          <select name="provider" defaultValue="imap">
            <option value="imap">IMAP</option>
            <option value="pop">POP</option>
          </select>
          <label>Host</label>
          <input name="host" placeholder="imap.example.com" required />
          <label>Port</label>
          <input name="port" placeholder="993" required />
          <label>Username</label>
          <input name="username" required />
          <label>Password / App Password</label>
          <input name="password" type="password" required />
          <label>SMTP Host (optional)</label>
          <input name="smtpHost" placeholder="smtp.example.com" />
          <label>SMTP Port (optional)</label>
          <input name="smtpPort" placeholder="587" />
          <button type="submit">Add mailbox</button>
        </form>

        <h3>Polling Interval</h3>
        <form method="post" action="/api/accounts/polling">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <select name="pollingMinutes" defaultValue={String(prefs?.pollingMinutes || 15)}>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">60 minutes</option>
          </select>
          <button type="submit">Save interval</button>
        </form>
        <p className="small">Minimum interval is 15 minutes to keep AWS costs in free-tier-friendly range.</p>
      </div>

      <div className="card" style={{ minWidth: 200 }}>
        <h2>Session</h2>
        <p className="small">User: {session.userId}</p>
        <form method="post" action="/api/session/logout">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <button type="submit" className="secondary">Sign out</button>
        </form>
      </div>
    </section>
  );
}
