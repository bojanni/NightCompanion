const fetch = require('node-fetch');

async function checkOpenRouter() {
    console.log('Fetching models from OpenRouter...');
    try {
        const res = await fetch('https://openrouter.ai/api/v1/models');
        if (!res.ok) {
            throw new Error(`Failed: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        console.log(`Successfully fetched ${data.data.length} models.`);
        console.log('First 5 models:');
        console.log(data.data.slice(0, 5).map(m => m.id));
    } catch (e) {
        console.error('Error fetching OpenRouter models:', e);
    }
}

checkOpenRouter();
