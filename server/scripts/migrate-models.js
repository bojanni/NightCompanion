require('dotenv').config({ path: 'server/.env' });
const { pool } = require('../db');

async function migrate() {
    try {
        console.log('Starting migration to add model_gen and model_improve columns...');

        // Update user_api_keys
        await pool.query(`
            ALTER TABLE user_api_keys 
            ADD COLUMN IF NOT EXISTS model_gen TEXT,
            ADD COLUMN IF NOT EXISTS model_improve TEXT;
        `);

        // Copy existing model_name to new columns if they are null
        await pool.query(`
            UPDATE user_api_keys 
            SET model_gen = model_name, model_improve = model_name 
            WHERE model_gen IS NULL AND model_name IS NOT NULL;
        `);

        console.log('Updated user_api_keys table.');

        // Update user_local_endpoints
        await pool.query(`
            ALTER TABLE user_local_endpoints 
            ADD COLUMN IF NOT EXISTS model_gen TEXT,
            ADD COLUMN IF NOT EXISTS model_improve TEXT;
        `);

        // Copy existing model_name to new columns if they are null
        await pool.query(`
            UPDATE user_local_endpoints 
            SET model_gen = model_name, model_improve = model_name 
            WHERE model_gen IS NULL AND model_name IS NOT NULL;
        `);

        console.log('Updated user_local_endpoints table.');
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
