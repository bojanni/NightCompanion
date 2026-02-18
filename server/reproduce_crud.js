const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/.env' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function reproduce() {
    const tableName = 'prompts';
    const id = 'ce919090-e71d-4db7-bb7c-efd0f4a1ec5a';
    const data = { rating: 5 };

    try {
        console.log('Mimicking crud.js PUT /:id');

        // Build SET clause (exactly like crud.js)
        const updates = [];
        const values = [];
        let idx = 1;

        Object.entries(data).forEach(([key, value]) => {
            updates.push(`${key} = $${idx}`);
            values.push(value);
            idx++;
        });

        // hasUpdatedAt is true for prompts
        updates.push(`updated_at = NOW()`);

        values.push(id);

        const query = `
        UPDATE ${tableName}
        SET ${updates.join(', ')}
        WHERE id = $${idx}
        RETURNING *
      `;

        console.log('Query:', query);
        console.log('Values:', values);

        const result = await pool.query(query, values);
        console.log('Result rows length:', result.rows.length);
        console.log('Updated row:', result.rows[0]);
    } catch (err) {
        console.error('ERROR:', err.message);
        console.error('Full Error:', err);
    } finally {
        await pool.end();
    }
}

reproduce();
