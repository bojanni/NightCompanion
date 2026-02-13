const { pool } = require('../db');

async function checkConstraints() {
    try {
        const res = await pool.query(`
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE conrelid = 'style_keywords'::regclass
        `);
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    }
}
checkConstraints();
