

// Configuration
const API_URL = 'http://localhost:3000/api/ai';
const TEST_TOKEN = 'test-token'; // Token validation is mocked or loose in local env

async function testNegativeGen() {
    console.log('🧪 Testing Negative Prompt Generation...');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEST_TOKEN}`
            },
            body: JSON.stringify({
                action: 'generate-negative-prompt',
                payload: {}
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Response received:', data);

        if (!data.result) {
            throw new Error('No result in response');
        }

        const result = data.result;
        console.log('📝 Generated Negative Prompt:', result);

        // Validation
        if (typeof result !== 'string') {
            throw new Error('Result is not a string');
        }

        if (result.length === 0) {
            throw new Error('Result is empty');
        }

        if (result.split(',').length < 2) {
            console.warn('⚠️ Warning: Result does not seem to be a comma-separated list:', result);
        }

        // Check for some common keywords
        const keywords = ['blurry', 'quality', 'text', 'watermark', 'bad', 'distorted'];
        const hasKeyword = keywords.some(k => result.toLowerCase().includes(k));

        if (!hasKeyword) {
            console.warn('⚠️ Warning: Result does not contain common negative keywords. Might be valid but check manually.');
        }

        console.log('✅ verification PASSED');

    } catch (error) {
        console.error('❌ verification FAILED:', error.message);
        if (error.response) {
            const text = await error.response.text();
            console.error('Error details:', text);
        }
        process.exit(1);
    }
}

testNegativeGen();
