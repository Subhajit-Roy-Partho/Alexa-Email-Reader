'use strict';

function fallbackResponse() {
    return {
        version: '1.0',
        response: {
            outputSpeech: {
                type: 'SSML',
                ssml: '<speak>Email Reader is temporarily unavailable. Please try again in a minute.</speak>'
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
        const response = fallbackResponse();
        if (typeof callback === 'function') {
            callback(null, response);
            return;
        }
        return response;
    }
};
