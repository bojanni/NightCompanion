const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Client } = require('pg');

async function testConnection() {
    console.log('--- Database Connection Test ---');

    const config = {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    };

    console.log('Configuration:');
    console.log(`  User: ${config.user}`);
    console.log(`  Host: ${config.host}`);
    console.log(`  Database: ${config.database}`);
    console.log(`  Port: ${config.port}`);
    console.log(`  Password: ${config.password ? '***' + config.password.slice(-3) : '(not set)'}`);

    const client = new Client(config);

    try {
        await client.connect();
        console.log('\n✅ Connection successful!');
        const res = await client.query('SELECT NOW()');
        console.log('   Server time:', res.rows[0].now);
        await client.end();
    } catch (err) {
        console.log('\n❌ Connection failed:', err.message);
        if (err.code) console.log(`   Error Code: ${err.code}`);
    }
}

testConnection();