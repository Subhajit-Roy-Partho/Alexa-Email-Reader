'use strict';

const { clip, stripHtml } = require('./text');

function parseHeaders(raw) {
    const headers = {};
    const lines = String(raw || '').split(/\r?\n/);
    let currentKey = null;

    for (const line of lines) {
        if (!line) {
            break;
        }
        if (/^[\t ]/.test(line) && currentKey) {
            headers[currentKey] += ` ${line.trim()}`;
            continue;
        }
        const match = line.match(/^([^:]+):\s*(.*)$/);
        if (!match) {
            continue;
        }
        currentKey = match[1].toLowerCase();
        headers[currentKey] = match[2].trim();
    }

    return headers;
}

function parseRawMessage(raw, fallbackId) {
    const text = String(raw || '');
    const [headerPart, ...bodyParts] = text.split(/\r?\n\r?\n/);
    const body = bodyParts.join('\n\n');
    const headers = parseHeaders(headerPart);
    const subject = headers.subject || '(No subject)';
    const from = headers.from || 'Unknown sender';
    const date = headers.date || new Date().toISOString();
    const bodyText = stripHtml(body);

    return {
        id: headers['message-id'] || fallbackId,
        from,
        subject,
        snippet: clip(bodyText, 180),
        bodyText: clip(bodyText, 8000),
        receivedAt: new Date(date).toISOString(),
        isUnread: true
    };
}

module.exports = {
    parseRawMessage
};
