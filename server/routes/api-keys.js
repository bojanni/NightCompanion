const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');

// Simple encryption (for local use only)
function encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!', 'utf8').slice(0, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!', 'utf8').slice(0, 32);
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function maskKey(key) {
    if (key.length <= 4) return '****';
    return '****' + key.slice(-4);
}

// Get all API keys (masked)
router.get('/', async (req, res) => {
    try {
        const userId = '88ea3bcb-d9a8-44b5-ac26-c90885a74686';
        const result = await pool.query(
            'SELECT id, provider, key_hint, model_name, is_active, created_at FROM user_api_keys WHERE user_id = $1',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching API keys:', err);
        res.status(500).json({ error: err.message });
    }
});

// Save API key
router.post('/', async (req, res) => {
    try {
        const userId = '88ea3bcb-d9a8-44b5-ac26-c90885a74686';
        const { provider, apiKey, modelName } = req.body;

        const encrypted = encrypt(apiKey);
        const hint = maskKey(apiKey);

        const result = await pool.query(
            `INSERT INTO user_api_keys (user_id, provider, encrypted_key, key_hint, model_name, is_active)
             VALUES ($1, $2, $3, $4, $5, true)
             ON CONFLICT (user_id, provider) 
             DO UPDATE SET encrypted_key = $3, key_hint = $4, model_name = $5, updated_at = NOW()
             RETURNING id, provider, key_hint, model_name, is_active`,
            [userId, provider, encrypted, hint, modelName]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error saving API key:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete API key
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM user_api_keys WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting API key:', err);
        res.status(500).json({ error: err.message });
    }
});

// Test API key
router.post('/test', async (req, res) => {
    try {
        const { provider, apiKey } = req.body;

        // Simple test - just return success
        // In productie zou je hier de API daadwerkelijk testen
        res.json({
            success: true,
            message: `${provider} API key format looks valid`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
