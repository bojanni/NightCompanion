const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { decrypt } = require('../lib/crypto');

const LANGUAGE_INSTRUCTION = "CRITICAL: All output, including descriptions, reasoning, and analysis, MUST use English (UK) spelling and terminology (e.g., 'colour', 'centre', 'maximise').";

const BASE_PERSONA = `You are an expert AI Art Prompt Engineer specializing in NightCafe. Your goal is to generate high-quality, descriptive prompts for models like SDXL, Stable Diffusion, and DALL-E 3. ${LANGUAGE_INSTRUCTION}

Key Elements of a Great Prompt:
- Subject: Highly specific description of the main character, object, or scene.
- Style & Medium: Defined art form (e.g., 'digital concept art', 'oil on canvas').
- Visual Details: Intricate textures, lighting (e.g., 'volumetric lighting', 'cinematic framing').
- Atmosphere: Mood and environment (e.g., 'eerie morning mist', 'vibrant neon glow').
- Modifiers: Optimized tags like '8k resolution', 'unreal engine 5', 'masterpiece'.

You must combine these elements into a single, flowing text description without using labels like 'Subject:' or lines.`;

const SYSTEM_PROMPTS = {
    improve: `You are an expert AI image prompt engineer. Improve the user's prompt by enhancing subject, style, details, and atmosphere. Return ONLY the improved prompt text. ${LANGUAGE_INSTRUCTION} CRITICAL: Keep valid prompt response under 1500 characters.`,

    'improve-with-negative': `You are an expert AI image prompt engineer. Improve both the positive prompt and the negative prompt. For the positive prompt, enhance subject, style, details, and atmosphere. For the negative prompt, refine it with better exclusion terms (e.g., deformed, blurry, low quality, extra limbs, bad anatomy). ${LANGUAGE_INSTRUCTION} Return ONLY valid JSON: { "improved": "...", "negativePrompt": "..." }. CRITICAL: Limit 'improved' positive prompt to 1500 characters. Limit 'negativePrompt' to 600 characters max.`,

    'analyze-style': `You are an AI art style analyst. Analyze collections of image prompts to find patterns. Provide: 1. Style profile (2-3 sentences). 2. Top 3 themes. 3. Top 3 techniques. 4. 2-3 suggestions. 5. Style signature. ${LANGUAGE_INSTRUCTION} Format response as JSON: { profile, themes[], techniques[], suggestions[], signature }.`,

    generate: `${BASE_PERSONA}\n\nTask: Transform the description into a technical NightCafe prompt. Return ONLY the prompt text.\nCRITICAL: Keep the generated prompt under 1500 characters.`,

    diagnose: `You are an AI troubleshooting expert. Analyze failed prompts. Provide: 1. Likely cause. 2. 3 fixes. 3. Improved prompt. ${LANGUAGE_INSTRUCTION} Format as JSON: { cause, fixes[], improvedPrompt }. CRITICAL: Keep 'improvedPrompt' under 1500 characters.`,

    'recommend-models': `You are a model selection expert. Recommend NightCafe models based on prompt. ${LANGUAGE_INSTRUCTION} Return JSON: { recommendations: [{ modelId, modelName, matchScore, reasoning, tips[] }] }.`,

    'generate-variations': `${BASE_PERSONA}\n\nTask: Generate distinctive variations based on the input. Return JSON including a separate field for the negative prompt. \nOutput Format: { "variations": [{ "type": "string", "prompt": "string", "negativePrompt": "string" }] }.\n\nCRITICAL: The 'prompt' field must be a SINGLE string containing the full image description. DO NOT include structure labels (e.g. 'Subject:', 'Style:'). Just the raw, ready-to-use prompt text.\nPut elements to avoid in 'negativePrompt'.\nLIMITS: Positive prompt < 1500 chars. Negative prompt < 600 chars.`,

    random: `You are an Avant-Garde AI Art Director. Your goal is to generate truly unique, diverse, and creative image prompts.
    
    INSTRUCTIONS:
    STEP 1: Choose a random art style/theme
    Examples: landscape, portrait, abstract, fantasy, sci-fi, architecture, nature, character design, etc.

    STEP 2: Generate a detailed positive prompt (50-150 words)
    - Be specific and descriptive
    - Include style, mood, lighting, composition
    - Add technical details (camera angle, art medium, etc.)
    - Use clear technical specifications

    STEP 3: Generate a matching negative prompt (maximum 100 words)
    - Tailor to the chosen style (avoid elements that don't fit)
    - Include technical quality issues: ugly, blurry, low quality, distorted, deformed, bad anatomy
    - Add relevant exclusions: watermark, signature, text, grainy, jpeg artifacts, cropped, out of frame
    - STOP after 100 words - NO repetition

    ${LANGUAGE_INSTRUCTION}

    CRITICAL: Return ONLY valid JSON: { "style": "...", "prompt": "...", "negativePrompt": "..." }.
    LIMITS: Positive prompt < 1500 chars. Negative prompt < 600 chars.`,

    'generate-title': `Create a short, catchy title (max 10 words) for the image prompt. ${LANGUAGE_INSTRUCTION} Return ONLY the title text. No quotes.`,

    'suggest-tags': `Suggest exactly 5-10 comma-separated tags for the image prompt. 
    RULES:
    1. Each tag MUST be a single word or short phrase (max 3 words).
    2. NO sentences or long descriptions.
    3. Return ONLY the comma-separated tags.
    ${LANGUAGE_INSTRUCTION}
    Example: "nature, landscape, mountain, blue sky, cinematic lighting"`,

    'optimize-for-model': `You are an expert AI prompt engineer. Optimize the user's prompt for a specific AI model. ${LANGUAGE_INSTRUCTION}
    - If the model is DALL-E 3 or any GPT-Image model (e.g. GPT1.5, GPT-4o): These do NOT support negative prompts. You MUST merge any key negative constraints (e.g. "no blur", "no text") naturally into the positive prompt formulation or ignore them if minor. Return ONLY the optimized positive prompt.
    - If the model is Stable Diffusion / SDXL / Flux / Ideogram: You can keep negative constraints separate if provided, or refine the positive prompt to better suit the model's strengths (e.g. lighting, composition).
    CRITICAL: Return ONLY valid JSON: { "optimizedPrompt": "...", "negativePrompt": "..." (optional, empty if DALL-E 3/GPT) }.
    LIMITS: Positive prompt < 1500 chars. Negative prompt < 600 chars.`,

    'generate-negative-prompt': `You are an AI assistant helping to generate negative prompts for AI art.
    RULES:
    1. Maximum 100 words
    2. Comma-separated list of unwanted characteristics
    3. Focus on technical quality issues (blurry, distorted, low quality, etc.)
    4. Avoid extreme or repetitive terms
    5. STOP once you have a complete list - NO repetition

    Standard negative prompt structure:
    - Quality issues: ugly, blurry, low quality, distorted, deformed, bad anatomy
    - Artifacts: watermark, signature, text, grainy, jpeg artifacts
    - Composition: cropped, out of frame, duplicate, bad proportions
    - Rendering: oversaturated, underexposed, overexposed, amateur

    Generate a negative prompt of maximum 100 words.
    STOP after 100 words.`
};

async function getActiveProvider(role = 'generation') {
    const column = role === 'generation' ? 'is_active_gen' : 'is_active_improve';

    // Check local endpoint first
    const local = await pool.query(
        `SELECT provider, endpoint_url, model_name, model_gen, model_improve FROM user_local_endpoints WHERE ${column} = true`
    );
    if (local.rows.length > 0) {
        return {
            type: 'local',
            ...local.rows[0]
        };
    }

    // Check cloud provider keys
    const cloud = await pool.query(
        `SELECT provider, encrypted_key, model_name, model_gen, model_improve FROM user_api_keys WHERE ${column} = true`
    );

    if (cloud.rows.length > 0) {
        return {
            type: 'cloud',
            provider: cloud.rows[0].provider,
            apiKey: decrypt(cloud.rows[0].encrypted_key),
            modelName: cloud.rows[0].model_name,
            modelGen: cloud.rows[0].model_gen,
            modelImprove: cloud.rows[0].model_improve
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

async function callOpenRouter(apiKey, system, user, model, maxTokens = 1500) {
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
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nightcompanion.app', // Optional, for including your app on openrouter.ai rankings.
            'X-Title': 'NightCompanion', // Optional. Shows in rankings on openrouter.ai.
        },
        body: JSON.stringify({
            model: model || 'google/gemini-2.0-flash-001',
            messages: messages,
            max_tokens: maxTokens
        })
    });

    if (!res.ok) {
        let errorMsg = 'OpenRouter error';
        try {
            const errorData = await res.json();
            console.error('OpenRouter API Error Details:', JSON.stringify(errorData, null, 2));

            // OpenRouter errors can be nested in various ways
            if (errorData.error && typeof errorData.error === 'object') {
                errorMsg = errorData.error.message || errorData.error.code || JSON.stringify(errorData.error);
                // specialized handling for common vague errors
                if (typeof errorMsg === 'string' && errorMsg.includes('Provider returned error')) {
                    // Try to dig deeper if possible or just provide a better fallback
                    if (errorData.error.metadata) {
                        errorMsg += ` (${JSON.stringify(errorData.error.metadata)})`;
                    }
                }
            } else if (errorData.error && typeof errorData.error === 'string') {
                errorMsg = errorData.error;
            } else {
                errorMsg = JSON.stringify(errorData);
            }
        } catch (e) {
            const text = await res.text();
            console.error('OpenRouter API Error Text:', text);
            errorMsg = text.slice(0, 200); // Limit length
        }
        throw new Error(`OpenRouter Provider Error: ${errorMsg}`);
    }

    const data = await res.json();
    const content = data.choices[0].message.content;

    // Log the raw content for debugging
    console.log('[OpenRouter] Raw content received:', content ? content.substring(0, 200) + '...' : 'null/undefined');

    return content;
}

async function callTogether(apiKey, system, user, model, maxTokens = 1500) {
    const messages = [{ role: 'system', content: system }];
    if (typeof user === 'string') {
        messages.push({ role: 'user', content: user });
    } else {
        // Together supports vision on some models, but we'll stick to text for now unless using specific vision models
        // For simplicity, flattening content to text if array
        const textContent = Array.isArray(user) ? user.find(p => p.type === 'text')?.text || '' : user;
        messages.push({ role: 'user', content: textContent });
    }

    const res = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model || 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
            messages: messages,
            max_tokens: maxTokens
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Together AI error');
    return data.choices[0].message.content;
}

async function listModels(providerConfig) {
    const { provider, apiKey, endpoint_url } = providerConfig;

    if (provider === 'local' || providerConfig.type === 'local') {
        // For local (Ollama/LM Studio), we might need different endpoints
        // Ollama: GET /api/tags
        // LM Studio: GET /v1/models

        let urlClean = endpoint_url.trim().replace(/\/+$/, '');

        // Attempt to find the base URL if the user included '/v1'
        const baseUrl = urlClean.replace(/\/v1$/i, '');

        // 1. Try LM Studio specific API (http://localhost:1234/api/v1/models)
        try {
            const res = await fetch(`${baseUrl}/api/v1/models`);
            if (res.ok) {
                const data = await res.json();
                return data.data.map(m => ({ id: m.id, name: m.id }));
            }
        } catch (e) { /* ignore */ }

        // 2. Try OpenAI compatible (http://localhost:1234/v1/models)
        try {
            const res = await fetch(`${baseUrl}/v1/models`);
            if (res.ok) {
                const data = await res.json();
                return data.data.map(m => ({ id: m.id, name: m.id }));
            }
        } catch (e) { /* ignore */ }

        // 3. Keep original provided URL attempt (e.g. if user has a custom proxy ending in /v1)
        if (url !== baseUrl) {
            try {
                const res = await fetch(`${url}/models`);
                if (res.ok) {
                    const data = await res.json();
                    return data.data.map(m => ({ id: m.id, name: m.id }));
                }
            } catch (e) { /* ignore */ }
        }

        // 4. Fallback for Ollama specific (http://localhost:11434/api/tags)
        try {
            const res = await fetch(`${baseUrl}/api/tags`);
            if (res.ok) {
                const data = await res.json();
                return data.models.map(m => ({ id: m.name, name: m.name }));
            }
        } catch (e) { /* ignore */ }

        return [];
    }

    if (provider === 'openrouter') {
        const res = await fetch('https://openrouter.ai/api/v1/models');
        const data = await res.json();
        return data.data.map(m => ({ id: m.id, name: m.name, description: m.description })); // OpenRouter returns proper list
    }

    if (provider === 'together') {
        const res = await fetch('https://api.together.xyz/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const data = await res.json();
        // filter for chat/completion models if possible, but together returns all
        return data.map(m => ({ id: m.id, name: m.display_name || m.id, description: m.description }));
    }

    if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const data = await res.json();
        // simple filter for gpt models
        return data.data.filter(m => m.id.includes('gpt')).map(m => ({ id: m.id, name: m.id }));
    }

    if (provider === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await res.json();
        return data.models.map(m => ({ id: m.name.replace('models/', ''), name: m.displayName, description: m.description }));
    }

    return [];
}

async function callAI(providerConfig, system, user, maxTokens = 1500) {
    if (providerConfig.type === 'local') {
        // Local usually doesn't support vision easily via standard OpenAI endpoint unless specific model
        // We'll flatten to text if possible or error out for vision
        const textUser = typeof user === 'string' ? user : user.find(p => p.type === 'text')?.text || '';

        // Normalize URL: remove trailing slash and /v1 suffix to get base
        // Normalize URL: remove trailing slash and /v1 suffix to get base
        let baseUrl = providerConfig.endpoint_url.trim().replace(/\/+$/, '');
        baseUrl = baseUrl.replace(/\/v1$/i, '');

        // Always use OpenAI compatible endpoint for chat as requested
        const url = `${baseUrl}/v1/chat/completions`;
        console.log(`[AI Service] Calling Local URL: ${url} with model: ${providerConfig.model_name}`);
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
            const errorText = await res.text();
            let errorMsg = `Local AI Provider Error: ${res.status} ${res.statusText}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMsg = errorJson.error?.message || errorJson.error || errorMsg;
            } catch (e) {
                errorMsg += ` - ${errorText.substring(0, 200)}`;
            }
            throw new Error(errorMsg);
        }

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Invalid Local AI response:', JSON.stringify(data).substring(0, 500));
            throw new Error('Invalid response format from Local AI Provider: Missing choices/message');
        }

        return data.choices[0].message.content;
    }

    const { provider, apiKey } = providerConfig;
    switch (provider) {
        case 'openai': return callOpenAI(apiKey, system, user, maxTokens);
        case 'anthropic': return callAnthropic(apiKey, system, user, maxTokens);
        case 'gemini': return callGemini(apiKey, system, user, maxTokens);
        case 'gemini': return callGemini(apiKey, system, user, maxTokens);
        case 'openrouter': return callOpenRouter(apiKey, system, user, providerConfig.modelName, maxTokens);
        case 'together': return callTogether(apiKey, system, user, providerConfig.modelName, maxTokens);
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
        } else if (action === 'improve-with-negative') {
            userPrompt = `Positive prompt: "${payload.prompt}"\nNegative prompt: "${payload.negativePrompt}"\n\nImprove both prompts.`;
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
            userPrompt = `Generate a random, creative image prompt. Theme: ${payload.theme || 'random'}.`;
            userPrompt += `\nSystem Rule: Limit response to ${maxWords} words maximum.`;
            userPrompt += `\nFollow the 3-step process for style, positive, and negative prompts.`;
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

        } else if (action === 'optimize-for-model') {
            userPrompt = `Optimize this prompt for model: "${payload.targetModel}".\nPositive Prompt: "${payload.prompt}"\n`;
            if (payload.negativePrompt) {
                userPrompt += `Negative Prompt: "${payload.negativePrompt}"\n`;
            }
            userPrompt += `\nTask: Rewrite the prompt to be optimal for ${payload.targetModel}.`;
            userPrompt += `\nTask: Rewrite the prompt to be optimal for ${payload.targetModel}.`;
            maxTokens = 1500;

        } else if (action === 'generate-negative-prompt') {
            userPrompt = "Generate a negative prompt based on the standard structure.";
            maxTokens = 200;

        } else if (action === 'test-connection') {
            // Bypass AI call for test, just check provider availability
            const provider = await getActiveProvider();
            if (!provider) throw new Error('No active AI provider found');
            return res.json({ result: `Connection successful! Using ${provider.provider || provider.type}` });
        } else if (action === 'list-models') {
            // Dynamic model listing
            // Payload might contain provider and key if we want to list for a specific non-active provider
            // But for now let's reuse getActiveProvider OR allow passing credentials for setup time
            let providerConfig = null;

            if (payload.provider) {
                if (payload.apiKey) {
                    providerConfig = { provider: payload.provider, apiKey: payload.apiKey, type: 'cloud' };
                } else if (payload.provider === 'local') {
                    providerConfig = { type: 'local', endpoint_url: payload.endpointUrl, provider: payload.subProvider };
                } else {
                    // Look up saved credentials for the requested provider
                    providerConfig = await getProviderCredentials(payload.provider);

                    // Special case: OpenRouter doesn't strictly need a key to list models
                    if (!providerConfig && payload.provider === 'openrouter') {
                        providerConfig = { provider: 'openrouter', apiKey: '', type: 'cloud' };
                    }
                }
            } else if (payload.endpointUrl) {
                providerConfig = { type: 'local', endpoint_url: payload.endpointUrl, provider: payload.subProvider };
            } else {
                providerConfig = await getActiveProvider();
            }

            if (!providerConfig) {
                return res.status(400).json({ error: 'No provider configuration found to list models.' });
            }

            const models = await listModels(providerConfig);
            return res.json({ result: models });

        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        async function getProviderCredentials(providerId) {
            if (['ollama', 'lmstudio'].includes(providerId)) {
                const local = await pool.query(
                    'SELECT provider, endpoint_url, model_name FROM user_local_endpoints WHERE provider = $1',
                    [providerId]
                );
                if (local.rows.length > 0) {
                    return { type: 'local', ...local.rows[0] };
                }
            } else {
                const cloud = await pool.query(
                    'SELECT provider, encrypted_key, model_name FROM user_api_keys WHERE provider = $1',
                    [providerId]
                );
                if (cloud.rows.length > 0) {
                    return {
                        type: 'cloud',
                        provider: cloud.rows[0].provider,
                        apiKey: decrypt(cloud.rows[0].encrypted_key),
                        modelName: cloud.rows[0].model_name
                    };
                }
            }
            return null;
        }

        // ... (existing getActiveProvider and other functions)

        // Determine which provider/model to use
        let provider;

        // If the client requested specific preferences (e.g. for Prompt Improver), try to use them
        if (payload.apiPreferences && payload.apiPreferences.provider) {
            // Fetch credentials for the requested provider
            provider = await getProviderCredentials(payload.apiPreferences.provider);

            // If a specific model was also requested, override the default one from DB
            if (provider && payload.apiPreferences.model) {
                provider.modelName = payload.apiPreferences.model; // For cloud
                provider.model_name = payload.apiPreferences.model; // For local
            }
        }

        // Logic to select model_gen vs model_improve
        // Determine which role we are fulfilling
        const isImprovementAction = ['improve', 'improve-with-negative', 'improve-detailed', 'diagnose', 'optimize-for-model', 'recommend-models'].includes(action);
        const role = isImprovementAction ? 'improvement' : 'generation';

        // Fallback to active provider if no preference or preference failed to load
        if (!provider) {
            provider = await getActiveProvider(role);
        }

        if (!provider) {
            return res.status(503).json({ error: 'No AI provider configured for this action. Please check your Settings.' });
        }

        // Default to model_gen (or legacy model_name if not set)
        let activeModel = provider.modelGen || provider.model_gen || provider.modelName || provider.model_name;

        // For improvement tasks, use model_improve if available
        if (isImprovementAction) {
            activeModel = provider.modelImprove || provider.model_improve || activeModel;
        }

        // Apply the selected model to the provider config so callAI uses it
        provider.modelName = activeModel;
        provider.model_name = activeModel;

        const result = await callAI(provider, systemPrompt, userPrompt, maxTokens);

        // Parse JSON if needed (for actions that return JSON)
        let parsedResult = result;
        if (['analyze-style', 'diagnose', 'recommend-models', 'improve-detailed', 'improve-with-negative', 'generate-variations', 'describe-character', 'random', 'optimize-for-model'].includes(action)) {
            try {
                let jsonStr = result;
                // Attempt to find JSON within markdown code blocks first
                const codeBlockMatch = result && result.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (codeBlockMatch) {
                    jsonStr = codeBlockMatch[1];
                } else {
                    // Fallback to finding the first { and last }
                    const firstBrace = result ? result.indexOf('{') : -1;
                    const lastBrace = result ? result.lastIndexOf('}') : -1;
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        jsonStr = result.substring(firstBrace, lastBrace + 1);
                    }
                }

                if (jsonStr) {
                    parsedResult = JSON.parse(jsonStr);
                } else {
                    console.warn('No JSON found in response');
                    // Return a safe fallback structure if possible, or just the raw text
                    parsedResult = { error: "Failed to parse AI response", raw: result };
                }
            } catch (e) {
                console.warn('Failed to parse JSON response:', e);
                // Return raw text if parsing fails, but helpful to log what it was
                console.log('Raw output was:', result);
                parsedResult = { error: "Invalid JSON from AI", raw: result };
            }
        }

        res.json({ result: parsedResult });

    } catch (err) {
        console.error('AI Service Error:', err.message);

        // Handle connection refused / fetch failed (Local AI down)
        if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED')) {
            return res.status(503).json({
                error: 'Could not connect to AI provider',
                details: 'Please ensure your Local AI (Ollama/LM Studio) is running and the URL is correct.',
                hint: 'Check settings or try testing the connection.'
            });
        }

        // Ensure we send a useful error message back to the client
        const isOperational = err.message.includes('Provider Error') || err.message.includes('safety') || err.message.includes('Rate limit');
        res.status(500).json({
            error: err.message || 'An unexpected error occurred',
            details: isOperational ? undefined : (err.stack ? err.stack.split('\n')[0] : undefined)
        });
    }
});

module.exports = router;
