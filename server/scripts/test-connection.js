require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');

async function testConnection() {
    console.log('--- Database Connection Diagnostic ---');
    console.log('Loading .env from:', require('path').resolve('../.env'));

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
    console.log(`  Password: ${config.password ? '******' + config.password.slice(-3) : '(not set)'} (Length: ${config.password ? config.password.length : 0})`);

    // Test 1: Connect to target database
    console.log('\nAttempting to connect to target database...');
    const client1 = new Client(config);
    try {
        await client1.connect();
        console.log('✅ Connection successful!');
        const res = await client1.query('SELECT NOW()');
        console.log('   Server time:', res.rows[0].now);
        await client1.end();
    } catch (err) {
        console.log('❌ Connection failed:', err.message);
        if (err.code) console.log(`   Error Code: ${err.code}`);
    }

    // Test 2: Connect to 'postgres' database (maintenance db)
    console.log('\nAttempting to connect to default "postgres" database...');
    const config2 = { ...config, database: 'postgres' };
    const client2 = new Client(config2);
    try {
        await client2.connect();
        console.log('✅ Connection to "postgres" successful!');
        await client2.end();
    } catch (err) {
        console.log('❌ Connection to "postgres" failed:', err.message);
    }
}

testConnection();
