const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/.env' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function listTriggers() {
    try {
        const triggers = await pool.query(`
            SELECT 
                tgname as trigger_name,
                pg_get_triggerdef(pg_trigger.oid) as trigger_definition,
                prosrc as function_body
            FROM pg_trigger
            JOIN pg_proc ON pg_proc.oid = pg_trigger.tgfoid
            WHERE tgrelid = 'prompts'::regclass
        `);

        console.log('--- TRIGGERS ON PROMPTS ---');
        triggers.rows.forEach(row => {
            console.log(`Trigger: ${row.trigger_name}`);
            console.log(`Definition: ${row.trigger_definition}`);
            console.log(`Function Body:\n${row.function_body}\n`);
            console.log('---------------------------');
        });
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

listTriggers();
