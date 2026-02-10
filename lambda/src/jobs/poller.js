'use strict';

const accountService = require('../services/accountService');
const syncService = require('../services/syncService');
const notificationService = require('../services/notificationService');

exports.handler = async function pollerHandler() {
    const dueUsers = await syncService.listDueUsers();
    const summary = {
        scannedUsers: dueUsers.length,
        syncedUsers: 0,
        notificationsSent: 0,
        errors: []
    };

    for (const due of dueUsers) {
        try {
            const accounts = await accountService.listAccounts(due.userId);
            if (!accounts.length) {
                await syncService.markUserNextDue(due.userId, due.pollingMinutes);
                continue;
            }

            const syncResults = await syncService.syncUser(due.userId, accounts);
            summary.syncedUsers += 1;

            for (const result of syncResults) {
                if (!result.newMessages?.length) {
                    continue;
                }

                const notification = await notificationService.sendNewMailNotification(
                    due.userId,
                    result.account.label,
                    result.newMessages.length
                );

                if (notification.sent) {
                    summary.notificationsSent += 1;
                }
            }

            await syncService.markUserNextDue(due.userId, due.pollingMinutes);
        } catch (error) {
            summary.errors.push({
                userId: due.userId,
                message: error.message
            });
        }
    }

    return summary;
};
