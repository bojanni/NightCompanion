require('dotenv').config({ path: __dirname + '/.env' });
const { Client } = require('pg');

const DB_CONFIG = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'nightcafe_companion'
};

async function migrate() {
    const client = new Client(DB_CONFIG);
    try {
        await client.connect();
        console.log('Migrating database...');
        await client.query("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'nl'");
        console.log('✅ Added language column to user_profiles');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
