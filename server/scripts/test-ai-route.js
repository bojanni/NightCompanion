

async function testAI() {
    try {
        const response = await fetch('http://localhost:3000/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'improve',
                payload: { prompt: 'A girl reading under a tree' }
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Body:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testAI();
