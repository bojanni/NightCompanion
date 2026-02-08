const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const { pool } = require('../db');

async function verifySchema() {
    const client = await pool.connect();
    let output = '';

    try {
        output += '═══════════════════════════════════════════════════════\n';
        output += '    SCHEMA VERIFICATION REPORT\n';
        output += '═══════════════════════════════════════════════════════\n\n';

        // Check for remaining user_id columns
        const userIdResult = await client.query(`
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND column_name = 'user_id'
            ORDER BY table_name;
        `);

        output += '1. USER_ID COLUMNS\n';
        output += `   Status: ${userIdResult.rows.length === 0 ? '✅ ALL REMOVED' : '❌ STILL PRESENT'}\n`;
        if (userIdResult.rows.length > 0) {
            userIdResult.rows.forEach(row => {
                output += `   - ${row.table_name}.${row.column_name}\n`;
            });
        }
        output += '\n';

        // Check tables
        const tablesResult = await client.query(`
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename;
        `);

        output += '2. DATABASE TABLES\n';
        output += `   Total: ${tablesResult.rows.length} tables\n`;
        tablesResult.rows.forEach(row => {
            output += `   - ${row.tablename}\n`;
        });
        output += '\n';

        // Get columns for each table
        for (const table of tablesResult.rows) {
            const columnsResult = await client.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = $1
                ORDER BY ordinal_position;
            `, [table.tablename]);

            output += `\n   ${table.tablename} columns:\n`;
            columnsResult.rows.forEach(col => {
                output += `     - ${col.column_name} (${col.data_type})\n`;
            });
        }
        output += '\n';

        output += '═══════════════════════════════════════════════════════\n';
        output += userIdResult.rows.length === 0 ? '✅ SCHEMA SIMPLIFICATION COMPLETE!\n' : '⚠️  MANUAL INTERVENTION NEEDED\n';
        output += '═══════════════════════════════════════════════════════\n';

        // Write to file
        const outputPath = path.join(__dirname, 'verification-report.txt');
        fs.writeFileSync(outputPath, output);
        console.log(output);
        console.log(`\n📄 Full report saved to: ${outputPath}`);

    } catch (err) {
        console.error('Error:', err.message);
        output += `\nERROR: ${err.message}\n`;
    } finally {
        client.release();
        await pool.end();
    }
}

verifySchema();
