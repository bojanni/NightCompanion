const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function checkState() {
    try {
        console.log('Checking database state...\n');

        // List tables
        const tables = await pool.query(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY table_schema, table_name
        `);
        console.log('📋 Tables found:', tables.rows.length);
        console.log('');

        // Check users
        console.log('👤 Checking auth.users...');
        const users = await pool.query('SELECT * FROM auth.users');
        console.log(`   Found ${users.rows.length} user(s)`);

        if (users.rows.length > 0) {
            const user = users.rows[0];
            console.log(`   First user: ${user.email} (${user.id})`);
        }
        console.log('');

        // Check profiles (no longer tied to specific users)
        console.log('📊 Checking user_profiles...');
        const profiles = await pool.query('SELECT * FROM public.user_profiles');
        console.log(`   Found ${profiles.rows.length} profile(s)`);
        if (profiles.rows.length > 0) {
            console.log('   First profile:', profiles.rows[0]);
        }
        console.log('');

        // Check some key tables
        const tablesToCheck = ['prompts', 'tags', 'characters', 'gallery_items', 'collections'];
        console.log('📦 Checking data tables...');
        for (const table of tablesToCheck) {
            try {
                const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`   ${table}: ${result.rows[0].count} record(s)`);
            } catch (err) {
                console.log(`   ${table}: Error - ${err.message}`);
            }
        }
        console.log('');

        console.log('✅ Database state check complete!');

    } catch (err) {
        console.error('Script Error:', err.message);
        if (err.detail) console.error('Detail:', err.detail);
        if (err.hint) console.error('Hint:', err.hint);
    } finally {
        await pool.end();
    }
}

checkState();
