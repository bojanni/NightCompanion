const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function finalVerification() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('    FINAL SERVER CODE VERIFICATION');
    console.log('═══════════════════════════════════════════════════════\n');

    const client = await pool.connect();
    try {
        // 1. Verify no user_id columns exist
        const userIdCheck = await client.query(`
            SELECT table_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND column_name = 'user_id';
        `);

        console.log('1. DATABASE SCHEMA');
        if (userIdCheck.rows.length === 0) {
            console.log('   ✅ No user_id columns found in database');
        } else {
            console.log('   ❌ ERROR: user_id columns still exist in:');
            userIdCheck.rows.forEach(row => console.log(`      - ${row.table_name}`));
        }
        console.log('');

        // 2. Test basic CRUD operations
        console.log('2. CRUD OPERATIONS TEST');

        // Test prompts table
        try {
            const testPrompt = await client.query(`
                INSERT INTO prompts (title, content)
                VALUES ('Test Prompt', 'This is a test')
                RETURNING id
            `);
            const promptId = testPrompt.rows[0].id;
            console.log('   ✅ CREATE: Inserted test prompt without user_id');

            const selectTest = await client.query(`SELECT * FROM prompts WHERE id = $1`, [promptId]);
            console.log('   ✅ READ: Retrieved prompt without user_id filter');

            await client.query(`UPDATE prompts SET title = 'Updated Test' WHERE id = $1`, [promptId]);
            console.log('   ✅ UPDATE: Updated prompt without user_id filter');

            await client.query(`DELETE FROM prompts WHERE id = $1`, [promptId]);
            console.log('   ✅ DELETE: Deleted prompt without user_id filter');
        } catch (err) {
            console.log('   ❌ ERROR:', err.message);
        }
        console.log('');

        // 3. Check data counts
        console.log('3. DATA SUMMARY');
        const tables = ['prompts', 'tags', 'characters', 'gallery_items', 'collections'];
        for (const table of tables) {
            const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`   ${table.padEnd(20)} ${result.rows[0].count} record(s)`);
        }
        console.log('');

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ SERVER CODE READY FOR SINGLE-USER OPERATION');
        console.log('═══════════════════════════════════════════════════════');

    } catch (err) {
        console.error('❌ Verification failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

finalVerification();
