const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function debugSchema() {
    try {
        console.log('Checking style_profiles table...');
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'style_profiles';
    `);

        if (res.rows.length === 0) {
            console.log('Table style_profiles does NOT exist!');
        } else {
            console.log('Table style_profiles columns:');
            res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
        }

        console.log('\nChecking style_keywords table...');
        const res2 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'style_keywords';
    `);
        console.table(res2.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

debugSchema();
