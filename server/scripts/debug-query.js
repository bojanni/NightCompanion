const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function testQuery() {
    try {
        console.log('Querying characters table...');
        const res = await pool.query('SELECT * FROM characters LIMIT 1');
        console.log('Success:', res.rows);
    } catch (err) {
        console.error('Error querying characters:', err.message);
        if (err.code) console.error('Error code:', err.code);
    } finally {
        await pool.end();
    }
}

testQuery();
