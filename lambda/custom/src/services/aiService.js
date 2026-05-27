'use strict';

const config = require('../config');
const { getSecretValue } = require('../security/runtimeSecrets');

async function generateEmailDraft(to, topic) {
    const apiKey = config.openRouterApiKey || await getSecretValue('OPENROUTER_API_KEY');
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const systemPrompt = `You are a professional email writer. Write concise, clear emails on behalf of the user.
When given a recipient and topic, produce:
1. A subject line starting with "Subject: "
2. A blank line
3. The email body (plain text, 3-5 sentences, professional tone)
Keep the email brief and to the point. Do not include any meta-commentary.`;

    const userPrompt = `Write an email to ${to} about: ${topic}`;

    const response = await fetch(`${config.openRouterBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://alexamail.vercel.app',
            'X-Title': 'Alexa Email Reader'
        },
        body: JSON.stringify({
            model: config.openRouterModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 400,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const msg = await response.text();
        throw new Error(`OpenRouter API ${response.status}: ${msg}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const subjectMatch = content.match(/^Subject:\s*(.+)$/mi);
    const subject = subjectMatch ? subjectMatch[1].trim() : `About: ${topic}`;

    const bodyLines = content.split('\n');
    const subjectLineIdx = bodyLines.findIndex((l) => /^Subject:/i.test(l));
    const bodyStart = subjectLineIdx >= 0 ? subjectLineIdx + 1 : 0;
    const body = bodyLines.slice(bodyStart).join('\n').trim();

    return { subject, body };
}

module.exports = { generateEmailDraft };
