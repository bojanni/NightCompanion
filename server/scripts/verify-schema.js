const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function checkUserIdColumns() {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                table_name, 
                column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND column_name = 'user_id'
            ORDER BY table_name;
        `);

        if (result.rows.length > 0) {
            console.log('Tables still containing user_id:');
            result.rows.forEach(row => {
                console.log(`  ${row.table_name}`);
            });
            process.exit(1);
        } else {
            console.log('SUCCESS: All user_id columns removed!');
            process.exit(0);
        }

    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

checkUserIdColumns();
