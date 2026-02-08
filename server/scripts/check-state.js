const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function checkState() {
    try {
        console.log('Checking database state...');

        // List tables
        const tables = await pool.query(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        `);
        console.log('Tables found:', tables.rows);

        // Check users
        console.log('Querying auth.users...');
        const users = await pool.query('SELECT * FROM auth.users');
        console.log(`Found ${users.rows.length} users.`);

        if (users.rows.length > 0) {
            const user = users.rows[0];
            console.log('First user:', user.email, user.id);
            const userId = user.id;

            // Check profile
            console.log('Querying public.user_profiles...');
            const profile = await pool.query('SELECT * FROM public.user_profiles WHERE user_id = $1', [userId]);
            if (profile.rows.length === 0) {
                console.error('ERROR: User has no profile!');
            } else {
                console.log('User has profile:', profile.rows[0]);
            }
        } else {
            console.log('No users found.');
        }

    } catch (err) {
        console.error('Script Error:', err.message);
        if (err.detail) console.error('Detail:', err.detail);
        if (err.hint) console.error('Hint:', err.hint);
        // console.error('Full Error:', err);
    } finally {
        await pool.end();
    }
}

checkState();
