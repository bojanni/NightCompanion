const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Get all local endpoints for user
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM user_local_endpoints ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching local endpoints:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create new local endpoint
router.post('/', async (req, res) => {
    try {
        const { name, endpoint_url, api_key, model_name, is_active } = req.body;

        const result = await pool.query(
            `INSERT INTO user_local_endpoints (name, endpoint_url, api_key, model_name, is_active)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, endpoint_url, api_key, model_name, is_active !== false]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating local endpoint:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update local endpoint
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, endpoint_url, api_key, model_name, is_active } = req.body;

        const result = await pool.query(
            `UPDATE user_local_endpoints 
             SET name = COALESCE($1, name),
                 endpoint_url = COALESCE($2, endpoint_url),
                 api_key = COALESCE($3, api_key),
                 model_name = COALESCE($4, model_name),
                 is_active = COALESCE($5, is_active),
                 updated_at = NOW()
             WHERE id = $6
             RETURNING *`,
            [name, endpoint_url, api_key, model_name, is_active, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating local endpoint:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete local endpoint
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM user_local_endpoints WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting local endpoint:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
