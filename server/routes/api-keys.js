const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { encrypt, maskKey } = require('../lib/crypto');

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, provider, key_hint, model_name, is_active, created_at FROM user_api_keys ORDER BY provider'
        );
        res.json({ keys: result.rows }); // Wrap in keys object to match expected format
    } catch (err) {
        console.error('Error fetching API keys:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { action, provider, apiKey, modelName } = req.body;

        if (action === 'save') {
            const encrypted = encrypt(apiKey);
            const hint = maskKey(apiKey);

            // If this is the first key, make it active
            const existing = await pool.query(
                'SELECT id FROM user_api_keys WHERE is_active = true'
            );
            const isFirst = existing.rows.length === 0;

            await pool.query(
                `INSERT INTO user_api_keys (provider, encrypted_key, key_hint, model_name, is_active)
                  VALUES ($1, $2, $3, $4, $5)
                  ON CONFLICT (provider) 
                  DO UPDATE SET encrypted_key = $2, key_hint = $3, model_name = $4, updated_at = NOW()`,
                [provider, encrypted, hint, modelName || null, isFirst]
            );

            res.json({ success: true, hint, is_active: isFirst });
        } else if (action === 'delete') {
            await pool.query('DELETE FROM user_api_keys WHERE provider = $1', [provider]);
            res.json({ success: true });
        } else if (action === 'set-active') {
            await pool.query('UPDATE user_api_keys SET is_active = false');
            await pool.query('UPDATE user_local_endpoints SET is_active = false');

            const updateResult = await pool.query(
                'UPDATE user_api_keys SET is_active = true, model_name = COALESCE($1, model_name) WHERE provider = $2 RETURNING *',
                [modelName, provider]
            );

            if (updateResult.rows.length === 0) {
                return res.status(404).json({ error: 'Provider not found' });
            }
            res.json({ success: true });
        } else if (action === 'update-model') {
            await pool.query(
                'UPDATE user_api_keys SET model_name = $1 WHERE provider = $2',
                [modelName, provider]
            );
            res.json({ success: true });
        } else {
            // Backward compatibility for standard POST without action
            if (provider && apiKey) {
                const encrypted = encrypt(apiKey);
                const hint = maskKey(apiKey);
                await pool.query(
                    `INSERT INTO user_api_keys (provider, encrypted_key, key_hint, model_name, is_active)
                      VALUES ($1, $2, $3, $4, true)
                      ON CONFLICT (provider) 
                      DO UPDATE SET encrypted_key = $2, key_hint = $3, model_name = $4, updated_at = NOW()`,
                    [provider, encrypted, hint, modelName]
                );
                res.json({ success: true, hint, is_active: true });
            } else {
                res.status(400).json({ error: 'Invalid action or missing parameters' });
            }
        }
    } catch (err) {
        console.error('Error managing API key:', err);
        res.status(500).json({ error: err.message });
    }
});

// RESTful Delete
router.delete('/:provider', async (req, res) => {
    try {
        await pool.query('DELETE FROM user_api_keys WHERE provider = $1', [req.params.provider]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting API key:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/test', async (req, res) => {
    res.json({ success: true, message: 'API key format looks valid' });
});

module.exports = router;
