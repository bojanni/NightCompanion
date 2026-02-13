
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function migrateActiveRoles() {
    console.log('Connecting to DB...');

    try {
        // user_api_keys
        console.log('Updating user_api_keys table...');
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_api_keys' AND column_name='is_active_gen') THEN 
                    ALTER TABLE user_api_keys ADD COLUMN is_active_gen BOOLEAN DEFAULT FALSE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_api_keys' AND column_name='is_active_improve') THEN 
                    ALTER TABLE user_api_keys ADD COLUMN is_active_improve BOOLEAN DEFAULT FALSE;
                END IF;
            END $$;
        `);

        // Migrate data for user_api_keys
        console.log('Migrating data for user_api_keys...');
        await pool.query(`
            UPDATE user_api_keys 
            SET is_active_gen = is_active, 
                is_active_improve = is_active 
            WHERE is_active = TRUE;
        `);

        // user_local_endpoints
        console.log('Updating user_local_endpoints table...');
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_local_endpoints' AND column_name='is_active_gen') THEN 
                    ALTER TABLE user_local_endpoints ADD COLUMN is_active_gen BOOLEAN DEFAULT FALSE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_local_endpoints' AND column_name='is_active_improve') THEN 
                    ALTER TABLE user_local_endpoints ADD COLUMN is_active_improve BOOLEAN DEFAULT FALSE;
                END IF;
            END $$;
        `);

        // Migrate data for user_local_endpoints
        console.log('Migrating data for user_local_endpoints...');
        await pool.query(`
            UPDATE user_local_endpoints 
            SET is_active_gen = is_active, 
                is_active_improve = is_active 
            WHERE is_active = TRUE;
        `);

        console.log('Migration successful!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrateActiveRoles();
