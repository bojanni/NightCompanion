const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function runMigration() {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();

    try {
        console.log('🚀 Starting "Vision Role" migration...');

        // 1. Add column to user_api_keys
        console.log('Checking user_api_keys...');
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_api_keys' AND column_name='is_active_vision') THEN
                    ALTER TABLE user_api_keys ADD COLUMN is_active_vision BOOLEAN DEFAULT FALSE;
                    RAISE NOTICE 'Added is_active_vision to user_api_keys';
                ELSE
                    RAISE NOTICE 'Column is_active_vision already exists in user_api_keys';
                END IF;
            END
            $$;
        `);

        // 2. Add column to user_local_endpoints
        console.log('Checking user_local_endpoints...');
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_local_endpoints' AND column_name='is_active_vision') THEN
                    ALTER TABLE user_local_endpoints ADD COLUMN is_active_vision BOOLEAN DEFAULT FALSE;
                    RAISE NOTICE 'Added is_active_vision to user_local_endpoints';
                ELSE
                    RAISE NOTICE 'Column is_active_vision already exists in user_local_endpoints';
                END IF;
            END
            $$;
        `);

        console.log('✅ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
