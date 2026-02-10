'use strict';

const gmailConnector = require('./gmailConnector');
const outlookConnector = require('./outlookConnector');
const imapConnector = require('./imapConnector');
const popConnector = require('./popConnector');

const connectors = {
    gmail: gmailConnector,
    outlook: outlookConnector,
    imap: imapConnector,
    pop: popConnector
};

function getConnector(provider) {
    const connector = connectors[String(provider || '').toLowerCase()];
    if (!connector) {
        throw new Error(`Unsupported email provider: ${provider}`);
    }
    return connector;
}

module.exports = {
    getConnector
};
