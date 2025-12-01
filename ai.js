// ai.js - OpenAI GPT integration for Discord bot
require('dotenv').config();
const fetch = require('node-fetch');

async function askAI(question) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set in .env');
    const url = 'https://api.openai.com/v1/chat/completions';
    const body = {
        model: 'gpt-3.5-turbo',
        messages: [
            { role: 'system', content: 'You are a helpful Discord bot assistant.' },
            { role: 'user', content: question }
        ],
        max_tokens: 256,
        temperature: 0.7
    };
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('OpenAI API error: ' + res.status);
    const data = await res.json();
    return data.choices[0].message.content.trim();
}

module.exports = { askAI };