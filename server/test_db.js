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

async function testInsert() {
    try {
        console.log('Attempting test insert with content and aspect_ratio="1:1"...');
        const res = await pool.query(
            "INSERT INTO prompts (content, aspect_ratio, title) VALUES ($1, $2, $3) RETURNING id",
            ['Test Content', '1:1', 'Test Title']
        );
        console.log('✅ Insert successful! ID:', res.rows[0].id);

        console.log('Attempting cleanup...');
        await pool.query("DELETE FROM prompts WHERE id = $1", [res.rows[0].id]);
        console.log('✅ Cleanup successful.');
    } catch (e) {
        console.error('❌ Insert FAILED:', e.message);
        if (e.message.includes('integer')) {
            console.log('IDENTIFIED: aspect_ratio appears to be an integer column despite schema check.');
        }
    } finally {
        await pool.end();
    }
}

testInsert();
