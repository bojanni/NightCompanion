const fs = require('fs');
async function test() {
    try {
        const jobId = '6uQY6YQF4xNwmTcjgGFr';
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };

        console.log('Testing .json endpoint...');
        let res = await fetch(`https://creator.nightcafe.studio/creation/${jobId}.json`, { headers });
        console.log('.json status', res.status);
    } catch (err) {
        console.error(err);
    }
}
test();
