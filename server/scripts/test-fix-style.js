const http = require('http');

// Helper to make requests
function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/style_keywords' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTest() {
    console.log('--- Testing Fixes ---');

    // 1. Clean up
    await request('DELETE', '?keyword=test_upsert');

    // 2. Insert initial
    const res1 = await request('POST', '?onConflict=keyword', {
        keyword: 'test_upsert',
        category: 'test',
        count: 1
    });
    console.log('Insert:', res1.status === 201 ? 'PASS' : 'FAIL', res1.data);

    // 3. Upsert (Update count)
    const res2 = await request('POST', '?onConflict=keyword', {
        keyword: 'test_upsert',
        category: 'test',
        count: 5 // Should update to 5
    });
    console.log('Upsert:', res2.status === 201 ? 'PASS' : 'FAIL', res2.data);

    if (res2.data.count !== 5) console.error('Upsert failed to update count');

    // 4. Delete with filter (using neq, which was failing before)
    // Delete where count != 100 (should delete our 5)
    // Note: crud.js now supports advanced DELETE filters
    const res3 = await request('DELETE', '?keyword=test_upsert&count=neq.100');
    console.log('Delete (neq):', res3.status === 200 ? 'PASS' : 'FAIL', res3.data);

    // 5. Verify deletion
    const res4 = await request('GET', '?keyword=test_upsert');
    console.log('Verify Delete:', res4.data.length === 0 ? 'PASS' : 'FAIL');
}

runTest().catch(console.error);
