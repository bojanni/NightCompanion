const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');
const fs = require('fs');

async function completeMigration() {
    const client = await pool.connect();
    try {
        console.log('Completing schema simplification...\n');

        // Read and execute the migration file
        const migrationPath = path.join(__dirname, '../../supabase/migrations/20260208211100_simplify_schema.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executing migration...');
        await client.query(sql);

        console.log('✅ Migration completed successfully!\n');

        // Verify
        const result = await client.query(`
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND column_name = 'user_id'
            ORDER BY table_name;
        `);

        if (result.rows.length > 0) {
            console.log('⚠️  Remaining user_id columns:');
            result.rows.forEach(row => {
                console.log(`  - ${row.table_name}.${row.column_name}`);
            });
        } else {
            console.log('✅ All user_id columns successfully removed!');
        }

    } catch (err) {
        console.error('Error:', err.message);
        console.error('Details:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

completeMigration();
