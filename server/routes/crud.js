const express = require('express');
const { pool } = require('../db');

// Hardcoded user ID for local single-user mode
// This matches the ID created in setup-db.js
const TEST_USER_ID = '88ea3bcb-d9a8-44b5-ac26-c90885a74686';

const createCrudRouter = (tableName) => {
    const router = express.Router();

    // GET all items (filtered by user_id if column exists)
    router.get('/', async (req, res) => {
        try {
            // Check if table has user_id column
            // This is a naive check but works for this known schema
            let queryText = `SELECT * FROM ${tableName}`;
            let params = [];

            // We assume most tables have user_id, but verify in a real app
            // For this rebuild, we'll force user_id check if valid
            if (['prompts', 'tags', 'characters', 'character_details', 'gallery_items', 'collections'].includes(tableName)) {
                queryText += ' WHERE user_id = $1';
                params.push(TEST_USER_ID);
            } else if (tableName === 'character_details') {
                // character_details doesn't have user_id directly, it links to characters
                // But for simplicity in this MVP, we might just return all or join. 
                // Let's stick to simple SELECT * for now and let Frontend filter or rely on small local data volume
                queryText = `SELECT * FROM ${tableName}`;
                params = [];
            }

            queryText += ' ORDER BY created_at DESC';

            const result = await pool.query(queryText, params);
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

            // Inject user_id if missing and applicable
            if (!data.user_id && ['prompts', 'tags', 'characters', 'gallery_items', 'collections'].includes(tableName)) {
                data.user_id = TEST_USER_ID;
            }

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
