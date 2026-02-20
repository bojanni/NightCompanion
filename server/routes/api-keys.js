const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { encrypt, maskKey } = require('../lib/crypto');
const { applyProviderFilter } = require('../lib/query-helpers');

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, provider, key_hint, model_name, model_gen, model_improve, model_vision, is_active, is_active_gen, is_active_improve, is_active_vision, created_at FROM user_api_keys ORDER BY provider'
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

        let baseQuery = 'UPDATE user_api_keys SET is_active = $1';
        let params = [is_active];

        const { query, params: finalParams } = applyProviderFilter(baseQuery, params, provider);

        const result = await pool.query(query, finalParams);
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

            // If this is the first key (across both cloud and local), make it active
            const existingCloud = await pool.query('SELECT id FROM user_api_keys WHERE is_active = true');
            const existingLocal = await pool.query('SELECT id FROM user_local_endpoints WHERE is_active = true');
            const isFirst = existingCloud.rows.length === 0 && existingLocal.rows.length === 0;

            await pool.query(
                `INSERT INTO user_api_keys (provider, encrypted_key, key_hint, model_name, model_vision, is_active, is_active_gen, is_active_improve, is_active_vision)
                  VALUES ($1, $2, $3, $4, $4, $5, $5, $5, $5)
                  ON CONFLICT (provider) 
                  DO UPDATE SET encrypted_key = $2, key_hint = $3, model_name = $4, updated_at = NOW()`,
                [provider, encrypted, hint, modelName || null, isFirst]
            );

            res.json({ success: true, hint, is_active: isFirst });
        } else if (action === 'delete') {
            await pool.query('DELETE FROM user_api_keys WHERE provider = $1', [provider]);
            res.json({ success: true });
        } else if (action === 'set-active') {
            const { role, modelName } = req.body;
            const isActive = req.body.active !== false;
            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                if (role === 'generation') {
                    await client.query('UPDATE user_api_keys SET is_active_gen = false');
                    await client.query('UPDATE user_local_endpoints SET is_active_gen = false');
                    if (isActive) {
                        const updateKeys = await client.query(
                            'UPDATE user_api_keys SET is_active_gen = true, model_gen = COALESCE($2, model_gen, model_name) WHERE provider = $1 RETURNING *',
                            [provider, modelName]
                        );
                        if (updateKeys.rows.length === 0) {
                            await client.query(
                                'UPDATE user_local_endpoints SET is_active_gen = true, model_gen = COALESCE($2, model_gen, model_name) WHERE provider = $1',
                                [provider, modelName]
                            );
                        }
                    }
                } else if (role === 'improvement') {
                    await client.query('UPDATE user_api_keys SET is_active_improve = false');
                    await client.query('UPDATE user_local_endpoints SET is_active_improve = false');
                    if (isActive) {
                        const updateKeys = await client.query(
                            'UPDATE user_api_keys SET is_active_improve = true, model_improve = COALESCE($2, model_improve, model_name) WHERE provider = $1 RETURNING *',
                            [provider, modelName]
                        );
                        if (updateKeys.rows.length === 0) {
                            await client.query(
                                'UPDATE user_local_endpoints SET is_active_improve = true, model_improve = COALESCE($2, model_improve, model_name) WHERE provider = $1',
                                [provider, modelName]
                            );
                        }
                    }
                } else if (role === 'vision') {
                    await client.query('UPDATE user_api_keys SET is_active_vision = false');
                    await client.query('UPDATE user_local_endpoints SET is_active_vision = false');
                    if (isActive) {
                        const updateKeys = await client.query(
                            'UPDATE user_api_keys SET is_active_vision = true, model_vision = COALESCE($2, model_vision, model_name) WHERE provider = $1 RETURNING *',
                            [provider, modelName]
                        );
                        if (updateKeys.rows.length === 0) {
                            await client.query(
                                'UPDATE user_local_endpoints SET is_active_vision = true, model_vision = COALESCE($2, model_vision, model_name) WHERE provider = $1',
                                [provider, modelName]
                            );
                        }
                    }
                } else {
                    // FALLBACK: Legacy behavior (set all)
                    await client.query('UPDATE user_api_keys SET is_active = false, is_active_gen = false, is_active_improve = false, is_active_vision = false');
                    await client.query('UPDATE user_local_endpoints SET is_active = false, is_active_gen = false, is_active_improve = false, is_active_vision = false');

                    if (isActive) {
                        await client.query(
                            'UPDATE user_api_keys SET is_active = true, is_active_gen = true, is_active_improve = true, is_active_vision = true WHERE provider = $1',
                            [provider]
                        );
                        await client.query(
                            'UPDATE user_local_endpoints SET is_active = true, is_active_gen = true, is_active_improve = true, is_active_vision = true WHERE provider = $1',
                            [provider]
                        );
                    }
                }

                // ✨ CRITICAL: Sync legacy is_active flag with new roles (is_active = gen OR improve OR vision)
                await client.query('UPDATE user_api_keys SET is_active = (is_active_gen OR is_active_improve OR is_active_vision)');
                await client.query('UPDATE user_local_endpoints SET is_active = (is_active_gen OR is_active_improve OR is_active_vision)');

                await client.query('COMMIT');
                res.json({ success: true, active: isActive, role });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } else if (action === 'update-models') {
            const { modelGen, modelImprove, modelVision } = req.body;
            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // Try updating both tables, one will succeed
                await client.query(
                    'UPDATE user_api_keys SET model_gen = COALESCE($1, model_gen), model_improve = COALESCE($2, model_improve), model_vision = COALESCE($3, model_vision) WHERE provider = $4',
                    [modelGen, modelImprove, modelVision, provider]
                );
                await client.query(
                    'UPDATE user_local_endpoints SET model_gen = COALESCE($1, model_gen), model_improve = COALESCE($2, model_improve), model_vision = COALESCE($3, model_vision) WHERE provider = $4',
                    [modelGen, modelImprove, modelVision, provider]
                );

                await client.query('COMMIT');
                res.json({ success: true });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
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
