'use strict';

const Alexa = require('ask-sdk-core');
const authService = require('./services/authService');
const accountService = require('./services/accountService');
const customHandlers = require('./handlers/customIntentHandlers');
const systemHandlers = require('./handlers/systemHandlers');

const RuntimeContextInterceptor = {
    async process(handlerInput) {
        const accessToken = handlerInput.requestEnvelope.context?.System?.user?.accessToken;
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes() || {};
        let userId = null;

        try {
            userId = await authService.resolveUserIdFromAccessToken(accessToken);
        } catch (error) {
            console.error('Failed to resolve user from access token', error);
            requestAttributes.authDebug = error?.message || 'unknown-auth-error';
        }

        requestAttributes.userId = userId;
        handlerInput.attributesManager.setRequestAttributes(requestAttributes);

        if (!userId) {
            return;
        }

        const context = handlerInput.requestEnvelope.context?.System || {};
        const permissionScopes = context.user?.permissions?.scopes || {};
        const notificationPermission = permissionScopes['alexa::devices:all:notifications:write']?.status || 'UNKNOWN';

        try {
            await accountService.captureRuntimeUserContext(userId, {
                locale: handlerInput.requestEnvelope.request?.locale,
                notificationPermission,
                apiEndpoint: context.apiEndpoint,
                apiAccessToken: context.apiAccessToken
            });
        } catch (error) {
            console.error('Failed to capture runtime user context', error);
        }
    }
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestInterceptors(RuntimeContextInterceptor)
    .addRequestHandlers(
        systemHandlers.LaunchRequestHandler,
        customHandlers.GetUnreadCountIntentHandler,
        customHandlers.ReadLatestEmailsIntentHandler,
        customHandlers.ReadEmailBodyIntentHandler,
        customHandlers.ListLinkedAccountsIntentHandler,
        customHandlers.SwitchAccountIntentHandler,
        customHandlers.SetPollingIntervalIntentHandler,
        systemHandlers.AccountLinkingHelpIntentHandler,
        systemHandlers.HelpIntentHandler,
        systemHandlers.CancelAndStopIntentHandler,
        systemHandlers.FallbackIntentHandler,
        systemHandlers.SessionEndedRequestHandler,
        systemHandlers.IntentReflectorHandler
    )
    .addErrorHandlers(systemHandlers.ErrorHandler)
    .withCustomUserAgent('email-reader/v1.0')
    .lambda();
