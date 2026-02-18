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

async function reproduce() {
    try {
        console.log('Attempting to insert character with images...');
        const res = await pool.query(`
            INSERT INTO characters (name, description, reference_image_url, images, user_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            'Test Char',
            'Test Description',
            'http://example.com/img.jpg',
            JSON.stringify([{ url: 'http://example.com/img.jpg', isMain: true }]),
            '88ea3bcb-d9a8-44b5-ac26-c90885a74686'
        ]);
        console.log('Success:', res.rows[0]);
    } catch (err) {
        console.error('Expected Error:', err.message);
    } finally {
        await pool.end();
    }
}

reproduce();
