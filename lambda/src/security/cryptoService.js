'use strict';

const crypto = require('crypto');
const AWS = require('aws-sdk');
const config = require('../config');

const kms = new AWS.KMS({ region: process.env.AWS_REGION || 'us-east-1' });

function getFallbackKey() {
    if (!config.appEncryptionKey) {
        return null;
    }
    const key = Buffer.from(config.appEncryptionKey, 'base64');
    return key.length === 32 ? key : null;
}

async function encryptJson(payload) {
    const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');

    if (config.kmsKeyId) {
        const dataKey = await kms.generateDataKey({
            KeyId: config.kmsKeyId,
            KeySpec: 'AES_256'
        }).promise();

        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', dataKey.Plaintext, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const tag = cipher.getAuthTag();

        return {
            mode: 'kms-envelope',
            encryptedDataKey: dataKey.CiphertextBlob.toString('base64'),
            iv: iv.toString('base64'),
            tag: tag.toString('base64'),
            ciphertext: encrypted.toString('base64')
        };
    }

    const fallbackKey = getFallbackKey();
    if (!fallbackKey) {
        return {
            mode: 'plaintext-base64',
            ciphertext: plaintext.toString('base64')
        };
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', fallbackKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
        mode: 'aes-gcm',
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        ciphertext: encrypted.toString('base64')
    };
}

async function decryptJson(blob) {
    if (!blob) {
        return null;
    }
    if (blob.mode === 'plaintext-base64') {
        return JSON.parse(Buffer.from(blob.ciphertext, 'base64').toString('utf8'));
    }

    if (blob.mode === 'kms-envelope') {
        const decrypted = await kms.decrypt({
            CiphertextBlob: Buffer.from(blob.encryptedDataKey, 'base64')
        }).promise();

        const iv = Buffer.from(blob.iv, 'base64');
        const tag = Buffer.from(blob.tag, 'base64');
        const decipher = crypto.createDecipheriv('aes-256-gcm', decrypted.Plaintext, iv);
        decipher.setAuthTag(tag);
        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(blob.ciphertext, 'base64')),
            decipher.final()
        ]);
        return JSON.parse(plaintext.toString('utf8'));
    }

    if (blob.mode === 'aes-gcm') {
        const fallbackKey = getFallbackKey();
        if (!fallbackKey) {
            throw new Error('APP_ENCRYPTION_KEY is required to decrypt aes-gcm payloads');
        }
        const iv = Buffer.from(blob.iv, 'base64');
        const tag = Buffer.from(blob.tag, 'base64');
        const decipher = crypto.createDecipheriv('aes-256-gcm', fallbackKey, iv);
        decipher.setAuthTag(tag);
        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(blob.ciphertext, 'base64')),
            decipher.final()
        ]);
        return JSON.parse(plaintext.toString('utf8'));
    }

    throw new Error(`Unsupported encryption mode: ${blob.mode}`);
}

module.exports = {
    encryptJson,
    decryptJson
};
