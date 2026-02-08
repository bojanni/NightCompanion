const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function verifyFinalSchema() {
    const client = await pool.connect();
    try {
        console.log('═══════════════════════════════════════════════════════');
        console.log('    SCHEMA VERIFICATION REPORT');
        console.log('═══════════════════════════════════════════════════════\n');

        // Check for remaining user_id columns
        const userIdResult = await client.query(`
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND column_name = 'user_id'
            ORDER BY table_name;
        `);

        console.log('1. USER_ID COLUMNS');
        console.log('   Status:', userIdResult.rows.length === 0 ? '✅ ALL REMOVED' : '❌ STILL PRESENT');
        if (userIdResult.rows.length > 0) {
            userIdResult.rows.forEach(row => {
                console.log(`   - ${row.table_name}.${row.column_name}`);
            });
        }
        console.log('');

        // Check tables
        const tablesResult = await client.query(`
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename;
        `);

        console.log('2. DATABASE TABLES');
        console.log(`   Total: ${tablesResult.rows.length} tables`);
        tablesResult.rows.forEach(row => {
            console.log(`   - ${row.tablename}`);
        });
        console.log('');

        // Check functions
        const functionsResult = await client.query(`
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_type = 'FUNCTION'
            ORDER BY routine_name;
        `);

        console.log('3. CUSTOM FUNCTIONS');
        console.log(`   Total: ${functionsResult.rows.length} functions`);
        functionsResult.rows.forEach(row => {
            console.log(`   - ${row.routine_name}`);
        });
        console.log('');

        // Check triggers
        const triggersResult = await client.query(`
            SELECT trigger_name, event_object_table
            FROM information_schema.triggers
            WHERE trigger_schema = 'public'
            ORDER BY event_object_table, trigger_name;
        `);

        console.log('4. TRIGGERS');
        console.log(`   Total: ${triggersResult.rows.length} triggers`);
        triggersResult.rows.forEach(row => {
            console.log(`   - ${row.trigger_name} on ${row.event_object_table}`);
        });
        console.log('');

        // Check unique constraints
        const constraintsResult = await client.query(`
            SELECT
                tc.table_name,
                tc.constraint_name
            FROM information_schema.table_constraints tc
            WHERE tc.table_schema = 'public'
            AND tc.constraint_type = 'UNIQUE'
            ORDER BY tc.table_name, tc.constraint_name;
        `);

        console.log('5. UNIQUE CONSTRAINTS');
        console.log(`   Total: ${constraintsResult.rows.length} constraints`);
        constraintsResult.rows.forEach(row => {
            console.log(`   - ${row.table_name}: ${row.constraint_name}`);
        });
        console.log('');

        console.log('═══════════════════════════════════════════════════════');
        console.log(userIdResult.rows.length === 0 ? '✅ SCHEMA SIMPLIFICATION COMPLETE!' : '⚠️  MANUAL INTERVENTION NEEDED');
        console.log('═══════════════════════════════════════════════════════');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyFinalSchema();
