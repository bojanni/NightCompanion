const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Migrating prompts table...');
        await client.query(`
            ALTER TABLE prompts 
            ALTER COLUMN rating TYPE NUMERIC(3,1);
        `);

        console.log('Migrating gallery_items table...');
        await client.query(`
            ALTER TABLE gallery_items 
            ALTER COLUMN rating TYPE NUMERIC(3,1);
        `);

        await client.query('COMMIT');
        console.log('Migration successful!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
