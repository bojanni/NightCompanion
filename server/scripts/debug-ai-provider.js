require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../db');
const { decrypt } = require('../lib/crypto');

async function checkProvider() {
    try {
        console.log('Checking local endpoints...');
        const local = await pool.query(
            'SELECT provider, endpoint_url, model_name FROM user_local_endpoints WHERE is_active = true'
        );
        if (local.rows.length > 0) {
            console.log('Active Local Provider:', local.rows[0]);
        } else {
            console.log('No active local provider.');
        }

        console.log('Checking cloud API keys...');
        const cloud = await pool.query(
            'SELECT provider, encrypted_key, model_name, is_active FROM user_api_keys WHERE is_active = true'
        );

        if (cloud.rows.length > 0) {
            const row = cloud.rows[0];
            let key = '***';
            try {
                key = decrypt(row.encrypted_key);
                console.log('Decrypted key successfully.');
            } catch (e) {
                console.error('Failed to decrypt key:', e.message);
            }
            console.log('Active Cloud Provider:', {
                provider: row.provider,
                modelName: row.model_name,
                keyLength: key ? key.length : 0
            });
        } else {
            console.log('No active cloud provider.');
        }

    } catch (err) {
        console.error('DB Error:', err);
    } finally {
        pool.end();
    }
}

checkProvider();
