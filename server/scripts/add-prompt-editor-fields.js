const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function addPromptEditorFields() {
    console.log('Connecting to DB...');

    try {
        console.log('Checking prompts table for new fields...');

        await pool.query(`
            DO $$ 
            BEGIN 
                -- revised_prompt
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prompts' AND column_name='revised_prompt') THEN 
                    ALTER TABLE prompts ADD COLUMN revised_prompt TEXT; 
                    RAISE NOTICE 'Added revised_prompt column';
                END IF;

                -- seed
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prompts' AND column_name='seed') THEN 
                    ALTER TABLE prompts ADD COLUMN seed INTEGER; 
                    RAISE NOTICE 'Added seed column';
                END IF;

                -- aspect_ratio
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prompts' AND column_name='aspect_ratio') THEN 
                    ALTER TABLE prompts ADD COLUMN aspect_ratio TEXT; 
                    RAISE NOTICE 'Added aspect_ratio column';
                END IF;

                -- use_custom_aspect_ratio
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prompts' AND column_name='use_custom_aspect_ratio') THEN 
                    ALTER TABLE prompts ADD COLUMN use_custom_aspect_ratio BOOLEAN DEFAULT FALSE; 
                    RAISE NOTICE 'Added use_custom_aspect_ratio column';
                END IF;
            END $$;
        `);

        console.log('Migration successful: Added revised_prompt, seed, aspect_ratio, use_custom_aspect_ratio to prompts table.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

addPromptEditorFields();
