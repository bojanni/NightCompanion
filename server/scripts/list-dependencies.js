const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function listDependencies() {
    const client = await pool.connect();
    try {
        // List all tables with user_id
        const tablesWithUserId = await client.query(`
            SELECT DISTINCT table_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND column_name = 'user_id'
            ORDER BY table_name;
        `);

        console.log('Tables with user_id column:');
        tablesWithUserId.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });
        console.log('');

        // Check for foreign key constraints
        const constraints = await client.query(`
            SELECT
                tc.table_name,
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.table_schema = 'public'
            AND (kcu.column_name = 'user_id' OR ccu.column_name = 'user_id')
            AND tc.constraint_type = 'FOREIGN KEY';
        `);

        console.log('Foreign key constraints on user_id:');
        constraints.rows.forEach(row => {
            console.log(`  ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
            console.log(`    Constraint: ${row.constraint_name}`);
        });

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

listDependencies();
