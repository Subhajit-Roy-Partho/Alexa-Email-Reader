'use strict';

const { clip } = require('../utils/text');

function decodeBase64Url(value) {
    if (!value) {
        return '';
    }
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4;
    const padded = pad ? `${normalized}${'='.repeat(4 - pad)}` : normalized;
    return Buffer.from(padded, 'base64').toString('utf8');
}

function readHeader(headers, name, fallback = '') {
    const lower = String(name).toLowerCase();
    const hit = (headers || []).find((header) => String(header.name || '').toLowerCase() === lower);
    return hit?.value || fallback;
}

function findPlainText(payload) {
    if (!payload) {
        return '';
    }
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
        return decodeBase64Url(payload.body.data);
    }
    for (const part of payload.parts || []) {
        const content = findPlainText(part);
        if (content) {
            return content;
        }
    }
    return '';
}

async function fetchJson(url, accessToken) {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Gmail API ${response.status}: ${message}`);
    }
    return response.json();
}

async function getAccessToken(account, context) {
    if (context?.resolveAccessToken) {
        return context.resolveAccessToken(account);
    }
    const token = account.credentials?.accessToken;
    if (!token) {
        throw new Error('Missing Gmail access token');
    }
    return token;
}

async function getUnreadCount(account, context = {}) {
    const token = await getAccessToken(account, context);
    const result = await fetchJson(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=1&labelIds=INBOX',
        token
    );
    return Number(result.resultSizeEstimate || 0);
}

async function getRecentMessages(account, limit = 10, context = {}) {
    const token = await getAccessToken(account, context);
    const list = await fetchJson(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=${limit}`,
        token
    );

    const messages = [];
    for (const item of list.messages || []) {
        const details = await fetchJson(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`,
            token
        );
        const payload = details.payload || {};
        const bodyText = findPlainText(payload) || details.snippet || '';
        const headers = payload.headers || [];

        messages.push({
            id: item.id,
            from: readHeader(headers, 'From', 'Unknown sender'),
            subject: readHeader(headers, 'Subject', '(No subject)'),
            snippet: clip(details.snippet || bodyText, 180),
            bodyText: clip(bodyText, 8000),
            receivedAt: new Date(readHeader(headers, 'Date', new Date().toISOString())).toISOString(),
            isUnread: (details.labelIds || []).includes('UNREAD')
        });
    }

    return messages;
}

module.exports = {
    provider: 'gmail',
    getUnreadCount,
    getRecentMessages
};
