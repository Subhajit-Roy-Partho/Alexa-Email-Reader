'use strict';

function toSafeText(value) {
    return String(value || '')
        .replace(/&/g, 'and')
        .replace(/[<>]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200);
}

function fallbackResponse(details) {
    const suffix = details ? ` Bootstrap error: ${toSafeText(details)}.` : '';
    return {
        version: '1.0',
        response: {
            outputSpeech: {
                type: 'SSML',
                ssml: `<speak>Email Reader is temporarily unavailable.${suffix}</speak>`
            },
            shouldEndSession: true
        }
    };
}

exports.handler = async (event, context, callback) => {
    try {
        const skillHandler = require('./src/skill').handler;
        return skillHandler(event, context, callback);
    } catch (error) {
        console.error('Skill bootstrap failure', error);
        const response = fallbackResponse(error && error.message);
        if (typeof callback === 'function') {
            callback(null, response);
            return;
        }
        return response;
    }
};
