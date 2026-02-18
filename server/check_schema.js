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
        const res = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'prompts' AND column_name = 'model'
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkSchema();
