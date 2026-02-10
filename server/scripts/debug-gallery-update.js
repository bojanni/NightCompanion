
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function debugGalleryUpdate() {
    console.log('Connecting to DB...');
    try {
        // 1. Get a gallery item
        const { rows } = await pool.query('SELECT * FROM gallery_items LIMIT 1');
        if (rows.length === 0) {
            console.log('No gallery items found to test.');
            return;
        }
        const item = rows[0];
        console.log('Found item:', item.id, item.title);

        // 2. Try to update it
        console.log('Attempting update...');
        const updateQuery = `
      UPDATE gallery_items 
      SET rating = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `;
        const { rows: updated } = await pool.query(updateQuery, [5, item.id]);
        console.log('Update success:', updated[0]);

    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        await pool.end();
    }
}

debugGalleryUpdate();
