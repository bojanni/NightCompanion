const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { v4: uuidv4 } = require('uuid');
const { processBlurhashAsync } = require('../lib/blurhash');

// ── Health check (extensie test verbinding) ──────────────────────────────────
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        app: 'NightCafe Companion',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// ── Check of creatie al geïmporteerd is ─────────────────────────────────────
router.get('/status', async (req, res) => {
    const { creationId } = req.query;
    if (!creationId) return res.status(400).json({ error: 'creationId is vereist' });

    try {
        const result = await pool.query(
            `SELECT id, title, created_at
       FROM gallery_items
       WHERE metadata->>'nightcafe_creation_id' = $1
       LIMIT 1`,
            [creationId]
        );

        if (result.rows.length > 0) {
            const item = result.rows[0];
            return res.json({
                exists: true,
                id: item.id,
                title: item.title,
                importedAt: item.created_at
            });
        }
        return res.json({ exists: false });
    } catch (err) {
        console.error('[import/status]', err.message);
        return res.status(500).json({ error: 'Database fout' });
    }
});

// ── Importeer een creatie ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const data = req.body;

    // Valideer minimale velden
    if (!data.url && !data.creationId) {
        return res.status(400).json({ error: 'url of creationId is vereist' });
    }

    const creationId = data.creationId || data.url?.split('/').pop() || uuidv4();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Controleer duplicate
        const dupCheck = await client.query(
            `SELECT id, title FROM gallery_items
       WHERE metadata->>'nightcafe_creation_id' = $1 LIMIT 1`,
            [creationId]
        );

        if (dupCheck.rows.length > 0) {
            await client.query('ROLLBACK');

            // Stuur event naar frontend voor de samenvatting batch
            req.app.get('sseClients')?.forEach(sseClient => {
                sseClient.write(`data: ${JSON.stringify({
                    type: 'import_duplicate',
                    id: dupCheck.rows[0].id,
                    title: dupCheck.rows[0].title,
                    creationId
                })}\n\n`);
            });

            return res.status(200).json({
                duplicate: true,
                id: dupCheck.rows[0].id,
                title: dupCheck.rows[0].title,
                message: 'Al geïmporteerd'
            });
        }

        // Bouw metadata object
        const metadata = {
            source: data.source || 'NightCafe Studio',
            source_url: data.url,
            nightcafe_creation_id: creationId,
            all_images: data.allImages || (data.imageUrl ? [data.imageUrl] : []),
            is_published: data.isPublished || false,
            video_prompt: data.videoPrompt || null,
            revised_prompt: data.revisedPrompt || null,
            initial_resolution: data.initialResolution || null,
            sampling_method: data.metadata?.samplingMethod || null,
            runtime: data.metadata?.runtime || null,
            extracted_at: data.extractedAt || new Date().toISOString(),
            ...(data.metadata || {})
        };

        // Verwijder null waarden
        Object.keys(metadata).forEach(k => metadata[k] === null && delete metadata[k]);

        const promptText = data.prompt || data.videoPrompt || '';
        const galleryId = uuidv4();
        const promptId = uuidv4();

        // Sla prompt op
        await client.query(
            `INSERT INTO prompts (id, title, content, model, aspect_ratio, gallery_item_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
            [
                promptId,
                data.title || 'Geïmporteerd van NightCafe',
                promptText,
                data.model || null,
                data.aspectRatio || null,
                galleryId
            ]
        );

        // Sla gallery item op
        await client.query(
            `INSERT INTO gallery_items
         (id, title, image_url, prompt_used, prompt_id, model, aspect_ratio,
          start_image, metadata, media_type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, NOW())`,
            [
                galleryId,
                data.title || 'Geïmporteerd van NightCafe',
                data.imageUrl || '',
                promptText,
                promptId,
                data.model || null,
                data.aspectRatio || null,
                data.startImageUrl || null,
                JSON.stringify(metadata),
                data.creationType || 'image'
            ]
        );

        await client.query('COMMIT');

        // Async BlurHash generation for imported images
        if (data.imageUrl && data.creationType !== 'video') {
            processBlurhashAsync(galleryId, data.imageUrl);
        }

        // Stuur event naar frontend (SSE - zie stap 2)
        req.app.get('sseClients')?.forEach(sseClient => {
            sseClient.write(`data: ${JSON.stringify({
                type: 'import',
                id: galleryId,
                title: data.title,
                creationId
            })}\n\n`);
        });

        return res.status(201).json({
            id: galleryId,
            prompt_id: promptId,
            title: data.title,
            duplicate: false,
            message: 'Geïmporteerd'
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[import POST]', err.message);
        return res.status(500).json({ error: 'Import mislukt: ' + err.message });
    } finally {
        client.release();
    }
});

// ── Recente imports ophalen (voor de app UI) ─────────────────────────────────
router.get('/recent', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    try {
        const result = await pool.query(
            `SELECT id, title, image_url, model, created_at,
              metadata->>'nightcafe_creation_id' as nightcafe_id,
              metadata->>'source_url' as source_url
       FROM gallery_items
       WHERE metadata->>'source' = 'NightCafe Studio'
       ORDER BY created_at DESC
       LIMIT $1`,
            [limit]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[import/recent]', err.message);
        res.status(500).json({ error: 'Database fout' });
    }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE metadata->>'source' = 'NightCafe Studio') as total_imported,
        COUNT(*) FILTER (WHERE metadata->>'source' = 'NightCafe Studio'
          AND created_at > NOW() - INTERVAL '24 hours') as imported_today,
        COUNT(*) FILTER (WHERE metadata->>'source' = 'NightCafe Studio'
          AND created_at > NOW() - INTERVAL '7 days') as imported_this_week,
        MAX(created_at) FILTER (WHERE metadata->>'source' = 'NightCafe Studio') as last_import
      FROM gallery_items
    `);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[import/stats]', err.message);
        res.status(500).json({ error: 'Database fout' });
    }
});

module.exports = router;
