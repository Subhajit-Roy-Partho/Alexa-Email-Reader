'use strict';

const Alexa = require('ask-sdk-core');
const accountService = require('../services/accountService');
const mailService = require('../services/mailService');
const aiService = require('../services/aiService');

const ORDINAL_MAP = {
    first: 1, '1st': 1, one: 1,
    second: 2, '2nd': 2, two: 2,
    third: 3, '3rd': 3, three: 3,
    fourth: 4, '4th': 4, four: 4,
    fifth: 5, '5th': 5, five: 5,
    sixth: 6, '6th': 6, six: 6,
    seventh: 7, '7th': 7, seven: 7,
    eighth: 8, '8th': 8, eight: 8,
    ninth: 9, '9th': 9, nine: 9,
    tenth: 10, '10th': 10, ten: 10
};

function slotValue(handlerInput, slotName) {
    const slots = handlerInput.requestEnvelope.request.intent?.slots || {};
    return slots[slotName]?.value || '';
}

function resolveEmailIndex(rawValue) {
    if (!rawValue) {
        return 1;
    }
    const lower = String(rawValue).toLowerCase().trim();
    if (ORDINAL_MAP[lower] !== undefined) {
        return ORDINAL_MAP[lower];
    }
    const num = Number.parseInt(rawValue, 10);
    return Number.isInteger(num) && num > 0 ? num : 1;
}

function withLinkedAccount(handlerInput, action) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes() || {};
    const userId = requestAttributes.userId;
    const hasAccessToken = requestAttributes.hasAccessToken === true;
    if (!userId) {
        if (hasAccessToken) {
            return handlerInput.responseBuilder
                .speak('Your account appears linked, but I cannot access mailbox data right now. Please try again shortly.')
                .getResponse();
        }

        return handlerInput.responseBuilder
            .speak('Please link your email account in the Alexa app to continue.')
            .withLinkAccountCard()
            .getResponse();
    }

    return action(userId);
}

// ── GetUnreadCountIntent ──────────────────────────────────────────────────────

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

// ── ReadLatestEmailsIntent ────────────────────────────────────────────────────

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
            sessionAttributes.lastAccountName = accountName;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            const lines = result.messages
                .map((message, idx) => {
                    const unreadMark = message.isUnread ? '' : '(read) ';
                    const cat = message.category ? `[${message.category}] ` : '';
                    return `${idx + 1}. ${cat}${unreadMark}From ${message.from}. Subject: ${message.subject}. ${message.snippet}`;
                })
                .join(' ');

            return handlerInput.responseBuilder
                .speak(`Here are your latest emails in ${result.account.label}. ${lines} Say read email 1 in full to hear any email completely.`)
                .reprompt('Say read email one in full, or ask for unread count.')
                .getResponse();
        });
    }
};

// ── ReadEmailsByCategoryIntent ────────────────────────────────────────────────

const ReadEmailsByCategoryIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ReadEmailsByCategoryIntent';
    },
    async handle(handlerInput) {
        return withLinkedAccount(handlerInput, async (userId) => {
            const accountName = slotValue(handlerInput, 'accountName');
            const categoryRaw = slotValue(handlerInput, 'gmailCategory') || 'primary';
            const category = String(categoryRaw).toLowerCase().trim();

            const result = await mailService.getEmailsByCategory(userId, accountName, category, 5);

            if (!result.account) {
                return handlerInput.responseBuilder
                    .speak('No linked mailbox found. Please add one in the web app first.')
                    .getResponse();
            }

            if (!result.messages.length) {
                return handlerInput.responseBuilder
                    .speak(`I could not find any emails in your ${category} tab.`)
                    .reprompt('Try asking for your latest emails or a different category.')
                    .getResponse();
            }

            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
            sessionAttributes.lastMessages = result.messages;
            sessionAttributes.lastAccountLabel = result.account.label;
            sessionAttributes.lastAccountName = accountName;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            const lines = result.messages
                .map((msg, idx) => {
                    const unreadMark = msg.isUnread ? '(unread) ' : '';
                    return `${idx + 1}. ${unreadMark}From ${msg.from}. Subject: ${msg.subject}.`;
                })
                .join(' ');

            return handlerInput.responseBuilder
                .speak(`Here are emails from your ${category} tab in ${result.account.label}. ${lines} Say read email 1 in full to hear a message completely.`)
                .reprompt('Say read email one, two, or three in full.')
                .getResponse();
        });
    }
};

// ── ReadEmailBodyIntent ───────────────────────────────────────────────────────

const ReadEmailBodyIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ReadEmailBodyIntent';
    },
    async handle(handlerInput) {
        return withLinkedAccount(handlerInput, async (userId) => {
            const accountName = slotValue(handlerInput, 'accountName');
            const rawIndex = slotValue(handlerInput, 'emailIndex') || '1';
            const normalizedIndex = resolveEmailIndex(rawIndex) - 1;

            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes() || {};
            const sessionMessages = Array.isArray(sessionAttributes.lastMessages)
                ? sessionAttributes.lastMessages
                : null;

            let message = null;
            let resolvedAccountName = accountName || sessionAttributes.lastAccountName || '';

            if (sessionMessages?.length && !accountName) {
                message = sessionMessages[normalizedIndex] || null;
            }

            if (!message) {
                const result = await mailService.getEmailByIndex(userId, resolvedAccountName, normalizedIndex + 1);
                if (!result.account) {
                    return handlerInput.responseBuilder
                        .speak('I could not find any linked mailbox.')
                        .getResponse();
                }
                if (!result.message) {
                    return handlerInput.responseBuilder
                        .speak(`I could not find email ${normalizedIndex + 1}. Try asking for latest emails first.`)
                        .reprompt('Say, read my latest emails.')
                        .getResponse();
                }
                message = result.message;
                resolvedAccountName = resolvedAccountName || '';
            }

            // Auto-mark as read after full body is read
            if (message.id && message.isUnread) {
                try {
                    await mailService.markEmailRead(userId, resolvedAccountName, message.id);
                    if (sessionMessages) {
                        const updated = sessionMessages.map((m) =>
                            m.id === message.id ? { ...m, isUnread: false } : m
                        );
                        sessionAttributes.lastMessages = updated;
                        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                    }
                } catch (_err) {
                    // Non-fatal — continue reading
                }
            }

            const speakOutput = `Email ${normalizedIndex + 1} from ${message.from}. Subject: ${message.subject}. ${message.bodyText}`;
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('You can say archive, delete, mark as read, or ask to read another email.')
                .getResponse();
        });
    }
};

// ── EmailActionIntent ─────────────────────────────────────────────────────────

const EmailActionIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'EmailActionIntent';
    },
    async handle(handlerInput) {
        return withLinkedAccount(handlerInput, async (userId) => {
            const rawIndex = slotValue(handlerInput, 'emailIndex') || '1';
            const action = String(slotValue(handlerInput, 'emailAction')).toLowerCase().trim();
            const accountName = slotValue(handlerInput, 'accountName');
            const emailIndex = resolveEmailIndex(rawIndex);

            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes() || {};
            const sessionMessages = Array.isArray(sessionAttributes.lastMessages)
                ? sessionAttributes.lastMessages
                : [];

            let message = sessionMessages[emailIndex - 1] || null;

            if (!message) {
                const result = await mailService.getEmailByIndex(userId, accountName, emailIndex);
                if (!result.message) {
                    return handlerInput.responseBuilder
                        .speak(`I could not find email ${emailIndex}. Try asking for latest emails first.`)
                        .reprompt('Say, read my latest emails.')
                        .getResponse();
                }
                message = result.message;
            }

            if (!message.id) {
                return handlerInput.responseBuilder
                    .speak('That email does not have a valid ID. Please try refreshing your inbox.')
                    .getResponse();
            }

            const resolvedAccountName = accountName || sessionAttributes.lastAccountName || '';
            let resultMsg = '';

            try {
                if (action.includes('archive')) {
                    await mailService.archiveEmail(userId, resolvedAccountName, message.id);
                    resultMsg = `Email ${emailIndex} has been archived.`;
                } else if (action.includes('delete') || action.includes('trash')) {
                    await mailService.deleteEmail(userId, resolvedAccountName, message.id);
                    resultMsg = `Email ${emailIndex} has been moved to trash.`;
                } else if (action.includes('unread')) {
                    await mailService.markEmailUnread(userId, resolvedAccountName, message.id);
                    resultMsg = `Email ${emailIndex} has been marked as unread.`;
                } else if (action.includes('read')) {
                    await mailService.markEmailRead(userId, resolvedAccountName, message.id);
                    resultMsg = `Email ${emailIndex} has been marked as read.`;
                } else {
                    return handlerInput.responseBuilder
                        .speak('I did not understand that action. You can say archive, delete, mark as read, or mark as unread.')
                        .reprompt('What would you like to do with the email?')
                        .getResponse();
                }

                if (sessionMessages.length) {
                    let updated = sessionMessages;
                    if (action.includes('archive') || action.includes('delete') || action.includes('trash')) {
                        updated = sessionMessages.filter((m) => m.id !== message.id);
                    } else if (action.includes('unread')) {
                        updated = sessionMessages.map((m) =>
                            m.id === message.id ? { ...m, isUnread: true } : m
                        );
                    } else if (action.includes('read')) {
                        updated = sessionMessages.map((m) =>
                            m.id === message.id ? { ...m, isUnread: false } : m
                        );
                    }
                    sessionAttributes.lastMessages = updated;
                    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                }
            } catch (err) {
                if (String(err.message).includes('403') || String(err.message).includes('401')) {
                    return handlerInput.responseBuilder
                        .speak('I do not have permission to modify emails. Please re-link your Gmail account with full access in the companion web app.')
                        .getResponse();
                }
                throw err;
            }

            return handlerInput.responseBuilder
                .speak(resultMsg)
                .reprompt('What else can I help you with?')
                .getResponse();
        });
    }
};

// ── ComposeEmailIntent ────────────────────────────────────────────────────────

const ComposeEmailIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ComposeEmailIntent';
    },
    async handle(handlerInput) {
        return withLinkedAccount(handlerInput, async (userId) => {
            const recipient = slotValue(handlerInput, 'recipientName') || slotValue(handlerInput, 'recipientEmail') || '';
            const topic = slotValue(handlerInput, 'emailTopic') || '';

            if (!recipient || !topic) {
                return handlerInput.responseBuilder
                    .speak('Please tell me who to send it to and what the email is about. For example, say: compose email to John about the project update.')
                    .reprompt('Say compose email to someone about a topic.')
                    .getResponse();
            }

            let subject, body;
            try {
                const draft = await aiService.generateEmailDraft(recipient, topic);
                subject = draft.subject;
                body = draft.body;
            } catch (err) {
                return handlerInput.responseBuilder
                    .speak('Sorry, I had trouble generating the email. Please try again.')
                    .reprompt('Try saying compose email again.')
                    .getResponse();
            }

            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
            sessionAttributes.pendingDraft = { to: recipient, subject, body, saved: false };
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            const preview = body.length > 200 ? `${body.slice(0, 200)}…` : body;
            return handlerInput.responseBuilder
                .speak(`I've drafted an email to ${recipient}. Subject: ${subject}. Here is a preview: ${preview}. Say save as draft to save it to Gmail, or send to send it now, or cancel to discard.`)
                .reprompt('Say save as draft, send, or cancel.')
                .getResponse();
        });
    }
};

// ── ReadDraftIntent ───────────────────────────────────────────────────────────

const ReadDraftIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ReadDraftIntent';
    },
    async handle(handlerInput) {
        return withLinkedAccount(handlerInput, async (userId) => {
            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes() || {};
            const draft = sessionAttributes.pendingDraft;

            if (draft) {
                return handlerInput.responseBuilder
                    .speak(`Here is your draft. To: ${draft.to}. Subject: ${draft.subject}. Body: ${draft.body}. Say save as draft, send, or cancel.`)
                    .reprompt('Say save as draft, send, or cancel.')
                    .getResponse();
            }

            const accountName = slotValue(handlerInput, 'accountName');
            const result = await mailService.listEmailDrafts(userId, accountName);
            if (!result.account) {
                return handlerInput.responseBuilder
                    .speak('No linked mailbox found.')
                    .getResponse();
            }

            if (!result.drafts.length) {
                return handlerInput.responseBuilder
                    .speak('You have no saved drafts.')
                    .reprompt('Try composing a new email by saying compose email.')
                    .getResponse();
            }

            const lines = result.drafts
                .map((d, i) => `${i + 1}. To ${d.to || 'unknown'}. Subject: ${d.subject}.`)
                .join(' ');

            sessionAttributes.listedDrafts = result.drafts;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak(`You have ${result.drafts.length} saved draft${result.drafts.length === 1 ? '' : 's'}. ${lines} Say send draft 1 to send any of them.`)
                .reprompt('Say send draft 1, or compose a new email.')
                .getResponse();
        });
    }
};

// ── SaveDraftIntent ───────────────────────────────────────────────────────────

const SaveDraftIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SaveDraftIntent';
    },
    async handle(handlerInput) {
        return withLinkedAccount(handlerInput, async (userId) => {
            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes() || {};
            const draft = sessionAttributes.pendingDraft;

            if (!draft) {
                return handlerInput.responseBuilder
                    .speak('There is no pending draft to save. Say compose email to start a new one.')
                    .reprompt('Say compose email to create a new draft.')
                    .getResponse();
            }

            const accountName = sessionAttributes.lastAccountName || '';
            const result = await mailService.createEmailDraft(userId, accountName, {
                to: draft.to,
                subject: draft.subject,
                body: draft.body
            });

            if (!result.draftId) {
                const reason = result.reason === 'not-supported'
                    ? 'Draft saving is only supported for Gmail accounts.'
                    : 'I could not save the draft right now. Please try again.';
                return handlerInput.responseBuilder.speak(reason).getResponse();
            }

            sessionAttributes.pendingDraft = { ...draft, saved: true, draftId: result.draftId };
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak(`Done. Your draft to ${draft.to} with subject ${draft.subject} has been saved to Gmail. You can open Gmail to review and edit it before sending. Say send draft to send it now, or that is all to finish.`)
                .reprompt('Say send draft to send it, or that is all to finish.')
                .getResponse();
        });
    }
};

// ── SendDraftIntent ───────────────────────────────────────────────────────────

const SendDraftIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SendDraftIntent';
    },
    async handle(handlerInput) {
        return withLinkedAccount(handlerInput, async (userId) => {
            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes() || {};
            const draft = sessionAttributes.pendingDraft;
            const listedDrafts = sessionAttributes.listedDrafts || [];
            const rawIndex = slotValue(handlerInput, 'draftIndex') || '1';
            const draftIndex = resolveEmailIndex(rawIndex) - 1;

            let draftId = null;
            let draftLabel = 'your draft';

            if (draft?.draftId) {
                draftId = draft.draftId;
                draftLabel = `the email to ${draft.to}`;
            } else if (listedDrafts[draftIndex]?.id) {
                draftId = listedDrafts[draftIndex].id;
                draftLabel = `draft ${draftIndex + 1}`;
            }

            if (!draftId) {
                return handlerInput.responseBuilder
                    .speak('No saved draft found. Please compose an email first, or say read drafts to list your saved ones.')
                    .reprompt('Say compose email or read drafts.')
                    .getResponse();
            }

            const accountName = sessionAttributes.lastAccountName || '';
            const result = await mailService.sendEmailDraft(userId, accountName, draftId);

            if (!result.success) {
                return handlerInput.responseBuilder
                    .speak('I could not send the draft. Please check that the recipient email address is valid and try again from Gmail.')
                    .getResponse();
            }

            sessionAttributes.pendingDraft = null;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak(`Done. ${draftLabel} has been sent.`)
                .reprompt('What else can I help you with?')
                .getResponse();
        });
    }
};

// ── ListLinkedAccountsIntent ──────────────────────────────────────────────────

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
                .reprompt('What would you like to do?')
                .getResponse();
        });
    }
};

// ── SwitchAccountIntent ───────────────────────────────────────────────────────

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
                .reprompt('What would you like to do?')
                .getResponse();
        });
    }
};

// ── SetPollingIntervalIntent ──────────────────────────────────────────────────

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
                .reprompt('What would you like to do next?')
                .getResponse();
        });
    }
};

module.exports = {
    GetUnreadCountIntentHandler,
    ReadLatestEmailsIntentHandler,
    ReadEmailsByCategoryIntentHandler,
    ReadEmailBodyIntentHandler,
    EmailActionIntentHandler,
    ComposeEmailIntentHandler,
    ReadDraftIntentHandler,
    SaveDraftIntentHandler,
    SendDraftIntentHandler,
    ListLinkedAccountsIntentHandler,
    SwitchAccountIntentHandler,
    SetPollingIntervalIntentHandler
};
