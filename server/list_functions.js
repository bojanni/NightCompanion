const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/.env' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function listFunctions() {
    try {
        const functions = await pool.query(`
            SELECT 
                proname as function_name,
                pg_get_functiondef(oid) as function_definition
            FROM pg_proc 
            WHERE pronamespace = 'public'::regnamespace
        `);

        console.log('--- FUNCTIONS IN PUBLIC ---');
        functions.rows.forEach(row => {
            console.log(`Function: ${row.function_name}`);
            console.log(`Definition:\n${row.function_definition}\n`);
            console.log('---------------------------');
        });
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

listFunctions();
