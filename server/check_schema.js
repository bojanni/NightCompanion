const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/.env' });

const config = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'nightcafe_companion',
};

const pool = new Pool(config);

async function check() {
    try {
        const res = await pool.query(`
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_name IN ('prompts', 'gallery_items', 'characters')
            ORDER BY table_name, column_name
        `);
        console.log('--- SCHEMA Check ---');
        res.rows.forEach(row => console.log(`${row.table_name}.${row.column_name}: ${row.data_type}`));
    } catch (e) {
        console.error('Error checking schema:', e);
    } finally {
        await pool.end();
    }
}

check();
