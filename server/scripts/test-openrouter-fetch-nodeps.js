const https = require('https');

function checkOpenRouter() {
    console.log('Fetching models from OpenRouter...');
    https.get('https://openrouter.ai/api/v1/models', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    const json = JSON.parse(data);
                    console.log(`Successfully fetched ${json.data.length} models.`);
                    console.log('First 5 models:');
                    console.log(json.data.slice(0, 5).map(m => m.id));
                } catch (e) {
                    console.error('Error parsing JSON:', e);
                }
            } else {
                console.error(`Failed: ${res.statusCode}`);
            }
        });
    }).on('error', (e) => {
        console.error('Error fetching OpenRouter models:', e);
    });
}

checkOpenRouter();
