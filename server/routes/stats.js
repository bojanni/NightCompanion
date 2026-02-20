const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const logger = require('../lib/logger');

// GET /api/stats
router.get('/', async (req, res) => {
    try {
        // Query 1: Top Models by usage and average rating
        // We use COALESCE(model_used, model) because the gallery items might store the model in either field depending on how it was saved.
        const topModelsQuery = `
            SELECT 
                COALESCE(model_used, model, 'Unknown') as model_name, 
                COUNT(*) as usage_count, 
                ROUND(AVG(rating), 1) as avg_rating 
            FROM gallery_items 
            WHERE COALESCE(model_used, model, '') != '' 
            GROUP BY model_name 
            ORDER BY usage_count DESC 
            LIMIT 20;
        `;
        const topModelsResult = await pool.query(topModelsQuery);

        // Query 2: Most Used Tags
        // The tags table has a usage_count column that we can query directly
        const topTagsQuery = `
            SELECT 
                name, 
                usage_count 
            FROM tags 
            WHERE usage_count > 0 
            ORDER BY usage_count DESC 
            LIMIT 30;
        `;
        const topTagsResult = await pool.query(topTagsQuery);

        res.json({
            topModels: topModelsResult.rows,
            topTags: topTagsResult.rows
        });

    } catch (err) {
        logger.error('Error fetching stats:', err);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;
