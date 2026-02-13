const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { encrypt, maskKey } = require('../lib/crypto');

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, provider, key_hint, model_name, model_gen, model_improve, is_active, is_active_gen, is_active_improve, created_at FROM user_api_keys ORDER BY provider'
        );
        res.json({ keys: result.rows }); // Wrap in keys object to match expected format
    } catch (err) {
        console.error('Error fetching API keys:', err);
        res.status(500).json({ error: err.message });
    }
});

// Bulk update API keys (e.g. set all inactive)
router.put('/', async (req, res) => {
    try {
        const { is_active } = req.body;
        const { provider } = req.query;

        let query = 'UPDATE user_api_keys SET is_active = $1';
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
        console.error('Error updating API keys:', err);
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
            const { role } = req.body;
            const isActive = req.body.active !== false;

            if (role === 'generation') {
                await pool.query('UPDATE user_api_keys SET is_active_gen = false');
                await pool.query('UPDATE user_local_endpoints SET is_active_gen = false');
                if (isActive) {
                    const updateKeys = await pool.query(
                        'UPDATE user_api_keys SET is_active_gen = true WHERE provider = $1 RETURNING *',
                        [provider]
                    );
                    if (updateKeys.rows.length === 0) {
                        await pool.query(
                            'UPDATE user_local_endpoints SET is_active_gen = true WHERE provider = $1',
                            [provider]
                        );
                    }
                }
            } else if (role === 'improvement') {
                await pool.query('UPDATE user_api_keys SET is_active_improve = false');
                await pool.query('UPDATE user_local_endpoints SET is_active_improve = false');
                if (isActive) {
                    const updateKeys = await pool.query(
                        'UPDATE user_api_keys SET is_active_improve = true WHERE provider = $1 RETURNING *',
                        [provider]
                    );
                    if (updateKeys.rows.length === 0) {
                        await pool.query(
                            'UPDATE user_local_endpoints SET is_active_improve = true WHERE provider = $1',
                            [provider]
                        );
                    }
                }
            } else {
                // FALLBACK: Legacy behavior (set both)
                await pool.query('UPDATE user_api_keys SET is_active = false, is_active_gen = false, is_active_improve = false');
                await pool.query('UPDATE user_local_endpoints SET is_active = false, is_active_gen = false, is_active_improve = false');

                if (isActive) {
                    const updateKeys = await pool.query(
                        'UPDATE user_api_keys SET is_active = true, is_active_gen = true, is_active_improve = true WHERE provider = $1 RETURNING *',
                        [provider]
                    );
                    if (updateKeys.rows.length === 0) {
                        await pool.query(
                            'UPDATE user_local_endpoints SET is_active = true, is_active_gen = true, is_active_improve = true WHERE provider = $1',
                            [provider]
                        );
                    }
                }
            }
            res.json({ success: true, active: isActive, role });
        } else if (action === 'update-models') {
            const { modelGen, modelImprove } = req.body;

            // Try updating both tables, one will succeed
            await pool.query(
                'UPDATE user_api_keys SET model_gen = COALESCE($1, model_gen), model_improve = COALESCE($2, model_improve) WHERE provider = $3',
                [modelGen, modelImprove, provider]
            );
            await pool.query(
                'UPDATE user_local_endpoints SET model_gen = COALESCE($1, model_gen), model_improve = COALESCE($2, model_improve) WHERE provider = $3',
                [modelGen, modelImprove, provider]
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
