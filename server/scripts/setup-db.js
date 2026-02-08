const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const { pool } = require('../db');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '../../supabase/migrations');

async function createDatabaseIfNotExists() {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: 'postgres',
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    try {
        await client.connect();
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${process.env.DB_NAME}'`);
        if (res.rowCount === 0) {
            console.log(`Creating database "${process.env.DB_NAME}"...`);
            await client.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
            console.log('Database created.');
        } else {
            console.log(`Database "${process.env.DB_NAME}" already exists.`);
        }
    } catch (err) {
        console.error('Error checking/creating database:', err);
        throw err;
    } finally {
        await client.end();
    }
}

async function runMigrations() {
    try {
        await createDatabaseIfNotExists();
    } catch (err) {
        console.error("Failed to ensure database exists. Please create it manually if this fails.");
        return;
    }

    const client = await pool.connect();
    try {
        console.log('Connected to target database...');

        // 1. Setup Supabase-like environment (Roles & Auth Schema)
        console.log('Setting up auth roles and schema...');

        try {
            await client.query(`DO $$
            BEGIN
              IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
                CREATE ROLE anon;
              END IF;
              IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
                CREATE ROLE authenticated;
              END IF;
              IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
                CREATE ROLE service_role;
              END IF;
            END
            $$;`);

            await client.query('GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role');
            await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role');
            await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role');
        } catch (e) {
            console.warn("Role creation warning:", e.message);
        }

        await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
        await client.query('CREATE SCHEMA IF NOT EXISTS auth;');
        await client.query('GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role');

        await client.query(`
          CREATE TABLE IF NOT EXISTS auth.users (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            email text UNIQUE,
            encrypted_password text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            raw_user_meta_data jsonb DEFAULT '{}'::jsonb
          );
        `);

        await client.query('GRANT ALL ON auth.users TO service_role');
        await client.query('GRANT SELECT ON auth.users TO anon, authenticated');

        // Create default user
        const defaultUser = await client.query(`
          INSERT INTO auth.users (email, raw_user_meta_data)
          VALUES ('user@example.com', '{"name": "Local User"}')
          ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email, raw_user_meta_data = EXCLUDED.raw_user_meta_data
          RETURNING id;
        `);
        const userId = defaultUser.rows[0].id;
        console.log(`Default user ID: ${userId}`);

        // Create mock auth functions for RLS
        console.log('Creating mock auth functions...');
        await client.query(`
            CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
            SELECT '${userId}'::uuid
            $$ LANGUAGE sql STABLE;

            CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
            SELECT 'authenticated'
            $$ LANGUAGE sql STABLE;
        `);

        // 2. Run Migrations
        if (!fs.existsSync(MIGRATIONS_DIR)) {
            console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
            return;
        }

        const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();

        for (const file of files) {
            console.log(`Running migration: ${file}`);
            const filePath = path.join(MIGRATIONS_DIR, file);
            let sql = fs.readFileSync(filePath, 'utf8');

            try {
                await client.query(sql);
            } catch (err) {
                if (err.code === '42P07') {
                    console.log(`  -> Skipped (Relation already exists)`);
                } else if (err.code === '42710') {
                    console.log(`  -> Skipped (Duplicate Object)`);
                } else {
                    console.log(`  -> Error in ${file}: ${err.message}`);
                }
            }
        }

        console.log('All migrations completed.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();
