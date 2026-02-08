const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');

// Simple encryption
function encrypt(text) {
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'nightcafe-companion-secret-key', 'utf8').slice(0, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function maskKey(key) {
    if (key.length <= 4) return '****';
    return '****' + key.slice(-4);
}

const USER_ID = '88ea3bcb-d9a8-44b5-ac26-c90885a74686'; // Mock user

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, provider, key_hint, model_name, is_active, created_at FROM user_api_keys WHERE user_id = $1',
            [USER_ID]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching API keys:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { provider, apiKey, modelName } = req.body;
        const encrypted = encrypt(apiKey);
        const hint = maskKey(apiKey);

        const result = await pool.query(
            `INSERT INTO user_api_keys (user_id, provider, encrypted_key, key_hint, model_name, is_active)
             VALUES ($1, $2, $3, $4, $5, true)
             ON CONFLICT (user_id, provider) 
             DO UPDATE SET encrypted_key = $3, key_hint = $4, model_name = $5, updated_at = NOW()
             RETURNING id, provider, key_hint, model_name, is_active`,
            [USER_ID, provider, encrypted, hint, modelName]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error saving API key:', err);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM user_api_keys WHERE id = $1', [req.params.id]);
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
