const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { decrypt } = require('../lib/crypto');

const SYSTEM_PROMPTS = {
    improve: `You are an expert AI image prompt engineer for NightCafe Studio. Your job is to improve the user's prompt. Rules: 1. Max 70 words. 2. Strict order: Subject, Action/Setting, Style, Technique. 3. Add technical terms/mood. Return ONLY the improved prompt text.`,

    'analyze-style': `You are an AI art style analyst. Analyze collections of image prompts to find patterns. Provide: 1. Style profile (2-3 sentences). 2. Top 3 themes. 3. Top 3 techniques. 4. 2-3 suggestions. 5. Style signature. Format response as JSON: { profile, themes[], techniques[], suggestions[], signature }.`,

    generate: `You are a creative AI image prompt generator. Rules: 1. Transform description to technical prompt. 2. Strict order: Subject, Action/Setting, Style, Technique. 3. Use NightCafe keywords. Return ONLY the prompt text.`,

    diagnose: `You are an AI troubleshooting expert. Analyze failed prompts. Provide: 1. Likely cause. 2. 3 fixes. 3. Improved prompt. Format as JSON: { cause, fixes[], improvedPrompt }.`,

    'recommend-models': `You are a model selection expert. Recommend NightCafe models based on prompt. Return JSON: { recommendations: [{ modelId, modelName, matchScore, reasoning, tips[] }] }.`,

    'generate-variations': `Generate 6 variations (lighting, style, composition, mood, detail, color). Return JSON: { variations: [{ type, prompt }] }.`,

    random: `You are an endless source of unique, high-quality AI art prompts. Rules: 1. Max 70 words. 2. Strict order: Subject, Action/Setting, Style, Technique. 3. Creative & vivid. Do not include "Here is a prompt:" or quotes. Just the raw prompt text.`,

    'generate-title': `Create a short, catchy title (max 10 words) for the image prompt. Return ONLY the title text. No quotes.`,

    'suggest-tags': `Suggest 5-10 comma-separated tags for the image prompt. Return ONLY the tags. Example: "nature, landscape, mountain, blue sky".`
};

async function getActiveProvider() {
    // Check local endpoint first
    const local = await pool.query(
        'SELECT provider, endpoint_url, model_name FROM user_local_endpoints WHERE is_active = true'
    );
    if (local.rows.length > 0) {
        return {
            type: 'local',
            ...local.rows[0]
        };
    }

    // Check cloud provider keys
    const cloud = await pool.query(
        'SELECT provider, encrypted_key FROM user_api_keys WHERE is_active = true'
    );

    if (cloud.rows.length > 0) {
        return {
            type: 'cloud',
            provider: cloud.rows[0].provider,
            apiKey: decrypt(cloud.rows[0].encrypted_key)
        };
    }

    return null;
}

// Minimal implementation of AI calls using fetch
async function callOpenAI(apiKey, system, user, maxTokens = 1500) {
    const messages = [{ role: 'system', content: system }];

    if (typeof user === 'string') {
        messages.push({ role: 'user', content: user });
    } else {
        // Handle multimodal input
        messages.push({ role: 'user', content: user });
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o', // Default to vision capable model
            messages: messages,
            max_tokens: maxTokens
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'OpenAI error');
    return data.choices[0].message.content;
}

async function callAnthropic(apiKey, system, user, maxTokens = 1500) {
    let messages = [];
    if (typeof user === 'string') {
        messages.push({ role: 'user', content: user });
    } else {
        messages.push({ role: 'user', content: user });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-3-opus-20240229',
            max_tokens: maxTokens,
            system: system,
            messages: messages
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Anthropic error');
    return data.content[0].text;
}

async function callGemini(apiKey, system, user, maxTokens = 1500) {
    // Gemini API structure for vision is slightly different, requiring 'inlineData' or 'fileData'
    // For simplicity, we'll assume text-only for now unless we implement full file upload handling
    // or convert base64 to parts.
    // TODO: Implement full Gemini Vision support if needed.

    // Fallback for now: only text
    const textUser = typeof user === 'string' ? user : user.find(p => p.type === 'text')?.text || '';

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: system + '\n\n' + textUser }] }]
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Gemini error');
    return data.candidates[0].content.parts[0].text;
}

async function callOpenRouter(apiKey, system, user, maxTokens = 1500) {
    const messages = [{ role: 'system', content: system }];
    if (typeof user === 'string') {
        messages.push({ role: 'user', content: user });
    } else {
        messages.push({ role: 'user', content: user });
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'google/gemini-2.0-flash-001',
            messages: messages,
            max_tokens: maxTokens
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'OpenRouter error');
    return data.choices[0].message.content;
}

async function callAI(providerConfig, system, user, maxTokens = 1500) {
    if (providerConfig.type === 'local') {
        // Local usually doesn't support vision easily via standard OpenAI endpoint unless specific model
        // We'll flatten to text if possible or error out for vision
        const textUser = typeof user === 'string' ? user : user.find(p => p.type === 'text')?.text || '';

        const url = `${providerConfig.endpoint_url.replace(/\/$/, '')}/v1/chat/completions`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: providerConfig.model_name,
                messages: [{ role: 'system', content: system }, { role: 'user', content: textUser }],
                max_tokens: maxTokens
            })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error?.message || data.error || `Local AI Provider Error: ${res.statusText}`);
        }

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from Local AI Provider: Missing choices/message');
        }

        return data.choices[0].message.content;
    }

    const { provider, apiKey } = providerConfig;
    switch (provider) {
        case 'openai': return callOpenAI(apiKey, system, user, maxTokens);
        case 'anthropic': return callAnthropic(apiKey, system, user, maxTokens);
        case 'gemini': return callGemini(apiKey, system, user, maxTokens);
        case 'openrouter': return callOpenRouter(apiKey, system, user, maxTokens);
        default: throw new Error(`Unknown provider: ${provider}`);
    }
}

router.post('/', async (req, res) => {
    try {
        const { action, payload } = req.body;
        const systemPrompt = SYSTEM_PROMPTS[action] || '';
        let userPrompt = '';
        let maxTokens = 1500;

        // Construct user prompt based on action
        if (action === 'improve') {
            userPrompt = `Improve this prompt: ${payload.prompt}`;
        } else if (action === 'improve-detailed') {
            userPrompt = `Detailed analysis for: "${payload.prompt}"`;
            maxTokens = 2000;
        } else if (action === 'analyze-style') {
            userPrompt = `Analyze these prompts:\n${payload.prompts.join('\n')}`;
        } else if (action === 'generate') {
            const maxWords = payload.preferences?.maxWords || 70;
            userPrompt = `Description: ${payload.description}\n\n`;
            userPrompt += `System Rule: Limit response to ${maxWords} words maximum.\n`;
            if (payload.preferences) userPrompt += `Prefs: ${JSON.stringify(payload.preferences)}\n`;
            if (payload.context) userPrompt += `Context: ${payload.context}`;
        } else if (action === 'diagnose') {
            userPrompt = `Prompt: "${payload.prompt}"\nIssue: ${payload.issue}`;
        } else if (action === 'recommend-models') {
            userPrompt = `Recommend models for: "${payload.prompt}"`;
        } else if (action === 'random') {
            const maxWords = payload.maxWords || 70;
            userPrompt = `Generate a random, creative image prompt. Theme: ${payload.theme || 'anything'}.`;
            userPrompt += `\nSystem Rule: Limit response to ${maxWords} words maximum.`;
        } else if (action === 'generate-variations') {
            const count = payload.count || 5;
            const strategy = payload.strategy || 'mixed';

            if (strategy === 'mixed') {
                userPrompt = `Generate ${count} variations for: "${payload.basePrompt}". Include a mix of lighting, style, composition, mood, detail, and color variations.`;
            } else {
                userPrompt = `Generate ${count} ${strategy} variations for: "${payload.basePrompt}". Focus specifically on altering the ${strategy} while keeping the core subject intact.`;
            }
            // Ensure response format
            userPrompt += ` Return ONLY valid JSON: { "variations": [{ "type": "${strategy}", "prompt": "..." }] }.`;

            maxTokens = 2000;
        } else if (action === 'generate-title') {
            userPrompt = `Prompt: "${payload.prompt}"`;
            maxTokens = 100;
        } else if (action === 'suggest-tags') {
            userPrompt = `Prompt: "${payload.prompt}"`;
            maxTokens = 200;
        } else if (action === 'describe-character') {
            // Vision multimodal prompt construction
            // Payload should contain imageUrl (url or base64 data uri)
            const imageUrl = payload.imageUrl;
            const isOverride = payload.override;

            // Check if it is a URL or Base64
            const isBase64 = imageUrl.startsWith('data:');

            let content = [];

            // Logic: If override is true, we force description. If false, we check for person.
            let instruction = isOverride
                ? "Describe the character in this image in detail (physical appearance only). Ignoring any previous warnings about no person found."
                : "Analyze this image. Is there a specific character/person? If yes, provide a detailed physical description. If NO person/character is found, return JSON: { \"found\": false, \"reason\": \"...\" }. If found, return JSON: { \"found\": true, \"description\": \"...\" }.";

            content.push({ type: 'text', text: instruction });

            if (isBase64) {
                content.push({
                    type: 'image_url',
                    image_url: { url: imageUrl }
                });
            } else {
                content.push({
                    type: 'image_url',
                    image_url: { url: imageUrl }
                });
            }

            userPrompt = content; // Pass array for multimodal
            maxTokens = 1000;

        } else if (action === 'test-connection') {
            // Bypass AI call for test, just check provider availability
            const provider = await getActiveProvider();
            if (!provider) throw new Error('No active AI provider found');
            return res.json({ result: `Connection successful! Using ${provider.provider || provider.type}` });
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const provider = await getActiveProvider();
        if (!provider) {
            return res.status(503).json({ error: 'No AI provider configured. Please add an API key in Settings.' });
        }

        const result = await callAI(provider, systemPrompt, userPrompt, maxTokens);

        // Parse JSON if needed (for actions that return JSON)
        let parsedResult = result;
        if (['analyze-style', 'diagnose', 'recommend-models', 'improve-detailed', 'generate-variations', 'describe-character'].includes(action)) {
            try {
                // Try to extract JSON from code blocks if present
                const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/) || result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsedResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                } else if (typeof result === 'string' && (result.trim().startsWith('{') || result.trim().startsWith('['))) {
                    parsedResult = JSON.parse(result);
                }
            } catch (e) {
                console.warn('Failed to parse JSON response:', e);
                // Return raw text if parsing fails (except for strictly structured ones, maybe?)
            }
        }

        res.json({ result: parsedResult });

    } catch (err) {
        console.error('AI Service Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
