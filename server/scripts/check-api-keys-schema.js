const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function checkColumns() {
    const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'user_api_keys'
        ORDER BY ordinal_position
    `);

    console.log('user_api_keys columns:');
    result.rows.forEach(row => {
        console.log(`  ${row.column_name.padEnd(20)} ${row.data_type.padEnd(30)} nullable: ${row.is_nullable}`);
    });

    await pool.end();
}

checkColumns();
