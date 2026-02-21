'use strict';

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { decrypt } = require('../lib/crypto');
const logger = require('../lib/logger');
const { getModelsForProvider, getAllModels, getCachedAt, FETCHERS } = require('../services/modelFetcher');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Load all configured providers (API keys + local endpoints) with decrypted keys */
async function loadConfiguredProviders() {
    const [keysResult, localResult] = await Promise.all([
        pool.query('SELECT provider, encrypted_key FROM user_api_keys'),
        pool.query('SELECT provider FROM user_local_endpoints'),
    ]);

    const providers = [];

    for (const row of keysResult.rows) {
        const apiKey = decrypt(row.encrypted_key);
        if (apiKey) {
            providers.push({ provider: row.provider, apiKey });
        }
    }

    // Local providers don't need API keys — just mark them available if configured
    for (const row of localResult.rows) {
        if (!providers.find(p => p.provider === row.provider)) {
            providers.push({ provider: row.provider, apiKey: null });
        }
    }

    return providers;
}

// ── GET /api/providers/models ─────────────────────────────────────────────────
// Returns { [provider]: NormalizedModel[], _meta: { fetchedAt, count } }
router.get('/models', async (req, res) => {
    try {
        const configured = await loadConfiguredProviders();

        if (configured.length === 0) {
            return res.json({ _meta: { configuredCount: 0 }, models: {} });
        }

        // Only fetch providers we have a fetcher for
        const fetchable = configured.filter(p => FETCHERS[p.provider] && p.apiKey);

        const allModels = await getAllModels(fetchable);

        // Build metadata per provider
        const meta = {};
        for (const { provider } of fetchable) {
            meta[provider] = {
                fetchedAt: getCachedAt(provider),
                count: (allModels[provider] || []).length,
            };
        }

        res.json({ models: allModels, _meta: meta });
    } catch (err) {
        logger.error('[providers] GET /models error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/providers/models/:provider ───────────────────────────────────────
// Force-refresh a single provider, returns NormalizedModel[]
router.get('/models/:provider', async (req, res) => {
    const { provider } = req.params;
    try {
        const keysResult = await pool.query(
            'SELECT encrypted_key FROM user_api_keys WHERE provider = $1',
            [provider]
        );

        let apiKey = null;
        if (keysResult.rows.length > 0) {
            apiKey = decrypt(keysResult.rows[0].encrypted_key);
        }

        if (!apiKey && !['ollama', 'lmstudio'].includes(provider)) {
            return res.status(404).json({ error: `Provider "${provider}" not configured` });
        }

        const models = await getModelsForProvider(provider, apiKey, true /* force refresh */);
        res.json({ provider, models, fetchedAt: getCachedAt(provider) });
    } catch (err) {
        logger.error(`[providers] GET /models/${provider} error:`, err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/providers/capabilities ──────────────────────────────────────────
// Returns summary: which providers support which capabilities
router.get('/capabilities', async (req, res) => {
    try {
        const configured = await loadConfiguredProviders();
        const fetchable = configured.filter(p => FETCHERS[p.provider] && p.apiKey);
        const allModels = await getAllModels(fetchable);

        const summary = {};
        for (const [provider, models] of Object.entries(allModels)) {
            const caps = new Set();
            for (const m of models) {
                for (const c of m.capabilities) caps.add(c);
            }
            summary[provider] = {
                capabilities: [...caps],
                modelCount: models.length,
                hasVision: caps.has('vision'),
                hasReasoning: caps.has('reasoning'),
                hasWebSearch: caps.has('web_search'),
                fetchedAt: getCachedAt(provider),
            };
        }

        res.json({ capabilities: summary });
    } catch (err) {
        logger.error('[providers] GET /capabilities error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
