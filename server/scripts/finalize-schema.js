const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function finalizeSchema() {
    const client = await pool.connect();
    try {
        console.log('Finalizing schema...\n');

        // Recreate useful constraints and indexes
        console.log('Recreating constraints and indexes...');

        // user_api_keys: provider should be unique
        try {
            await client.query(`
                ALTER TABLE user_api_keys 
                ADD CONSTRAINT user_api_keys_provider_unique UNIQUE (provider);
            `);
            console.log(' ✓ Added unique constraint on user_api_keys.provider');
        } catch (e) {
            if (e.code !== '42P07') console.log(`  ⚠ ${e.message}`);
        }

        // style_keywords: keyword+category should be unique
        try {
            await client.query(`
                ALTER TABLE style_keywords 
                ADD CONSTRAINT style_keywords_keyword_category_unique UNIQUE (keyword, category);
            `);
            console.log('  ✓ Added unique constraint on style_keywords(keyword, category)');
        } catch (e) {
            if (e.code !== '42P07') console.log(`  ⚠ ${e.message}`);
        }

        // Recreate useful indexes
        const indexes = [
            { name: 'idx_user_api_keys_active', sql: 'CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(is_active) WHERE is_active = true' },
            { name: 'idx_style_profiles_created', sql: 'CREATE INDEX IF NOT EXISTS idx_style_profiles_created ON style_profiles(created_at DESC)' },
            { name: 'idx_style_keywords_count', sql: 'CREATE INDEX IF NOT EXISTS idx_style_keywords_count ON style_keywords(count DESC)' },
            { name: 'idx_user_local_endpoints_active', sql: 'CREATE INDEX IF NOT EXISTS idx_user_local_endpoints_active ON user_local_endpoints(is_active)' },
            { name: 'idx_batch_tests_status', sql: 'CREATE INDEX IF NOT EXISTS idx_batch_tests_status ON batch_tests(status)' },
        ];

        for (const idx of indexes) {
            try {
                await client.query(idx.sql);
                console.log(`  ✓ Created index: ${idx.name}`);
            } catch (e) {
                console.log(`  ⚠ Index ${idx.name}: ${e.message}`);
            }
        }

        // Recreate functions without auth.uid()
        console.log('\nRecreating functions...');

        await client.query(`
            CREATE OR REPLACE FUNCTION track_style_keywords(p_keywords jsonb)
            RETURNS void AS $$
            DECLARE
              kw jsonb;
            BEGIN
              FOR kw IN SELECT * FROM jsonb_array_elements(p_keywords)
              LOOP
                INSERT INTO style_keywords (keyword, category, count, last_seen_at)
                VALUES (kw->>'keyword', kw->>'category', 1, now())
                ON CONFLICT (keyword, category)
                DO UPDATE SET count = style_keywords.count + 1, last_seen_at = now();
              END LOOP;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('  ✓ Created track_style_keywords function');

        await client.query(`
            CREATE OR REPLACE FUNCTION rebuild_style_keywords(p_keywords jsonb)
            RETURNS void AS $$
            BEGIN
              DELETE FROM style_keywords;
            
              INSERT INTO style_keywords (keyword, category, count, last_seen_at)
              SELECT
                (kw->>'keyword')::text,
                (kw->>'category')::text,
                (kw->>'count')::integer,
                now()
              FROM jsonb_array_elements(p_keywords) AS kw;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('  ✓ Created rebuild_style_keywords function');

        await client.query(`
            CREATE OR REPLACE FUNCTION create_initial_version()
            RETURNS trigger AS $$
            BEGIN
              INSERT INTO prompt_versions (
                prompt_id,
                content,
                version_number,
                change_description
              ) VALUES (
                NEW.id,
                NEW.content,
                1,
                'Initial version'
              );
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('  ✓ Created create_initial_version trigger function');

        await client.query(`
            CREATE OR REPLACE FUNCTION create_version_on_update()
            RETURNS trigger AS $$
            DECLARE
              next_version integer;
            BEGIN
              IF OLD.content IS DISTINCT FROM NEW.content THEN
                next_version := get_next_version_number(NEW.id);
                
                INSERT INTO prompt_versions (
                  prompt_id,
                  content,
                  version_number,
                  change_description
                ) VALUES (
                  NEW.id,
                  NEW.content,
                  next_version,
                  'Updated prompt'
                );
              END IF;
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('  ✓ Created create_version_on_update trigger function');

        // Recreate triggers
        console.log('\nRecreating triggers...');

        await client.query('DROP TRIGGER IF EXISTS create_initial_version_trigger ON prompts');
        await client.query(`
            CREATE TRIGGER create_initial_version_trigger
              AFTER INSERT ON prompts
              FOR EACH ROW
              EXECUTE FUNCTION create_initial_version();
        `);
        console.log('  ✓ Created create_initial_version_trigger');

        await client.query('DROP TRIGGER IF EXISTS create_version_on_update_trigger ON prompts');
        await client.query(`
            CREATE TRIGGER create_version_on_update_trigger
              AFTER UPDATE ON prompts
              FOR EACH ROW
              EXECUTE FUNCTION create_version_on_update();
        `);
        console.log('  ✓ Created create_version_on_update_trigger');

        console.log('\n✅ Schema finalization complete!');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

finalizeSchema();
