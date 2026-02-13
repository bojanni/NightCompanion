
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function fixNulls() {
    console.log('Connecting to DB...');

    try {
        console.log('Fixing nulls in user_api_keys...');
        await pool.query(`
            UPDATE user_api_keys 
            SET is_active_gen = COALESCE(is_active_gen, FALSE),
                is_active_improve = COALESCE(is_active_improve, FALSE);
        `);

        console.log('Fixing nulls in user_local_endpoints...');
        await pool.query(`
            UPDATE user_local_endpoints 
            SET is_active_gen = COALESCE(is_active_gen, FALSE),
                is_active_improve = COALESCE(is_active_improve, FALSE);
        `);

        console.log('Fix successful!');
    } catch (err) {
        console.error('Fix failed:', err);
    } finally {
        await pool.end();
    }
}

fixNulls();
