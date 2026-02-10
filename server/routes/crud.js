const express = require('express');
const { pool } = require('../db');

const createCrudRouter = (tableName) => {
    const router = express.Router();

    // GET all items with filtering, sorting, and pagination
    router.get('/', async (req, res) => {
        try {
            const { limit, offset, order, ...filters } = req.query;

            let queryText = `SELECT * FROM ${tableName}`;
            const values = [];
            const conditions = [];

            // Build filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value.startsWith('in.(') && value.endsWith(')')) {
                    // Handle IN clause: ?col=in.(val1,val2)
                    const list = value.slice(4, -1).split(',');
                    if (list.length > 0) {
                        const placeholders = list.map((_, i) => `$${values.length + i + 1}`).join(', ');
                        conditions.push(`${key} IN (${placeholders})`);
                        values.push(...list);
                    }
                } else {
                    // Handle Equality: ?col=val
                    conditions.push(`${key} = $${values.length + 1}`);
                    values.push(value);
                }
            });

            if (conditions.length > 0) {
                queryText += ` WHERE ${conditions.join(' AND ')}`;
            }

            // Handle Sorting
            // Default to created_at DESC if column exists (we assume it mostly does)
            // Ideally we check if column exists, but for now we trust the input or default
            if (order) {
                const [col, dir] = order.split('.');
                queryText += ` ORDER BY ${col} ${dir === 'desc' ? 'DESC' : 'ASC'}`;
            } else {
                queryText += ` ORDER BY created_at DESC`;
            }

            // Handle Pagination
            if (limit) {
                queryText += ` LIMIT $${values.length + 1}`;
                values.push(parseInt(limit));
            }
            if (offset) {
                queryText += ` OFFSET $${values.length + 1}`;
                values.push(parseInt(offset));
            }

            const result = await pool.query(queryText, values);

            // For range() support in client, we might need a count. 
            // The client expects 'count' in the response sometimes if requested, 
            // but the current local adapter implementation calculates count from array length?
            // "count: Array.isArray(data) ? data.length : 1" in api.ts
            // This is "page count", not "total count".
            // To support real pagination, we'd need a separate count query.
            // For now, let's just return the rows. exact count is hard in one query without window functions.

            res.json(result.rows);
        } catch (err) {
            console.error(`Error fetching ${tableName}:`, err);
            // If created_at doesn't exist, retry without order
            if (err.message.includes('column "created_at" does not exist')) {
                try {
                    const result = await pool.query(`SELECT * FROM ${tableName}`);
                    return res.json(result.rows);
                } catch (retryErr) {
                    return res.status(500).json({ error: retryErr.message });
                }
            }
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

    // DELETE with filters (e.g. DELETE /?prompt_id=123)
    router.delete('/', async (req, res) => {
        try {
            const filters = req.query;
            if (Object.keys(filters).length === 0) {
                return res.status(400).json({ error: 'Delete operation requires filters' });
            }

            const conditions = [];
            const values = [];

            Object.entries(filters).forEach(([key, value]) => {
                conditions.push(`${key} = $${values.length + 1}`);
                values.push(value);
            });

            const query = `DELETE FROM ${tableName} WHERE ${conditions.join(' AND ')}`;
            await pool.query(query, values);
            res.json({ status: 'deleted' });
        } catch (err) {
            console.error(`Error deleting from ${tableName}:`, err);
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
