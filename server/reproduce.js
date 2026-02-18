const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/.env' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function reproduce() {
    const id = 'ce919090-e71d-4db7-bb7c-efd0f4a1ec5a';
    try {
        console.log('Attempting update with DECIMAL rating for ID:', id);
        const res = await pool.query(
            'UPDATE prompts SET rating = 3.5, updated_at = NOW() WHERE id = $1 RETURNING *',
            [id]
        );
        console.log('Rows matched:', res.rowCount);
        console.log('Update successful:', res.rows[0]);
    } catch (err) {
        console.error('Update failed!');
        console.error(err);
    } finally {
        await pool.end();
    }
}

reproduce();
