require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../db');

async function checkData() {
    try {
        console.log('--- Recent Prompts ---');
        const prompts = await pool.query('SELECT id, title, created_at, gallery_item_id FROM prompts ORDER BY created_at DESC LIMIT 5');
        console.table(prompts.rows);

        console.log('\n--- Recent Gallery Items ---');
        const items = await pool.query('SELECT id, title, image_url, prompt_id, created_at FROM gallery_items ORDER BY created_at DESC LIMIT 5');
        console.table(items.rows);

        console.log('\n--- Prompt Tags (Recent) ---');
        const tags = await pool.query('SELECT * FROM prompt_tags LIMIT 5');
        console.table(tags.rows);

    } catch (err) {
        console.error('Error querying data:', err);
    } finally {
        pool.end();
    }
}

checkData();
