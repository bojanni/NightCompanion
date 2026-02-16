const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting migration: Add images column to characters table...');

        // 1. Add images column if it doesn't exist
        await client.query(`
            ALTER TABLE characters 
            ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;
        `);
        console.log('✅ Column "images" added (or already exists).');

        // 2. Migrate existing reference_image_url to images array
        const characters = await client.query('SELECT id, reference_image_url FROM characters');
        for (const char of characters.rows) {
            if (char.reference_image_url) {
                const initialImage = {
                    id: crypto.randomUUID(),
                    url: char.reference_image_url,
                    isMain: true,
                    created_at: new Date().toISOString()
                };
                await client.query(
                    'UPDATE characters SET images = $1 WHERE id = $2',
                    [JSON.stringify([initialImage]), char.id]
                );
            }
        }
        console.log(`✅ Migrated ${characters.rowCount} characters with existing reference images.`);

        console.log('🎊 Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
