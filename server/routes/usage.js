const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const logger = require('../lib/logger');

// GET /api/usage?from=<ISO>&to=<ISO>
// Returns aggregated totals for the given period, grouped by provider/model.
router.get('/', async (req, res) => {
    try {
        const { from, to, session_id } = req.query;

        const values = [];
        const conditions = [];
        let idx = 1;

        if (from) {
            conditions.push(`created_at >= $${idx++}`);
            values.push(from);
        }
        if (to) {
            conditions.push(`created_at <= $${idx++}`);
            values.push(to);
        }
        if (session_id) {
            conditions.push(`session_id = $${idx++}`);
            values.push(session_id);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Overall totals
        const totalsResult = await pool.query(`
            SELECT
                COUNT(*)::int                          AS calls,
                COALESCE(SUM(prompt_tokens),0)::int    AS prompt_tokens,
                COALESCE(SUM(completion_tokens),0)::int AS completion_tokens,
                COALESCE(SUM(estimated_cost_usd),0)   AS total_cost_usd
            FROM api_usage_log ${where}
        `, values);

        // Per provider breakdown
        const breakdownResult = await pool.query(`
            SELECT
                provider,
                model,
                COUNT(*)::int                          AS calls,
                COALESCE(SUM(prompt_tokens),0)::int    AS prompt_tokens,
                COALESCE(SUM(completion_tokens),0)::int AS completion_tokens,
                COALESCE(SUM(estimated_cost_usd),0)   AS total_cost_usd
            FROM api_usage_log ${where}
            GROUP BY provider, model
            ORDER BY total_cost_usd DESC
        `, values);

        res.json({
            totals: totalsResult.rows[0],
            breakdown: breakdownResult.rows,
        });
    } catch (err) {
        logger.error('Usage stats error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/usage — log a single entry (called by server after each AI call)
router.post('/', async (req, res) => {
    try {
        const {
            session_id, action, provider, model,
            prompt_tokens = 0, completion_tokens = 0, estimated_cost_usd = 0
        } = req.body;

        await pool.query(`
            INSERT INTO api_usage_log
                (session_id, action, provider, model, prompt_tokens, completion_tokens, estimated_cost_usd)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [session_id, action, provider, model, prompt_tokens, completion_tokens, estimated_cost_usd]);

        res.status(201).json({ ok: true });
    } catch (err) {
        logger.error('Usage log insert error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
