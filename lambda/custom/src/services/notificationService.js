'use strict';

const config = require('../config');
const repository = require('../store/repository');

async function sendNewMailNotification(userId, accountLabel, newMessageCount) {
    if (!config.notificationsEnabled) {
        return { sent: false, reason: 'disabled' };
    }

    const profile = await repository.getUserProfile(userId);
    if (!profile) {
        return { sent: false, reason: 'missing-profile' };
    }

    if (profile.notificationPermission !== 'GRANTED') {
        return { sent: false, reason: 'permission-not-granted' };
    }

    if (!profile.apiEndpoint || !profile.apiAccessToken) {
        return { sent: false, reason: 'missing-runtime-endpoint' };
    }

    const body = {
        groupingKey: 'email-reader',
        externalId: `${userId}:${accountLabel}:${Date.now()}`,
        expiresAfter: 'PT1H',
        priority: 'HIGH',
        content: {
            locale: profile.locale || config.defaultLocale,
            display: {
                title: 'Email Reader',
                body: `${newMessageCount} new email${newMessageCount > 1 ? 's' : ''} in ${accountLabel}`
            }
        }
    };

    const response = await fetch(`${profile.apiEndpoint}/v1/notifications`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${profile.apiAccessToken}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const message = await response.text();
        return {
            sent: false,
            reason: `notification-api-${response.status}`,
            message
        };
    }

    return { sent: true };
}

module.exports = {
    sendNewMailNotification
};
