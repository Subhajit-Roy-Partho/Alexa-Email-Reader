'use strict';

const net = require('net');
const tls = require('tls');
const { clip } = require('../utils/text');
const { parseRawMessage } = require('../utils/emailParser');

function parseStat(line) {
    const match = line.match(/^\+OK\s+(\d+)\s+(\d+)/i);
    if (!match) {
        return { count: 0, size: 0 };
    }
    return {
        count: Number(match[1]),
        size: Number(match[2])
    };
}

function undotStuff(data) {
    return data
        .replace(/^\.{2}/gm, '.')
        .replace(/\r\n\.{2}/g, '\r\n.')
        .replace(/\r\n\.\r\n$/, '\r\n');
}

function createResponseReader(socket) {
    let buffer = '';
    const waiters = [];

    function failAll(error) {
        while (waiters.length) {
            waiters.shift().reject(error);
        }
    }

    function tryResolve() {
        if (!waiters.length) {
            return;
        }
        const waiter = waiters[0];

        if (!waiter.multiline) {
            const lineEnd = buffer.indexOf('\r\n');
            if (lineEnd === -1) {
                return;
            }
            const line = buffer.slice(0, lineEnd);
            buffer = buffer.slice(lineEnd + 2);
            waiters.shift().resolve({ line });
            tryResolve();
            return;
        }

        const firstLineEnd = buffer.indexOf('\r\n');
        if (firstLineEnd === -1) {
            return;
        }
        const messageEnd = buffer.indexOf('\r\n.\r\n', firstLineEnd + 2);
        if (messageEnd === -1) {
            return;
        }

        const line = buffer.slice(0, firstLineEnd);
        const body = buffer.slice(firstLineEnd + 2, messageEnd);
        buffer = buffer.slice(messageEnd + 5);
        waiters.shift().resolve({ line, body: undotStuff(body) });
        tryResolve();
    }

    socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        tryResolve();
    });

    socket.on('error', (error) => failAll(error));
    socket.on('close', () => failAll(new Error('POP socket closed')));

    return function read(multiline = false) {
        return new Promise((resolve, reject) => {
            waiters.push({ resolve, reject, multiline });
            tryResolve();
        });
    };
}

function connectPop(credentials) {
    return new Promise((resolve, reject) => {
        const secure = credentials.secure !== false;
        const port = credentials.port || (secure ? 995 : 110);
        const host = credentials.host;

        if (!host || !credentials.username || !credentials.password) {
            reject(new Error('Missing POP settings: host, username and password are required'));
            return;
        }

        const socket = secure
            ? tls.connect(port, host, { rejectUnauthorized: credentials.rejectUnauthorized !== false })
            : net.connect(port, host);

        socket.setTimeout(Number(credentials.timeoutMs || 10000), () => {
            socket.destroy(new Error('POP timeout'));
        });

        socket.once('error', reject);
        socket.once('connect', () => resolve(socket));
    });
}

async function sendCommand(socket, read, command, multiline = false) {
    socket.write(`${command}\r\n`);
    const response = await read(multiline);
    if (!response.line.startsWith('+OK')) {
        throw new Error(`POP command failed (${command}): ${response.line}`);
    }
    return response;
}

async function fetchSnapshot(account, context = {}) {
    if (context.snapshot) {
        return context.snapshot;
    }

    const credentials = account.credentials || {};
    const previousSeen = new Set(context.previousState?.seenUids || []);
    const socket = await connectPop(credentials);
    const read = createResponseReader(socket);

    try {
        const greeting = await read(false);
        if (!greeting.line.startsWith('+OK')) {
            throw new Error(`POP greeting failed: ${greeting.line}`);
        }

        await sendCommand(socket, read, `USER ${credentials.username}`);
        await sendCommand(socket, read, `PASS ${credentials.password}`);

        const stat = await sendCommand(socket, read, 'STAT');
        const { count } = parseStat(stat.line);

        const uidl = await sendCommand(socket, read, 'UIDL', true);
        const uidMap = new Map();
        const uidLines = uidl.body
            .split(/\r\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        for (const line of uidLines) {
            const [indexPart, uid] = line.split(/\s+/);
            const index = Number(indexPart);
            if (Number.isInteger(index) && uid) {
                uidMap.set(index, uid);
            }
        }

        const newestIndexes = [];
        for (let i = Math.max(1, count - 9); i <= count; i += 1) {
            newestIndexes.push(i);
        }
        newestIndexes.reverse();

        const messages = [];
        for (const index of newestIndexes) {
            try {
                const top = await sendCommand(socket, read, `TOP ${index} 40`, true);
                const uid = uidMap.get(index) || `pop-${index}`;
                const parsed = parseRawMessage(top.body, uid);
                parsed.id = uid;
                parsed.isUnread = !previousSeen.has(uid);
                messages.push(parsed);
            } catch (error) {
                const retr = await sendCommand(socket, read, `RETR ${index}`, true);
                const uid = uidMap.get(index) || `pop-${index}`;
                const parsed = parseRawMessage(retr.body, uid);
                parsed.id = uid;
                parsed.isUnread = !previousSeen.has(uid);
                messages.push(parsed);
            }
        }

        const allUids = Array.from(uidMap.values());
        const unreadCount = allUids.filter((uid) => !previousSeen.has(uid)).length;

        context.snapshot = {
            unreadCount,
            messages: messages.slice(0, 10).map((message) => ({
                ...message,
                snippet: clip(message.snippet || message.bodyText, 180),
                bodyText: clip(message.bodyText || '', 8000)
            })),
            seenUids: allUids.slice(-500)
        };

        await sendCommand(socket, read, 'QUIT');
        return context.snapshot;
    } finally {
        socket.end();
    }
}

async function getUnreadCount(account, context = {}) {
    const snapshot = await fetchSnapshot(account, context);
    return snapshot.unreadCount;
}

async function getRecentMessages(account, limit = 10, context = {}) {
    const snapshot = await fetchSnapshot(account, context);
    return snapshot.messages.slice(0, limit);
}

module.exports = {
    provider: 'pop',
    getUnreadCount,
    getRecentMessages,
    fetchSnapshot
};
