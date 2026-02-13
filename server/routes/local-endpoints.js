const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Get all local endpoints for user
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, provider, endpoint_url, model_name, model_gen, model_improve, is_active, is_active_gen, is_active_improve, created_at, updated_at FROM user_local_endpoints ORDER BY created_at DESC'
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
        const { provider, endpoint_url, model_name, is_active } = req.body;

        const result = await pool.query(
            `INSERT INTO user_local_endpoints (provider, endpoint_url, model_name, is_active, is_active_gen, is_active_improve)
             VALUES ($1, $2, $3, $4, $4, $4)
             RETURNING id, provider, endpoint_url, model_name, is_active, is_active_gen, is_active_improve, created_at, updated_at`,
            [provider, endpoint_url, model_name, is_active !== false]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating local endpoint:', err);
        res.status(500).json({ error: err.message });
    }
});

// Bulk update local endpoints (e.g. set all inactive)
router.put('/', async (req, res) => {
    try {
        const { is_active } = req.body;
        const { provider } = req.query;

        let query = 'UPDATE user_local_endpoints SET is_active = $1';
        const params = [is_active];

        if (provider) {
            if (provider.startsWith('neq.')) {
                const val = provider.substring(4); // Remove 'neq.'
                query += ' WHERE provider != $2';
                params.push(val);
            } else {
                query += ' WHERE provider = $2';
                params.push(provider);
            }
        }

        const result = await pool.query(query, params);
        res.json({ success: true, updated: result.rowCount });
    } catch (err) {
        console.error('Error updating local endpoints:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update local endpoint
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { provider, endpoint_url, model_name, is_active } = req.body;

        const result = await pool.query(
            `UPDATE user_local_endpoints 
             SET provider = COALESCE($1, provider),
                 endpoint_url = COALESCE($2, endpoint_url),
                 model_name = COALESCE($3, model_name),
                 is_active = COALESCE($4, is_active),
                 is_active_gen = COALESCE($5, is_active_gen),
                 is_active_improve = COALESCE($6, is_active_improve),
                 updated_at = NOW()
             WHERE id = $7
             RETURNING id, provider, endpoint_url, model_name, is_active, is_active_gen, is_active_improve, created_at, updated_at`,
            [provider, endpoint_url, model_name, is_active, req.body.is_active_gen, req.body.is_active_improve, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating local endpoint:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete local endpoint (support both ID parameter and query provider)
router.delete('/:id?', async (req, res) => {
    try {
        const { id } = req.params;
        const { provider } = req.query;

        if (id) {
            await pool.query('DELETE FROM user_local_endpoints WHERE id = $1', [id]);
        } else if (provider) {
            await pool.query('DELETE FROM user_local_endpoints WHERE provider = $1', [provider]);
        } else {
            return res.status(400).json({ error: 'Missing id or provider' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting local endpoint:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
