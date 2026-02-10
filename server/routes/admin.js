const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Reset Database (Clear all data except settings)
router.post('/reset-db', async (req, res) => {
    try {
        console.log('⚠️  Database reset requested');

        // 1. Get all table names in public schema
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);

        // 2. Filter out tables to preserve
        const tablesToKeep = [
            'user_api_keys',
            'user_local_endpoints',
            'knex_migrations',
            'knex_migrations_lock',
            '_prisma_migrations', // just in case
        ];

        const tablesToWipe = tablesResult.rows
            .map(row => row.table_name)
            .filter(table => !tablesToKeep.includes(table));

        if (tablesToWipe.length === 0) {
            return res.json({ success: true, message: 'No tables to wipe' });
        }

        console.log('🗑️  Wiping tables:', tablesToWipe.join(', '));

        // 3. Truncate tables
        // CASCADE is important to handle foreign keys
        // RESTART IDENTITY resets auto-increment counters
        const query = `TRUNCATE TABLE ${tablesToWipe.map(t => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`;

        await pool.query(query);

        res.json({
            success: true,
            message: `Successfully wiped ${tablesToWipe.length} tables`,
            wipedTables: tablesToWipe
        });

    } catch (err) {
        console.error('❌ Database reset failed:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
