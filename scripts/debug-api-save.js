// const fetch = require('node-fetch'); // Use native fetch

async function testSave() {
    const payload = {
        title: 'Debug Test Prompt',
        content: 'This is a test prompt content',
        notes: 'Generated with Debug Script',
        rating: 0,
        is_template: false,
        is_favorite: false
    };

    console.log('Sending payload:', payload);

    try {
        const res = await fetch('http://localhost:3000/api/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        console.log('Response Status:', res.status);
        console.log('Response Body:', text);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testSave();
