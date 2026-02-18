const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/.env' });

const config = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'nightcafe_companion',
};

const pool = new Pool(config);

async function checkSchema() {
    try {
        const tables = ['prompts', 'gallery_items'];
        for (const table of tables) {
            console.log(`\n--- ${table.toUpperCase()} ---`);
            const res = await pool.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY column_name
            `, [table]);
            res.rows.forEach(row => {
                console.log(`${row.column_name.padEnd(25)} | ${row.data_type}`);
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkSchema();
