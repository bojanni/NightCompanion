const express = require('express');
const { pool } = require('../db');

const createCrudRouter = (tableName) => {
    const router = express.Router();

    // Helper to get columns and types
    const getTableSchema = async (tableName) => {
        if (!global.tableSchemaCache) global.tableSchemaCache = {};
        if (global.tableSchemaCache[tableName]) return global.tableSchemaCache[tableName];

        try {
            const colResult = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [tableName]);

            const schema = {};
            colResult.rows.forEach(r => {
                schema[r.column_name] = r.data_type;
            });

            global.tableSchemaCache[tableName] = schema;
            return schema;
        } catch (e) {
            console.error('Error fetching schema:', e);
            return {};
        }
    };

    // GET all items... (unchanged parts)

    // ...

    // Handle Sorting
    const schema = await getTableSchema(tableName);
    const hasCreatedAt = !!schema['created_at'];

    if (order) {
        // ...

        // CREATE item
        router.post('/', async (req, res) => {
            try {
                const data = req.body;
                const schema = await getTableSchema(tableName);

                // Helper to process values based on schema
                const processValue = (key, value) => {
                    if (schema[key] === 'jsonb' && typeof value === 'object' && value !== null) {
                        return JSON.stringify(value);
                    }
                    return value;
                };

                if (Array.isArray(data)) {
                    if (data.length === 0) return res.json([]);

                    const columns = Object.keys(data[0]);
                    const values = [];
                    const rowPlaceholders = [];

                    data.forEach((row, rowIndex) => {
                        const rowValues = Object.entries(row).map(([key, val]) => processValue(key, val));
                        const placeholders = rowValues.map((_, i) => `$${values.length + i + 1}`);
                        rowPlaceholders.push(`(${placeholders.join(', ')})`);
                        values.push(...rowValues);
                    });

                    const query = `
                    INSERT INTO ${tableName} (${columns.join(', ')})
                    VALUES ${rowPlaceholders.join(', ')}
                    RETURNING *
                `;

                    const result = await pool.query(query, values);
                    res.status(201).json(result.rows);
                } else {
                    const columns = Object.keys(data);
                    const values = Object.entries(data).map(([key, val]) => processValue(key, val));
                    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

                    const query = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders})
            RETURNING *
          `;

                    const result = await pool.query(query, values);
                    res.status(201).json(result.rows[0]);
                }
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
                delete data.id;
                delete data.created_at;
                delete data.updated_at;

                if (Object.keys(data).length === 0) return res.json({ status: 'no changes' });

                const schema = await getTableSchema(tableName);
                const hasUpdatedAt = !!schema['updated_at'];

                // Build SET clause
                const updates = [];
                const values = [];
                let idx = 1;

                Object.entries(data).forEach(([key, value]) => {
                    updates.push(`${key} = $${idx}`);

                    // Handle jsonb autoconversion
                    if (schema[key] === 'jsonb' && typeof value === 'object' && value !== null) {
                        values.push(JSON.stringify(value));
                    } else {
                        values.push(value);
                    }
                    idx++;
                });

                if (hasUpdatedAt) {
                    updates.push(`updated_at = NOW()`);
                }

                values.push(id);

                const query = `
        UPDATE ${tableName}
        SET ${updates.join(', ')}
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
