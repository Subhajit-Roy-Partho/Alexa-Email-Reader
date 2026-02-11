import { redirect } from 'next/navigation';
import csrfModule from '@/lib/csrf';
import sessionModule from '@/lib/session';
import storeModule from '@/lib/store';

const { issueCsrfToken } = csrfModule;
const { getCurrentSession } = sessionModule;
const { listAccounts, getPrefs } = storeModule;

function buildNotice(searchParams) {
  const saved = String(searchParams?.saved || '');
  const error = String(searchParams?.error || '');
  if (error) {
    return { kind: 'error', text: error };
  }

  const successMap = {
    manual: 'Mailbox account added successfully.',
    default: 'Default account updated.',
    polling: 'Polling interval saved.',
    delete: 'Account removed from active mailbox list.'
  };

  if (saved && successMap[saved]) {
    return { kind: 'success', text: successMap[saved] };
  }

  return null;
}

export default async function DashboardPage({ searchParams }) {
  const session = getCurrentSession();
  if (!session?.userId) {
    redirect('/signin?next=/dashboard');
  }

  const [accounts, prefs] = await Promise.all([
    listAccounts(session.userId),
    getPrefs(session.userId)
  ]);

  const csrfToken = issueCsrfToken();
  const notice = buildNotice(searchParams || {});
  const activeAccounts = accounts.filter((account) => account.status !== 'DISCONNECTED');
  const activeAccountId = prefs?.activeAccountId || '';

  return (
    <section className="dashboard-shell">
      <div className="dashboard-header card">
        <div>
          <p className="eyebrow">Account Console</p>
          <h1>Dashboard</h1>
          <p className="small">Signed in as {session.userId}</p>
        </div>
        <form method="post" action="/api/session/logout">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <button type="submit" className="btn btn-secondary">Sign out</button>
        </form>
      </div>

      {notice ? <p className={`notice ${notice.kind}`}>{notice.text}</p> : null}

      <div className="dashboard-grid">
        <section className="card">
          <h2>Connected Accounts</h2>
          {activeAccounts.length ? (
            <ul className="clean account-list">
              {activeAccounts.map((account) => (
                <li key={account.accountId} className="account-item">
                  <div className="account-item-head">
                    <div>
                      <strong>{account.label}</strong>
                      <div className="small">Provider: {account.provider} · Auth: {account.authType}</div>
                    </div>
                    {activeAccountId === account.accountId ? <span className="badge">Default</span> : null}
                  </div>
                  <div className="account-actions">
                    <form method="post" action="/api/accounts/default">
                      <input type="hidden" name="csrfToken" value={csrfToken} />
                      <input type="hidden" name="accountId" value={account.accountId} />
                      <button type="submit" className="btn btn-secondary">Set default</button>
                    </form>
                    <form method="post" action="/api/accounts/delete">
                      <input type="hidden" name="csrfToken" value={csrfToken} />
                      <input type="hidden" name="accountId" value={account.accountId} />
                      <button type="submit" className="btn btn-danger">Delete account</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small">No active mailbox accounts. Add one below to start using Alexa readout features.</p>
          )}

          <h3>OAuth Connect</h3>
          <div className="button-row">
            <a href="/api/providers/google/connect" className="btn">Connect Gmail</a>
            <a href="/api/providers/microsoft/connect" className="btn btn-secondary">Connect Outlook</a>
          </div>
        </section>

        <section className="card">
          <h2>Add IMAP / POP Mailbox</h2>
          <form method="post" action="/api/accounts/manual">
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <label htmlFor="label">Label</label>
            <input id="label" name="label" placeholder="Work Mail" required />

            <label htmlFor="provider">Provider</label>
            <select id="provider" name="provider" defaultValue="imap">
              <option value="imap">IMAP</option>
              <option value="pop">POP</option>
            </select>

            <label htmlFor="host">Host</label>
            <input id="host" name="host" placeholder="imap.example.com" required />

            <label htmlFor="port">Port</label>
            <input id="port" name="port" placeholder="993" required />

            <label htmlFor="username">Username</label>
            <input id="username" name="username" required />

            <label htmlFor="password">Password / App Password</label>
            <input id="password" name="password" type="password" required />

            <label htmlFor="smtpHost">SMTP Host (optional)</label>
            <input id="smtpHost" name="smtpHost" placeholder="smtp.example.com" />

            <label htmlFor="smtpPort">SMTP Port (optional)</label>
            <input id="smtpPort" name="smtpPort" placeholder="587" />

            <button type="submit" className="btn">Add mailbox</button>
          </form>
        </section>

        <section className="card">
          <h2>Polling Interval</h2>
          <form method="post" action="/api/accounts/polling">
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <label htmlFor="pollingMinutes">Check cadence</label>
            <select id="pollingMinutes" name="pollingMinutes" defaultValue={String(prefs?.pollingMinutes || 15)}>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
            </select>
            <button type="submit" className="btn">Save interval</button>
          </form>
          <p className="small">Minimum interval is 15 minutes to keep AWS costs in free-tier-friendly range.</p>
        </section>
      </div>
    </section>
  );
}
