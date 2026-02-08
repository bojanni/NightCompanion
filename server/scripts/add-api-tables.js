require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function createTables() {
    const client = await pool.connect();

    try {
        console.log('🔧 Creating user_local_endpoints table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_local_endpoints (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                name TEXT NOT NULL,
                endpoint_url TEXT NOT NULL,
                api_key TEXT,
                model_name TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        console.log('✅ user_local_endpoints table created/verified');

        console.log('🔧 Creating user_api_keys table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_api_keys (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                provider TEXT NOT NULL,
                encrypted_key TEXT NOT NULL,
                key_hint TEXT,
                model_name TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, provider)
            )
        `);
        console.log('✅ user_api_keys table created/verified');

        // Verify tables
        console.log('\n📋 Verifying tables...');
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('user_local_endpoints', 'user_api_keys')
            ORDER BY table_name
        `);

        console.log('\nTables found:');
        tables.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });

        console.log('\n✅ Migration completed successfully!');

    } catch (err) {
        console.error('❌ Error creating tables:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

createTables().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
