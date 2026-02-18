const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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

        console.log('Checking characters table for images column...');
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'characters' AND column_name = 'images'
        `);

        if (res.rowCount === 0) {
            console.log('Adding images column to characters (JSONB)...');
            await pool.query('ALTER TABLE characters ADD COLUMN images JSONB DEFAULT \'[]\'');
            console.log('Column added successfully.');
        } else {
            console.log('images column already exists in characters.');
        }

        console.log('Migration completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await pool.end();
    }
}

migrate();
