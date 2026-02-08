const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function forceRemoveUserIds() {
    const client = await pool.connect();
    try {
        console.log('Forcefully removing user_id columns and dependencies...\n');

        // Get all tables with user_id
        const tablesResult = await client.query(`
            SELECT DISTINCT table_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND column_name = 'user_id'
            ORDER BY table_name;
        `);

        const tables = tablesResult.rows.map(r => r.table_name);
        console.log(`Found user_id in ${tables.length} tables: ${tables.join(', ')}\n`);

        // For each table, drop ALL constraints first
        for (const table of tables) {
            console.log(`Processing ${table}...`);

            // Get all constraints for this table
            const constraintsResult = await client.query(`
                SELECT constraint_name, constraint_type
                FROM information_schema.table_constraints
                WHERE table_schema = 'public'
                AND table_name = $1
                AND constraint_type IN ('FOREIGN KEY', 'UNIQUE');
            `, [table]);

            for (const constraint of constraintsResult.rows) {
                try {
                    await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${constraint.constraint_name} CASCADE`);
                    console.log(`  ✓ Dropped constraint: ${constraint.constraint_name}`);
                } catch (err) {
                    console.log(`  ⚠ Could not drop ${constraint.constraint_name}: ${err.message}`);
                }
            }

            // Now drop the user_id column
            try {
                await client.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS user_id CASCADE`);
                console.log(`  ✅ Dropped user_id column from ${table}`);
            } catch (err) {
                console.log(`  ❌ Error dropping user_id from ${table}: ${err.message}`);
            }
        }

        console.log('\n✅ Completed user_id removal!\n');

        // Verify
        const verifyResult = await client.query(`
            SELECT table_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND column_name = 'user_id';
        `);

        if (verifyResult.rows.length === 0) {
            console.log('✅ SUCCESS: All user_id columns removed!');
        } else {
            console.log('⚠️  Still has user_id:', verifyResult.rows.map(r => r.table_name).join(', '));
        }

    } catch (err) {
        console.error('Error:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

forceRemoveUserIds();
