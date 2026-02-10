require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../db');

async function debugInsert() {
    try {
        console.log('Attempting to insert a test prompt...');

        const result = await pool.query(`
            INSERT INTO prompts (title, content, notes, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING *
        `, ['Test Prompt', 'This is a test prompt content.', 'Test notes']);

        console.log('Insert successful!');
        console.log('Inserted Row:', result.rows[0]);

    } catch (err) {
        console.error('Insert failed:', err);
    } finally {
        pool.end();
    }
}

debugInsert();
