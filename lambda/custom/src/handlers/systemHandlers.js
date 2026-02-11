'use strict';

const Alexa = require('ask-sdk-core');
const mailService = require('../services/mailService');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes() || {};
        const userId = requestAttributes.userId;
        const authDebug = String(requestAttributes.authDebug || '').trim();

        if (!userId) {
            const safeDebug = authDebug
                .replace(/&/g, 'and')
                .replace(/[<>]/g, '')
                .replace(/\s+/g, ' ')
                .slice(0, 160);
            const speakOutput = safeDebug
                ? `Welcome to Email Reader. Account validation failed. ${safeDebug}. Please link your account in the Alexa app to continue.`
                : 'Welcome to Email Reader. Please link your account in the Alexa app to continue.';
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withLinkAccountCard()
                .getResponse();
        }

        try {
            const unread = await mailService.getUnreadCount(userId);
            if (!unread.account) {
                return handlerInput.responseBuilder
                    .speak('Welcome to Email Reader. No mailbox is linked yet. Please connect one in the companion web app.')
                    .reprompt('You can say, how do I link my account?')
                    .getResponse();
            }

            const speakOutput = `Welcome back. ${unread.account.label} has ${unread.unreadCount} unread email${unread.unreadCount === 1 ? '' : 's'}.`;
            return handlerInput.responseBuilder
                .speak(`${speakOutput} You can ask me to read latest emails.`)
                .reprompt('Say, read my latest emails.')
                .getResponse();
        } catch (error) {
            return handlerInput.responseBuilder
                .speak('Welcome to Email Reader. You can ask for unread counts or latest emails.')
                .reprompt('Try saying, how many unread emails do I have?')
                .getResponse();
        }
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can ask how many unread emails you have, read latest emails, read email one in full, switch accounts, or set polling interval to fifteen, thirty, or sixty minutes.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('What would you like to do?')
            .getResponse();
    }
};

const AccountLinkingHelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AccountLinkingHelpIntent';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('Open the Alexa app, go to this skill, and select Link Account. You will be redirected to the web sign in page where you can connect Gmail, Outlook, or custom IMAP and POP mailboxes.')
            .withLinkAccountCard()
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('Goodbye.')
            .getResponse();
    }
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('I did not catch that. You can ask for unread count, latest emails, or help.')
            .reprompt('Try saying, read my latest emails.')
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log('Session ended', JSON.stringify(handlerInput.requestEnvelope));
        return handlerInput.responseBuilder.getResponse();
    }
};

const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        return handlerInput.responseBuilder
            .speak(`You just triggered ${intentName}.`)
            .getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.error('Unhandled error', error);
        return handlerInput.responseBuilder
            .speak('Sorry, I had trouble completing that request. Please try again.')
            .reprompt('Please try again.')
            .getResponse();
    }
};

module.exports = {
    LaunchRequestHandler,
    HelpIntentHandler,
    AccountLinkingHelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler,
    ErrorHandler
};
