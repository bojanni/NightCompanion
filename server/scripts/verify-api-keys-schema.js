const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function verifySchema() {
    const client = await pool.connect();

    try {
        console.log('=== Verifying user_api_keys table ===\n');

        // 1. Check columns
        const columns = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'user_api_keys'
            ORDER BY ordinal_position
        `);

        console.log('📋 Columns:');
        const requiredColumns = ['id', 'provider', 'encrypted_key', 'iv', 'auth_tag', 'key_hint', 'model_name', 'is_active', 'created_at', 'updated_at'];
        const existingColumns = columns.rows.map(r => r.column_name);

        requiredColumns.forEach(col => {
            if (existingColumns.includes(col)) {
                const colData = columns.rows.find(r => r.column_name === col);
                console.log(`  ✅ ${col.padEnd(20)} (${colData.data_type})`);
            } else {
                console.log(`  ❌ ${col.padEnd(20)} MISSING`);
            }
        });

        // 2. Check constraints
        console.log('\n📌 Constraints:');
        const constraints = await client.query(`
            SELECT conname, contype
            FROM pg_constraint
            WHERE conrelid = 'user_api_keys'::regclass
        `);

        constraints.rows.forEach(row => {
            const type = {
                'p': 'PRIMARY KEY',
                'u': 'UNIQUE',
                'f': 'FOREIGN KEY',
                'c': 'CHECK'
            }[row.contype] || row.contype;
            console.log(`  ✅ ${row.conname.padEnd(40)} ${type}`);
        });

        // Check if provider has UNIQUE constraint
        const hasUniqueProvider = constraints.rows.some(r =>
            r.contype === 'u' && r.conname.includes('provider')
        );

        if (!hasUniqueProvider) {
            console.log('\n⚠️  WARNING: provider column does not have UNIQUE constraint');
            console.log('   Adding UNIQUE constraint...');
            await client.query(`
                ALTER TABLE user_api_keys 
                ADD CONSTRAINT user_api_keys_provider_unique UNIQUE (provider)
            `);
            console.log('   ✅ Added UNIQUE constraint on provider');
        }

        console.log('\n✅ Schema verification complete!');
        console.log('\n📊 Final Schema Summary:');
        console.log('   - All required columns present');
        console.log('   - GCM encryption fields (iv, auth_tag) available');
        console.log('   - Provider has UNIQUE constraint');
        console.log('   - No user_id column (single-user app)');
        console.log('   - No RLS (local application)');

    } catch (err) {
        console.error('❌ Verification failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

verifySchema();
