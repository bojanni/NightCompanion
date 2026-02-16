const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function verifyDb() {
    try {
        console.log('🔍 Verifying DB columns...');
        const res = await pool.query('SELECT * FROM user_api_keys LIMIT 1');
        const row = res.rows[0];

        console.log('Row keys:', Object.keys(row));

        if (row && Object.prototype.hasOwnProperty.call(row, 'is_active_vision')) {
            console.log('✅ is_active_vision column EXISTS in user_api_keys');
            console.log('Value:', row.is_active_vision);
        } else {
            console.error('❌ is_active_vision column MISSING in user_api_keys');
        }

    } catch (err) {
        console.error('❌ Verification failed:', err);
    } finally {
        await pool.end();
    }
}

verifyDb();
