'use strict';

const { clip } = require('../utils/text');

const CATEGORY_LABEL_MAP = {
    CATEGORY_PERSONAL: 'primary',
    CATEGORY_UPDATES: 'updates',
    CATEGORY_PROMOTIONS: 'promotions',
    CATEGORY_SOCIAL: 'social',
    CATEGORY_FORUMS: 'forums'
};

const CATEGORY_TO_LABEL = {
    primary: 'CATEGORY_PERSONAL',
    updates: 'CATEGORY_UPDATES',
    promotions: 'CATEGORY_PROMOTIONS',
    social: 'CATEGORY_SOCIAL',
    forums: 'CATEGORY_FORUMS'
};

function safeIso(dateStr) {
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

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

function detectCategory(labelIds) {
    for (const labelId of labelIds || []) {
        if (CATEGORY_LABEL_MAP[labelId]) {
            return CATEGORY_LABEL_MAP[labelId];
        }
    }
    return 'primary';
}

function encodeBase64Url(text) {
    return Buffer.from(text).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function buildMimeMessage({ to, subject, body, from }) {
    const lines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8'
    ];
    if (from) {
        lines.unshift(`From: ${from}`);
    }
    lines.push('', body);
    return encodeBase64Url(lines.join('\r\n'));
}

async function fetchJson(url, accessToken, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Gmail API ${response.status}: ${message}`);
    }
    if (response.status === 204) {
        return null;
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
        const labelIds = details.labelIds || [];

        messages.push({
            id: item.id,
            from: readHeader(headers, 'From', 'Unknown sender'),
            subject: readHeader(headers, 'Subject', '(No subject)'),
            snippet: clip(details.snippet || bodyText, 180),
            bodyText: clip(bodyText, 8000),
            receivedAt: safeIso(readHeader(headers, 'Date', '')),
            isUnread: labelIds.includes('UNREAD'),
            category: detectCategory(labelIds)
        });
    }

    return messages;
}

async function getMessagesByCategory(account, category, limit = 10, context = {}) {
    const token = await getAccessToken(account, context);
    const gmailLabel = CATEGORY_TO_LABEL[String(category).toLowerCase()];
    const labelParam = gmailLabel ? `&labelIds=${gmailLabel}&labelIds=INBOX` : '&labelIds=INBOX';

    const list = await fetchJson(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}${labelParam}`,
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
        const labelIds = details.labelIds || [];

        messages.push({
            id: item.id,
            from: readHeader(headers, 'From', 'Unknown sender'),
            subject: readHeader(headers, 'Subject', '(No subject)'),
            snippet: clip(details.snippet || bodyText, 180),
            bodyText: clip(bodyText, 8000),
            receivedAt: safeIso(readHeader(headers, 'Date', '')),
            isUnread: labelIds.includes('UNREAD'),
            category: detectCategory(labelIds)
        });
    }

    return messages;
}

async function markMessageAsRead(account, messageId, context = {}) {
    const token = await getAccessToken(account, context);
    await fetchJson(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        token,
        {
            method: 'POST',
            body: JSON.stringify({ removeLabelIds: ['UNREAD'] })
        }
    );
}

async function markMessageAsUnread(account, messageId, context = {}) {
    const token = await getAccessToken(account, context);
    await fetchJson(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        token,
        {
            method: 'POST',
            body: JSON.stringify({ addLabelIds: ['UNREAD'] })
        }
    );
}

async function archiveMessage(account, messageId, context = {}) {
    const token = await getAccessToken(account, context);
    await fetchJson(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        token,
        {
            method: 'POST',
            body: JSON.stringify({ removeLabelIds: ['INBOX'] })
        }
    );
}

async function trashMessage(account, messageId, context = {}) {
    const token = await getAccessToken(account, context);
    await fetchJson(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
        token,
        { method: 'POST', body: '{}' }
    );
}

async function createDraft(account, { to, subject, body }, context = {}) {
    const token = await getAccessToken(account, context);
    const raw = buildMimeMessage({ to, subject, body });
    const result = await fetchJson(
        'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
        token,
        {
            method: 'POST',
            body: JSON.stringify({ message: { raw } })
        }
    );
    return result?.id || null;
}

async function sendDraft(account, draftId, context = {}) {
    const token = await getAccessToken(account, context);
    await fetchJson(
        'https://gmail.googleapis.com/gmail/v1/users/me/drafts/send',
        token,
        {
            method: 'POST',
            body: JSON.stringify({ id: draftId })
        }
    );
}

async function listDrafts(account, maxResults = 5, context = {}) {
    const token = await getAccessToken(account, context);
    const list = await fetchJson(
        `https://gmail.googleapis.com/gmail/v1/users/me/drafts?maxResults=${maxResults}`,
        token
    );

    const drafts = [];
    for (const item of list.drafts || []) {
        const details = await fetchJson(
            `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=To`,
            token
        );
        const headers = details.message?.payload?.headers || [];
        drafts.push({
            id: item.id,
            subject: readHeader(headers, 'Subject', '(No subject)'),
            to: readHeader(headers, 'To', '')
        });
    }

    return drafts;
}

module.exports = {
    provider: 'gmail',
    getUnreadCount,
    getRecentMessages,
    getMessagesByCategory,
    markMessageAsRead,
    markMessageAsUnread,
    archiveMessage,
    trashMessage,
    createDraft,
    sendDraft,
    listDrafts
};
