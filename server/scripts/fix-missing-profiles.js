const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function fixMissingProfiles() {
    console.log('Starting profile fix...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get all users
        const { rows: users } = await client.query('SELECT id, email FROM auth.users');
        console.log(`Found ${users.length} users.`);

        for (const user of users) {
            // 2. Check if profile exists
            const { rows: profiles } = await client.query('SELECT id FROM public.user_profiles WHERE user_id = $1', [user.id]);

            if (profiles.length === 0) {
                console.log(`Fixing missing profile for user ${user.email} (${user.id})...`);

                // 3. Insert profile manually (since trigger might have missed it or we want to be sure)
                await client.query(`
                    INSERT INTO public.user_profiles (user_id, credit_balance, total_credits_earned, total_credits_spent)
                    VALUES ($1, 1000, 1000, 0)
                 `, [user.id]);

                // 4. Insert initial transaction
                await client.query(`
                    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
                    VALUES ($1, 1000, 'bonus', 'Welcome bonus: 1000 free credits')
                 `, [user.id]);

                console.log('Profile created.');
            } else {
                console.log(`Profile exists for user ${user.email}.`);
            }
        }

        await client.query('COMMIT');
        console.log('Fix completed successfully.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Fix failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

fixMissingProfiles();
