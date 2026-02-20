
async function test() {
    try {
        const response = await fetch('http://localhost:3000/api/prompts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'Random: Test Prompt with Suggestion',
                content: 'Test content',
                notes: 'Created with Test Script',
                rating: 0,
                is_template: false,
                is_favorite: false,
                model: 'test-model',
                suggested_model: 'test-suggested-model'
            })
        });

        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Body:', text);
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
