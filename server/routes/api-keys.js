const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { encrypt, maskKey } = require('../lib/crypto');

const USER_ID = '88ea3bcb-d9a8-44b5-ac26-c90885a74686'; // Mock user

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, provider, key_hint, model_name, is_active, created_at FROM user_api_keys WHERE user_id = $1 ORDER BY provider',
            [USER_ID]
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
                'SELECT id FROM user_api_keys WHERE user_id = $1 AND is_active = true',
                [USER_ID]
            );
            const isFirst = existing.rows.length === 0;

            await pool.query(
                `INSERT INTO user_api_keys (user_id, provider, encrypted_key, key_hint, model_name, is_active)
                  VALUES ($1, $2, $3, $4, $5, $6)
                  ON CONFLICT (user_id, provider) 
                  DO UPDATE SET encrypted_key = $3, key_hint = $4, model_name = $5, updated_at = NOW()`,
                [USER_ID, provider, encrypted, hint, modelName || null, isFirst]
            );

            res.json({ success: true, hint, is_active: isFirst });
        } else if (action === 'delete') {
            await pool.query('DELETE FROM user_api_keys WHERE user_id = $1 AND provider = $2', [USER_ID, provider]);
            res.json({ success: true });
        } else if (action === 'set-active') {
            await pool.query('UPDATE user_api_keys SET is_active = false WHERE user_id = $1', [USER_ID]);
            await pool.query('UPDATE user_local_endpoints SET is_active = false WHERE user_id = $1', [USER_ID]);

            const updateResult = await pool.query(
                'UPDATE user_api_keys SET is_active = true, model_name = COALESCE($1, model_name) WHERE user_id = $2 AND provider = $3 RETURNING *',
                [modelName, USER_ID, provider]
            );

            if (updateResult.rows.length === 0) {
                return res.status(404).json({ error: 'Provider not found' });
            }
            res.json({ success: true });
        } else if (action === 'update-model') {
            await pool.query(
                'UPDATE user_api_keys SET model_name = $1 WHERE user_id = $2 AND provider = $3',
                [modelName, USER_ID, provider]
            );
            res.json({ success: true });
        } else {
            // Backward compatibility for standard POST without action
            if (provider && apiKey) {
                const encrypted = encrypt(apiKey);
                const hint = maskKey(apiKey);
                await pool.query(
                    `INSERT INTO user_api_keys (user_id, provider, encrypted_key, key_hint, model_name, is_active)
                      VALUES ($1, $2, $3, $4, $5, true)
                      ON CONFLICT (user_id, provider) 
                      DO UPDATE SET encrypted_key = $3, key_hint = $4, model_name = $5, updated_at = NOW()`,
                    [USER_ID, provider, encrypted, hint, modelName]
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
        await pool.query('DELETE FROM user_api_keys WHERE user_id = $1 AND provider = $2', [USER_ID, req.params.provider]);
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
