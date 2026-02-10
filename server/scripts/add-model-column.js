
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function addModelColumn() {
    console.log('Connecting to DB...');
    console.log('DB User:', process.env.DB_USER);

    try {
        // Add model column to prompts if it doesn't exist
        console.log('Checking prompts table...');
        await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prompts' AND column_name='model') THEN 
          ALTER TABLE prompts ADD COLUMN model TEXT; 
          RAISE NOTICE 'Added model column to prompts';
        ELSE
            RAISE NOTICE 'model column already exists in prompts';
        END IF; 
      END $$;
    `);

        // Add model column to gallery_items if it doesn't exist
        console.log('Checking gallery_items table...');
        await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_items' AND column_name='model') THEN 
          ALTER TABLE gallery_items ADD COLUMN model TEXT; 
          RAISE NOTICE 'Added model column to gallery_items';
        ELSE
            RAISE NOTICE 'model column already exists in gallery_items';
        END IF; 
      END $$;
    `);

        console.log('Migration successful!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

addModelColumn();
