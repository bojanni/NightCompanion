require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../db');

async function addColumn() {
    try {
        await pool.query(`
      ALTER TABLE prompts 
      ADD COLUMN IF NOT EXISTS gallery_item_id UUID;
    `);
        console.log('Successfully added gallery_item_id column to prompts table.');
    } catch (err) {
        console.error('Error adding column:', err);
    } finally {
        pool.end();
    }
}

addColumn();
