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

async function addColumnIfNotExists(table, column, definition) {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = $1 AND column_name = $2
        `, [table, column]);

        if (res.rowCount === 0) {
            console.log(`Adding ${column} to ${table}...`);
            await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
            console.log(`Column ${column} added.`);
        } else {
            console.log(`Column ${column} already exists in ${table}.`);
        }
    } catch (e) {
        console.error(`Error checking/adding ${column}:`, e.message);
    }
}

async function migrate() {
    try {
        console.log('Starting characters schema fix...');

        await addColumnIfNotExists('characters', 'user_id', 'UUID');
        await addColumnIfNotExists('characters', 'name', 'TEXT'); // Should exist, but checking
        await addColumnIfNotExists('characters', 'description', 'TEXT');
        await addColumnIfNotExists('characters', 'reference_image_url', 'TEXT');
        await addColumnIfNotExists('characters', 'images', "JSONB DEFAULT '[]'");
        await addColumnIfNotExists('characters', 'created_at', 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
        await addColumnIfNotExists('characters', 'updated_at', 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()');

        console.log('Migration completed.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await pool.end();
    }
}

migrate();
