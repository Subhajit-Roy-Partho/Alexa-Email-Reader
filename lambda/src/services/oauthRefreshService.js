'use strict';

const config = require('../config');
const repository = require('../store/repository');
const { encryptJson } = require('../security/cryptoService');
const { getSecretValue } = require('../security/runtimeSecrets');

function isExpiringSoon(expiresAt) {
    if (!expiresAt) {
        return true;
    }
    const expires = new Date(expiresAt).getTime();
    return Number.isNaN(expires) || expires < Date.now() + 60_000;
}

async function getRefreshConfig(provider) {
    if (provider === 'gmail') {
        const clientSecret = config.googleClientSecret || await getSecretValue('GOOGLE_CLIENT_SECRET');
        return {
            tokenUrl: 'https://oauth2.googleapis.com/token',
            clientId: config.googleClientId,
            clientSecret
        };
    }

    if (provider === 'outlook') {
        const clientSecret = config.microsoftClientSecret || await getSecretValue('MICROSOFT_CLIENT_SECRET');
        return {
            tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            clientId: config.microsoftClientId,
            clientSecret
        };
    }

    return null;
}

async function refreshToken(userId, account) {
    const provider = String(account.provider || '').toLowerCase();
    const providerConfig = await getRefreshConfig(provider);
    if (!providerConfig || !providerConfig.clientId || !providerConfig.clientSecret) {
        throw new Error(`Missing OAuth refresh configuration for provider ${provider}`);
    }

    const credentials = account.credentials || {};
    if (!credentials.refreshToken) {
        throw new Error(`Missing refresh token for provider ${provider}`);
    }

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refreshToken,
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret
    });

    const response = await fetch(providerConfig.tokenUrl, {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        },
        body
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Failed to refresh ${provider} token: ${response.status} ${message}`);
    }

    const refreshed = await response.json();
    const nextCredentials = {
        ...credentials,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token || credentials.refreshToken,
        expiresAt: new Date(Date.now() + Number(refreshed.expires_in || 3600) * 1000).toISOString(),
        tokenType: refreshed.token_type || 'Bearer'
    };

    const credentialsBlob = await encryptJson(nextCredentials);
    await repository.upsertAccount(userId, {
        accountId: account.accountId,
        credentialsBlob,
        provider: account.provider,
        label: account.label,
        authType: account.authType,
        status: account.status || 'ACTIVE'
    });

    return nextCredentials.accessToken;
}

async function resolveAccessToken(userId, account) {
    const provider = String(account.provider || '').toLowerCase();
    if (!['gmail', 'outlook'].includes(provider)) {
        return account.credentials?.accessToken || null;
    }

    const credentials = account.credentials || {};
    if (credentials.accessToken && !isExpiringSoon(credentials.expiresAt)) {
        return credentials.accessToken;
    }

    return refreshToken(userId, account);
}

module.exports = {
    resolveAccessToken
};
