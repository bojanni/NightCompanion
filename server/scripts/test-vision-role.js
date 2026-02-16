// Node 18+ has native fetch

const API_URL = 'http://localhost:3000/api';

async function testVisionRole() {
    try {
        console.log('🧪 Testing Vision Role API...');

        // 1. Set OpenAI as Vision Provider
        console.log('1. Setting OpenAI as vision provider...');
        const setRes = await fetch(`${API_URL}/user_api_keys`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'set-active',
                provider: 'openai',
                role: 'vision',
                active: true
            })
        });
        const setJson = await setRes.json();
        console.log('Set Result:', setJson);

        if (!setJson.success) throw new Error('Failed to set vision role');

        // 2. Fetch Keys and verify
        console.log('2. Verifying keys...');
        const getRes = await fetch(`${API_URL}/user_api_keys`);
        const getJson = await getRes.json();

        const openAiKey = getJson.keys.find(k => k.provider === 'openai');
        console.log('OpenAI Key Status:', {
            provider: openAiKey.provider,
            is_active_vision: openAiKey.is_active_vision
        });

        if (openAiKey.is_active_vision) {
            console.log('✅ Vision role successfully set!');
        } else {
            console.error('❌ Vision role NOT set correctly.');
        }

    } catch (err) {
        console.error('❌ Test failed:', err);
    }
}

testVisionRole();
