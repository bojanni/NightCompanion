const { pool } = require('../db');

async function debug() {
    try {
        console.log('--- Checking table existence ---');
        const table = await pool.query("SELECT to_regclass('public.user_local_endpoints')");
        console.log('Table exists:', table.rows[0].to_regclass);

        if (!table.rows[0].to_regclass) {
            console.log('Table does not exist!');
            return;
        }

        console.log('\n--- Checking columns ---');
        const columns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'user_local_endpoints'
        `);
        console.table(columns.rows);

        console.log('\n--- Testing SELECT ---');
        try {
            await pool.query('SELECT * FROM user_local_endpoints LIMIT 1');
            console.log('SELECT works');
        } catch (e) {
            console.log('SELECT failed:', e.message);
        }

        console.log('\n--- Testing INSERT (Mock) ---');
        try {
            await pool.query(`
                INSERT INTO user_local_endpoints (provider, endpoint_url, model_name, is_active)
                VALUES ('test_provider', 'http://test', 'model', true)
                RETURNING id
            `);
            console.log('INSERT works');
            // Cleanup
            await pool.query("DELETE FROM user_local_endpoints WHERE provider = 'test_provider'");
        } catch (e) {
            console.log('INSERT failed:', e.message);
        }

    } catch (err) {
        console.error('Debug script error:', err);
    } finally {
        await pool.end();
    }
}

debug();
