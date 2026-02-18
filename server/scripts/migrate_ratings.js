const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });

const config = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'nightcafe_companion',
};

const pool = new Pool(config);

async function migrate() {
    try {
        console.log('Starting migration...');

        // 1. Change rating columns to NUMERIC(3,1)
        console.log('Updates prompts table: ALTER COLUMN rating TYPE NUMERIC(3,1)...');
        await pool.query('ALTER TABLE prompts ALTER COLUMN rating TYPE NUMERIC(3,1) USING rating::numeric(3,1);');

        console.log('Updates gallery_items table: ALTER COLUMN rating TYPE NUMERIC(3,1)...');
        await pool.query('ALTER TABLE gallery_items ALTER COLUMN rating TYPE NUMERIC(3,1) USING rating::numeric(3,1);');

        // 2. Add created_at to gallery_items if missing
        console.log('Checking gallery_items for created_at column...');
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'gallery_items' AND column_name = 'created_at'
        `);

        if (res.rowCount === 0) {
            console.log('Adding created_at column to gallery_items...');
            await pool.query('ALTER TABLE gallery_items ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
        } else {
            console.log('created_at column already exists in gallery_items.');
        }

        console.log('Migration completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await pool.end();
    }
}

migrate();
