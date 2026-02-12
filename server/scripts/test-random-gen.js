// Configuration
const API_URL = 'http://localhost:3000/api/ai';
const TEST_TOKEN = 'test-token';

async function testRandomGen() {
    console.log('🧪 Testing Structured Random Prompt Generation...');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEST_TOKEN}`
            },
            body: JSON.stringify({
                action: 'random',
                payload: {
                    maxWords: 75
                }
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${text}`);
        }

        const data = await response.json();
        console.log('✅ Response received:', data);

        if (!data.result) {
            throw new Error('No result in response');
        }

        const result = data.result;
        console.log('📝 Result Object:', result);

        // Validation
        if (typeof result !== 'object') {
            throw new Error('Result is not an object');
        }

        // Check for structure
        // We expect { style, prompt, negativePrompt } or similar structure parsing
        // But since `random` can return just { prompt, negativePrompt } based on earlier implementation, 
        // we need to see if our updated prompt managed to enforce the new structure including style.

        if (!result.prompt) throw new Error('Missing prompt field');
        if (!result.negativePrompt) console.warn('⚠️ Warning: Missing negativePrompt field');
        if (!result.style) console.warn('⚠️ Warning: Missing style field - System prompt might need tuning or model ignored it');

        if (result.style) {
            console.log('✅ Style detected:', result.style);
        }

        console.log('✅ verification PASSED structure check');

    } catch (error) {
        console.error('❌ verification FAILED:', error.message);
        process.exit(1);
    }
}

testRandomGen();
