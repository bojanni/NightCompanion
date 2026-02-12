const { pool } = require('../db');
const { decrypt } = require('../lib/crypto');

async function checkProvider() {
    try {
        console.log('Checking for active local endpoints...');
        const local = await pool.query(
            'SELECT provider, endpoint_url, model_name, is_active FROM user_local_endpoints WHERE is_active = true'
        );
        console.log('Active Local:', JSON.stringify(local.rows, null, 2));

        console.log('Checking for active cloud keys...');
        const cloud = await pool.query(
            'SELECT id, provider, model_name, is_active, key_hint FROM user_api_keys WHERE is_active = true'
        );
        console.log('Active Cloud:', JSON.stringify(cloud.rows, null, 2));

        const allKeys = await pool.query('SELECT provider, is_active, model_name FROM user_api_keys');
        console.log('All Keys Summary:', JSON.stringify(allKeys.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkProvider();
