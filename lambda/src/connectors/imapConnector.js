'use strict';

const { ImapFlow } = require('imapflow');
const { clip } = require('../utils/text');
const { parseRawMessage } = require('../utils/emailParser');

function getImapConfig(account) {
    const credentials = account.credentials || {};
    if (!credentials.host || !credentials.username || !credentials.password) {
        throw new Error('Missing IMAP settings: host, username and password are required');
    }

    return {
        host: credentials.host,
        port: credentials.port || 993,
        secure: credentials.secure !== false,
        auth: {
            user: credentials.username,
            pass: credentials.password
        }
    };
}

async function withClient(account, fn) {
    const client = new ImapFlow(getImapConfig(account));
    await client.connect();
    try {
        return await fn(client);
    } finally {
        await client.logout();
    }
}

async function getUnreadCount(account) {
    return withClient(account, async (client) => {
        const lock = await client.getMailboxLock('INBOX');
        try {
            const status = await client.status('INBOX', { unseen: true });
            return Number(status.unseen || 0);
        } finally {
            lock.release();
        }
    });
}

async function getRecentMessages(account, limit = 10) {
    return withClient(account, async (client) => {
        const lock = await client.getMailboxLock('INBOX');
        try {
            const mailbox = await client.mailboxOpen('INBOX');
            const exists = mailbox.exists || 0;
            if (!exists) {
                return [];
            }

            const start = Math.max(1, exists - limit + 1);
            const range = `${start}:${exists}`;
            const messages = [];

            for await (const message of client.fetch(range, {
                uid: true,
                source: true,
                envelope: true,
                flags: true,
                internalDate: true
            })) {
                const parsed = parseRawMessage(message.source?.toString('utf8') || '', `imap-${message.uid}`);
                const fromAddress = message.envelope?.from?.[0]?.name
                    || message.envelope?.from?.[0]?.address
                    || parsed.from;
                messages.push({
                    id: `imap-${message.uid}`,
                    from: fromAddress,
                    subject: message.envelope?.subject || parsed.subject || '(No subject)',
                    snippet: clip(parsed.snippet || parsed.bodyText || '', 180),
                    bodyText: parsed.bodyText,
                    receivedAt: new Date(message.internalDate || Date.now()).toISOString(),
                    isUnread: !message.flags?.has('\\Seen')
                });
            }

            return messages.reverse();
        } finally {
            lock.release();
        }
    });
}

module.exports = {
    provider: 'imap',
    getUnreadCount,
    getRecentMessages
};
