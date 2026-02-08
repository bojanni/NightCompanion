const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function migrate() {
    const client = await pool.connect();

    try {
        console.log('Starting migration: Add iv and auth_tag columns for GCM encryption...\n');

        // Check if columns already exist
        const checkIv = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_api_keys' AND column_name = 'iv'
        `);

        const checkAuthTag = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_api_keys' AND column_name = 'auth_tag'
        `);

        if (checkIv.rows.length > 0 && checkAuthTag.rows.length > 0) {
            console.log('✅ Columns already exist. No migration needed.');
            return;
        }

        // Add iv column if it doesn't exist
        if (checkIv.rows.length === 0) {
            console.log('Adding iv column...');
            await client.query(`
                ALTER TABLE user_api_keys 
                ADD COLUMN IF NOT EXISTS iv text NOT NULL DEFAULT ''
            `);
            console.log('✅ Added iv column');
        }

        // Add auth_tag column if it doesn't exist
        if (checkAuthTag.rows.length === 0) {
            console.log('Adding auth_tag column...');
            await client.query(`
                ALTER TABLE user_api_keys 
                ADD COLUMN IF NOT EXISTS auth_tag text NOT NULL DEFAULT ''
            `);
            console.log('✅ Added auth_tag column');
        }

        // Update default for is_active to true (as per your schema)
        console.log('Updating is_active default...');
        await client.query(`
            ALTER TABLE user_api_keys 
            ALTER COLUMN is_active SET DEFAULT true
        `);
        console.log('✅ Updated is_active default to true');

        // Show final schema
        const result = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'user_api_keys'
            ORDER BY ordinal_position
        `);

        console.log('\n=== Updated user_api_keys schema ===\n');
        result.rows.forEach(row => {
            console.log(`${row.column_name.padEnd(20)} ${row.data_type.padEnd(30)} NULL: ${row.is_nullable.padEnd(5)} DEFAULT: ${row.column_default || 'none'}`);
        });

        console.log('\n✅ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
