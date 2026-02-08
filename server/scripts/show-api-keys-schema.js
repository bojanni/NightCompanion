const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const { pool } = require('../db');

async function showSchema() {
    let output = '';
    try {
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'user_api_keys'
            ORDER BY ordinal_position
        `);

        output += '\n=== user_api_keys table schema ===\n\n';
        if (result.rows.length === 0) {
            output += '❌ Table does not exist\n';
        } else {
            result.rows.forEach(row => {
                output += `${row.column_name}\n`;
                output += `  Type: ${row.data_type}\n`;
                output += `  Nullable: ${row.is_nullable}\n`;
                output += `  Default: ${row.column_default || 'none'}\n`;
                output += '\n';
            });
        }

        // Write to file
        fs.writeFileSync(path.join(__dirname, 'schema-output.txt'), output);
        console.log(output);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

showSchema();
