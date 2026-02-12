require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../db');

async function inspectSchema() {
    try {
        const tables = ['prompts', 'gallery_items'];
        for (const table of tables) {
            console.log(`\nSchema for table: ${table}`);
            const res = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);

            console.table(res.rows);
        }
    } catch (err) {
        console.error('Error inspecting schema:', err);
    } finally {
        await pool.end();
    }
}

inspectSchema();
