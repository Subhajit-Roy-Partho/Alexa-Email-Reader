'use strict';

const { clip, stripHtml } = require('../utils/text');

async function fetchJson(url, accessToken) {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'outlook.body-content-type="text"'
        }
    });
    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Microsoft Graph ${response.status}: ${message}`);
    }
    return response.json();
}

async function getAccessToken(account, context) {
    if (context?.resolveAccessToken) {
        return context.resolveAccessToken(account);
    }
    const token = account.credentials?.accessToken;
    if (!token) {
        throw new Error('Missing Outlook access token');
    }
    return token;
}

async function getUnreadCount(account, context = {}) {
    const token = await getAccessToken(account, context);
    const mailbox = await fetchJson(
        'https://graph.microsoft.com/v1.0/me/mailFolders/Inbox?$select=unreadItemCount',
        token
    );
    return Number(mailbox.unreadItemCount || 0);
}

async function getRecentMessages(account, limit = 10, context = {}) {
    const token = await getAccessToken(account, context);
    const result = await fetchJson(
        `https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages?$top=${limit}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,from,receivedDateTime,isRead,body`,
        token
    );

    return (result.value || []).map((message) => {
        const body = message.body?.content || message.bodyPreview || '';
        const bodyText = stripHtml(body);
        return {
            id: message.id,
            from: message.from?.emailAddress?.name || message.from?.emailAddress?.address || 'Unknown sender',
            subject: message.subject || '(No subject)',
            snippet: clip(message.bodyPreview || bodyText, 180),
            bodyText: clip(bodyText, 8000),
            receivedAt: new Date(message.receivedDateTime || Date.now()).toISOString(),
            isUnread: !message.isRead
        };
    });
}

module.exports = {
    provider: 'outlook',
    getUnreadCount,
    getRecentMessages
};
