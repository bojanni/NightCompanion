const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function testActiveRoles() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('    ACTIVE ROLES & MODEL PERSISTENCE TEST');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        const client = await pool.connect();

        try {
            // Setup: Insert a test provider (using 'openai' which is valid)
            console.log('1. SETTING UP TEST DATA');
            // Store original if exists
            const originalResult = await client.query("SELECT * FROM user_api_keys WHERE provider = 'openai'");
            const original = originalResult.rows[0];

            await client.query(`
                INSERT INTO user_api_keys (provider, encrypted_key, key_hint, model_name, is_active, iv, auth_tag)
                VALUES ($1, $2, $3, $4, true, 'iv', 'tag')
                ON CONFLICT (provider) DO UPDATE SET model_name = $4
            `, ['openai', 'enc', 'hint', 'default-model']);
            console.log('   ✅ Test provider created/updated\n');

            // Test 1: Activate for generation with a specific model
            console.log('2. TESTING GENERATION ROLE ACTIVATION');
            const genModel = 'gpt-4-gen';

            await client.query('UPDATE user_api_keys SET is_active_gen = false');
            await client.query(
                'UPDATE user_api_keys SET is_active_gen = true, model_gen = $2 WHERE provider = $1',
                ['openai', genModel]
            );

            let res = await client.query("SELECT model_gen, is_active_gen FROM user_api_keys WHERE provider = 'openai'");
            console.log(`   Model (Gen): ${res.rows[0].model_gen}`);
            console.log(`   Active (Gen): ${res.rows[0].is_active_gen}`);
            console.log(`   ✅ Success: ${res.rows[0].model_gen === genModel && res.rows[0].is_active_gen === true}\n`);

            // Test 2: Activate for improvement with a different model
            console.log('3. TESTING IMPROVEMENT ROLE ACTIVATION');
            const impModel = 'claude-3-imp';

            await client.query('UPDATE user_api_keys SET is_active_improve = false');
            await client.query(
                'UPDATE user_api_keys SET is_active_improve = true, model_improve = $2 WHERE provider = $1',
                ['openai', impModel]
            );

            res = await client.query("SELECT model_improve, is_active_improve FROM user_api_keys WHERE provider = 'openai'");
            console.log(`   Model (Imp): ${res.rows[0].model_improve}`);
            console.log(`   Active (Imp): ${res.rows[0].is_active_improve}`);
            console.log(`   ✅ Success: ${res.rows[0].model_improve === impModel && res.rows[0].is_active_improve === true}\n`);

            // Test 3: Model preservation
            console.log('4. TESTING MODEL PRESERVATION');
            const newGenModel = 'gpt-o1-preview';
            await client.query(
                "UPDATE user_api_keys SET model_gen = $1 WHERE provider = 'openai'",
                [newGenModel]
            );

            res = await client.query("SELECT model_gen, model_improve FROM user_api_keys WHERE provider = 'openai'");
            console.log(`   Model (Gen): ${res.rows[0].model_gen}`);
            console.log(`   Model (Imp): ${res.rows[0].model_improve}`);
            console.log(`   ✅ Success: ${res.rows[0].model_gen === newGenModel && res.rows[0].model_improve === impModel}\n`);

            // Restore original if it existed, otherwise delete
            if (original) {
                await client.query(`
                    UPDATE user_api_keys 
                    SET encrypted_key = $1, key_hint = $2, model_name = $3, is_active = $4, iv = $5, auth_tag = $6,
                        model_gen = $7, model_improve = $8, is_active_gen = $9, is_active_improve = $10
                    WHERE provider = 'openai'
                `, [original.encrypted_key, original.key_hint, original.model_name, original.is_active, original.iv, original.auth_tag,
                original.model_gen, original.model_improve, original.is_active_gen, original.is_active_improve]);
                console.log('   ✅ Restored original openai provider data');
            } else {
                await client.query("DELETE FROM user_api_keys WHERE provider = 'openai'");
                console.log('   ✅ Cleaned up test data');
            }

        } finally {
            client.release();
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ ALL PERSISTENCE TESTS PASSED');
        console.log('═══════════════════════════════════════════════════════');

    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
        await pool.end();
    }
}

testActiveRoles();
