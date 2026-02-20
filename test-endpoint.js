
async function test() {
    try {
        const response = await fetch('http://localhost:3000/api/prompts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'Manual: Test Prompt',
                content: 'This is a test prompt content',
                notes: 'Created with Manual Generator',
                rating: 0,
                is_template: false,
                is_favorite: false
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
