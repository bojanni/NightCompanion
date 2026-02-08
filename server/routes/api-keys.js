const express = require('express');
const { pool } = require('../db');
const encryption = require('../lib/encryption');

const router = express.Router();

// Get all API keys (masked)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, provider, key_hint, is_active, model_name, updated_at
            FROM user_api_keys
            ORDER BY provider
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching API keys:', err);
        res.status(500).json({ error: err.message });
    }
});

// Add/Update API key
router.post('/', async (req, res) => {
    try {
        const { provider, api_key, model_name } = req.body;

        if (!provider || !api_key) {
            return res.status(400).json({ error: 'Provider and api_key are required' });
        }

        // Encrypt the key
        const { encrypted, iv, authTag } = encryption.encrypt(api_key);
        const key_hint = api_key.slice(0, 4) + '...' + api_key.slice(-4);

        const result = await pool.query(`
            INSERT INTO user_api_keys (provider, encrypted_key, iv, auth_tag, key_hint, model_name, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true)
            ON CONFLICT (provider) 
            DO UPDATE SET 
                encrypted_key = $2, 
                iv = $3,
                auth_tag = $4,
                key_hint = $5, 
                model_name = $6,
                updated_at = NOW()
            RETURNING id, provider, key_hint, is_active, model_name, updated_at
        `, [provider, encrypted, iv, authTag, key_hint, model_name]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error saving API key:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete API key
router.delete('/:provider', async (req, res) => {
    try {
        await pool.query(`
            DELETE FROM user_api_keys 
            WHERE provider = $1
        `, [req.params.provider]);

        res.json({ status: 'deleted' });
    } catch (err) {
        console.error('Error deleting API key:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get decrypted key (for internal use only)
router.get('/:provider/decrypt', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT encrypted_key, iv, auth_tag 
            FROM user_api_keys 
            WHERE provider = $1 AND is_active = true
        `, [req.params.provider]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No active key found' });
        }

        const { encrypted_key, iv, auth_tag } = result.rows[0];
        const decrypted = encryption.decrypt(encrypted_key, iv, auth_tag);

        res.json({ api_key: decrypted });
    } catch (err) {
        console.error('Error decrypting API key:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
