'use strict';

const Alexa = require('ask-sdk-core');
const accountService = require('../services/accountService');
const mailService = require('../services/mailService');

function slotValue(handlerInput, slotName) {
    const slots = handlerInput.requestEnvelope.request.intent?.slots || {};
    return slots[slotName]?.value || '';
}

function withLinkedAccount(handlerInput, action) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes() || {};
    const userId = requestAttributes.userId;
    if (!userId) {
        const speakOutput = 'Please link your email account in the Alexa app to continue.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withLinkAccountCard()
            .getResponse();
    }

    return action(userId);
}

const GetUnreadCountIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetUnreadCountIntent';
    },
    async handle(handlerInput) {
        return withLinkedAccount(handlerInput, async (userId) => {
            const accountName = slotValue(handlerInput, 'accountName');
            const result = await mailService.getUnreadCount(userId, accountName);
            if (!result.account) {
                return handlerInput.responseBuilder
                    .speak('I could not find a linked mailbox. Open the companion web app to add one.')
                    .getResponse();
            }

            const speakOutput = `You have ${result.unreadCount} unread email${result.unreadCount === 1 ? '' : 's'} in ${result.account.label}.`;
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('You can ask me to read your latest emails.')
                .getResponse();
        });
    }
};

const ReadLatestEmailsIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ReadLatestEmailsIntent';
    },
    async handle(handlerInput) {
        return withLinkedAccount(handlerInput, async (userId) => {
            const accountName = slotValue(handlerInput, 'accountName');
            const limit = slotValue(handlerInput, 'limit');
            const result = await mailService.getLatestEmails(userId, accountName, limit);

            if (!result.account) {
                return handlerInput.responseBuilder
                    .speak('No linked mailbox found yet. Please add one in the web app first.')
                    .getResponse();
            }

            if (!result.messages.length) {
                return handlerInput.responseBuilder
                    .speak(`I could not find recent emails in ${result.account.label}.`)
                    .getResponse();
            }

            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
            sessionAttributes.lastMessages = result.messages;
            sessionAttributes.lastAccountLabel = result.account.label;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            const lines = result.messages
                .map((message, idx) => `${idx + 1}. From ${message.from}. Subject ${message.subject}. ${message.snippet}`)
                .join(' ');

            return handlerInput.responseBuilder
                .speak(`Here are your latest emails in ${result.account.label}. ${lines} You can say, read email 1 in full.`)
                .reprompt('Say read email one in full, or ask for unread count.')
                .getResponse();
        });
    }
};

const ReadEmailBodyIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ReadEmailBodyIntent';
    },
    async handle(handlerInput) {
        return withLinkedAccount(handlerInput, async (userId) => {
            const accountName = slotValue(handlerInput, 'accountName');
            const emailIndex = slotValue(handlerInput, 'emailIndex') || '1';
            const result = await mailService.getEmailByIndex(userId, accountName, emailIndex);

            if (!result.account) {
                return handlerInput.responseBuilder
                    .speak('I could not find any linked mailbox.')
                    .getResponse();
            }

            if (!result.message) {
                return handlerInput.responseBuilder
                    .speak(`I could not find email ${result.index}. Try asking for latest emails first.`)
                    .reprompt('Say, read my latest emails.')
                    .getResponse();
            }

            const speakOutput = `Email ${result.index} from ${result.message.from}. Subject ${result.message.subject}. ${result.message.bodyText}`;
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        });
    }
};

const ListLinkedAccountsIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ListLinkedAccountsIntent';
    },
    async handle(handlerInput) {
        return withLinkedAccount(handlerInput, async (userId) => {
            const accounts = await accountService.listAccountSummaries(userId);
            if (!accounts.length) {
                return handlerInput.responseBuilder
                    .speak('You have no linked mailboxes. Open the companion web app to connect one.')
                    .getResponse();
            }

            const listing = accounts
                .map((account) => `${account.label} using ${account.provider}`)
                .join(', ');

            return handlerInput.responseBuilder
                .speak(`You have ${accounts.length} linked account${accounts.length === 1 ? '' : 's'}: ${listing}.`)
                .getResponse();
        });
    }
};

const SwitchAccountIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SwitchAccountIntent';
    },
    async handle(handlerInput) {
        return withLinkedAccount(handlerInput, async (userId) => {
            const accountName = slotValue(handlerInput, 'accountName');
            const account = await accountService.setActiveAccount(userId, accountName);
            if (!account) {
                return handlerInput.responseBuilder
                    .speak('I could not find that account. Say, list my linked accounts, to hear valid options.')
                    .reprompt('Say list my linked accounts.')
                    .getResponse();
            }

            return handlerInput.responseBuilder
                .speak(`Done. I will use ${account.label} by default.`)
                .getResponse();
        });
    }
};

const SetPollingIntervalIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetPollingIntervalIntent';
    },
    async handle(handlerInput) {
        return withLinkedAccount(handlerInput, async (userId) => {
            const minutes = slotValue(handlerInput, 'intervalMinutes');
            const prefs = await accountService.setPollingInterval(userId, minutes);
            return handlerInput.responseBuilder
                .speak(`Done. I will check for new mail every ${prefs.pollingMinutes} minutes.`)
                .getResponse();
        });
    }
};

module.exports = {
    GetUnreadCountIntentHandler,
    ReadLatestEmailsIntentHandler,
    ReadEmailBodyIntentHandler,
    ListLinkedAccountsIntentHandler,
    SwitchAccountIntentHandler,
    SetPollingIntervalIntentHandler
};
