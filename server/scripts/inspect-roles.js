
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function inspectData() {
    console.log('Connecting to DB...');
    try {
        const columns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'user_api_keys';
        `);
        console.log('Columns:', columns.rows.map(c => c.column_name).join(', '));

        const data = await pool.query('SELECT provider, is_active, is_active_gen, is_active_improve FROM user_api_keys');
        console.log('Data:', JSON.stringify(data.rows, null, 2));

    } catch (err) {
        console.error('Inspection failed:', err);
    } finally {
        await pool.end();
    }
}

inspectData();
