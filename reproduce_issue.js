
async function testImprove() {
    try {
        const res = await fetch('http://127.0.0.1:3000/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'improve',
                payload: {
                    prompt: 'A vintage train arriving'
                }
            })
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text);
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

testImprove();
