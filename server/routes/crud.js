const express = require('express');
const { pool } = require('../db');

const createCrudRouter = (tableName) => {
    const router = express.Router();

    // GET all items (no user_id filtering)
    router.get('/', async (req, res) => {
        try {
            const queryText = `SELECT * FROM ${tableName} ORDER BY created_at DESC`;
            const result = await pool.query(queryText);
            res.json(result.rows);
        } catch (err) {
            console.error(`Error fetching ${tableName}:`, err);
            res.status(500).json({ error: err.message });
        }
    });

    // GET single item
    router.get('/:id', async (req, res) => {
        try {
            const result = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // CREATE item
    router.post('/', async (req, res) => {
        try {
            const data = req.body;

            const columns = Object.keys(data);
            const values = Object.values(data);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

            const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

            const result = await pool.query(query, values);
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error(`Error creating in ${tableName}:`, err);
            res.status(500).json({ error: err.message });
        }
    });

    // UPDATE item
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const data = req.body;
            delete data.id; // Don't update ID
            delete data.created_at; // Don't update created_at usually

            if (Object.keys(data).length === 0) return res.json({ status: 'no changes' });

            // Build SET clause
            const updates = [];
            const values = [];
            let idx = 1;

            Object.entries(data).forEach(([key, value]) => {
                updates.push(`${key} = $${idx}`);
                values.push(value);
                idx++;
            });

            values.push(id);

            const query = `
        UPDATE ${tableName}
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${idx}
        RETURNING *
      `;

            const result = await pool.query(query, values);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE item
    router.delete('/:id', async (req, res) => {
        try {
            await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [req.params.id]);
            res.json({ status: 'deleted' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

module.exports = createCrudRouter;
