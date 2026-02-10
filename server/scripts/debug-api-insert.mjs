import fetch from 'node-fetch';

async function debugApiInsert() {
    try {
        console.log('Attempting to create prompt via API...');

        const payload = {
            title: 'API Test Prompt',
            content: 'This prompt was created via the debug script.',
            notes: 'Debug notes',
            rating: 5,
            is_template: false,
            updated_at: new Date().toISOString()
        };

        const response = await fetch('http://localhost:3000/api/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Body:', data);

    } catch (err) {
        console.error('API request failed:', err);
    }
}

debugApiInsert();
