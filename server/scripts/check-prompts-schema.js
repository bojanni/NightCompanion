require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../db');

async function checkSchema() {
    try {
        const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'prompts';
    `);
        const columns = result.rows.map(row => row.column_name);
        console.log('Prompts Table Columns:', columns.join(', '));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkSchema();
