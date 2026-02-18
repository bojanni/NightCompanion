const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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
        console.log('Checking prompts table for start_image column...');
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'prompts' AND column_name = 'start_image'
        `);

        if (res.rowCount === 0) {
            console.log('Adding start_image column to prompts (TEXT)...');
            await pool.query('ALTER TABLE prompts ADD COLUMN start_image TEXT');
            console.log('Column added successfully.');
        } else {
            console.log('Column start_image already exists.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
