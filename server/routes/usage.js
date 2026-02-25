const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const logger = require('../lib/logger');

// GET /api/usage/dashboard → combined dashboard stats
router.get('/dashboard', async (req, res) => {
    try {
        const { from, to } = req.query;
        
        // Determine date boundaries
        let rangeStart, rangeEnd;
        
        if (from && to) {
            // Use provided date range
            rangeStart = new Date(from);
            rangeEnd = new Date(to);
            rangeEnd.setHours(23, 59, 59, 999); // End of day
        } else {
            // Default to this month
            rangeStart = new Date();
            rangeStart.setDate(1);
            rangeStart.setHours(0, 0, 0, 0);
            
            rangeEnd = new Date();
            rangeEnd.setHours(23, 59, 59, 999);
        }
        
        // Today boundary for today's stats
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Fetch User Budget (assuming stored in user_profiles.user_metadata or a new settings table - we'll use user_profiles for now since it exists)
        // Default budget if none is set
        let monthly_limit_usd = 25.00;

        try {
            const userRes = await pool.query(`SELECT user_metadata FROM user_profiles LIMIT 1`);
            if (userRes.rows.length > 0 && userRes.rows[0].user_metadata?.monthly_budget_usd) {
                monthly_limit_usd = parseFloat(userRes.rows[0].user_metadata.monthly_budget_usd);
            }
        } catch (e) {
            logger.warn('Could not fetch user budget:', e.message);
        }

        // Global Totals for the requested range
        const rangeTotalsRes = await pool.query(`
            SELECT
                COUNT(*)::int AS requests,
                COALESCE(SUM(prompt_tokens), 0)::int AS prompt_tokens,
                COALESCE(SUM(completion_tokens), 0)::int AS completion_tokens,
                COALESCE(SUM(estimated_cost_usd), 0) AS cost_usd
            FROM api_usage_log
            WHERE created_at >= $1 AND created_at <= $2
        `, [rangeStart.toISOString(), rangeEnd.toISOString()]);

        const todayTotalsRes = await pool.query(`
            SELECT COALESCE(SUM(estimated_cost_usd), 0) AS cost_usd
            FROM api_usage_log
            WHERE created_at >= $1 AND created_at <= $2
        `, [todayStart.toISOString(), rangeEnd.toISOString()]);

        const topProviderRes = await pool.query(`
            SELECT provider, COUNT(*) as count 
            FROM api_usage_log WHERE created_at >= $1 AND created_at <= $2 AND provider IS NOT NULL
            GROUP BY provider ORDER BY count DESC LIMIT 1
        `, [rangeStart.toISOString(), rangeEnd.toISOString()]);

        const topModelRes = await pool.query(`
            SELECT model, COUNT(*) as count 
            FROM api_usage_log WHERE created_at >= $1 AND created_at <= $2 AND model IS NOT NULL
            GROUP BY model ORDER BY count DESC LIMIT 1
        `, [rangeStart.toISOString(), rangeEnd.toISOString()]);

        // Per Provider Breakdown for the requested range
        const providersRes = await pool.query(`
            SELECT 
                provider,
                SUM(CASE WHEN created_at >= $1 AND created_at <= $2 THEN 1 ELSE 0 END)::int AS today_requests,
                COALESCE(SUM(CASE WHEN created_at >= $1 AND created_at <= $2 THEN prompt_tokens ELSE 0 END), 0)::int AS today_prompt_tokens,
                COALESCE(SUM(CASE WHEN created_at >= $1 AND created_at <= $2 THEN completion_tokens ELSE 0 END), 0)::int AS today_completion_tokens,
                COALESCE(SUM(CASE WHEN created_at >= $1 AND created_at <= $2 THEN estimated_cost_usd ELSE 0 END), 0) AS today_cost_usd,
                
                SUM(CASE WHEN created_at >= $3 AND created_at <= $4 THEN 1 ELSE 0 END)::int AS month_requests,
                COALESCE(SUM(CASE WHEN created_at >= $3 AND created_at <= $4 THEN prompt_tokens ELSE 0 END), 0)::int AS month_prompt_tokens,
                COALESCE(SUM(CASE WHEN created_at >= $3 AND created_at <= $4 THEN completion_tokens ELSE 0 END), 0)::int AS month_completion_tokens,
                COALESCE(SUM(CASE WHEN created_at >= $3 AND created_at <= $4 THEN estimated_cost_usd ELSE 0 END), 0) AS month_cost_usd
            FROM api_usage_log
            WHERE created_at >= $3 AND created_at <= $4 AND provider IS NOT NULL
            GROUP BY provider
        `, [todayStart.toISOString(), rangeEnd.toISOString(), rangeStart.toISOString(), rangeEnd.toISOString()]);

        const modelsRes = await pool.query(`
            SELECT provider, model, COUNT(*)::int AS requests, 
                   COALESCE(SUM(prompt_tokens), 0)::int AS prompt_tokens, 
                   COALESCE(SUM(completion_tokens), 0)::int AS completion_tokens, 
                   COALESCE(SUM(estimated_cost_usd), 0) AS cost_usd
            FROM api_usage_log
            WHERE created_at >= $1 AND created_at <= $2 AND provider IS NOT NULL AND model IS NOT NULL
            GROUP BY provider, model
        `, [rangeStart.toISOString(), rangeEnd.toISOString()]);

        // Rate Limit Windows (last 15 minutes logic)
        // Hardcoded limit for now, ideally fetched from a settings table per provider
        const windowMinutes = 15;
        const maxRequests = 500;
        const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

        const windowRes = await pool.query(`
            SELECT provider, COUNT(*)::int AS requests_used
            FROM api_usage_log
            WHERE created_at >= $1 AND provider IS NOT NULL
            GROUP BY provider
        `, [windowStart.toISOString()]);

        const windowMap = {};
        windowRes.rows.forEach(r => windowMap[r.provider] = r.requests_used);

        const providers = providersRes.rows.map(p => {
            const used = windowMap[p.provider] || 0;
            return {
                provider: p.provider,
                limit: { max_requests: maxRequests, window_minutes: windowMinutes, enabled: true },
                current_window: {
                    requests_used: used,
                    requests_remaining: Math.max(0, maxRequests - used),
                    window_resets_at: new Date(Date.now() + windowMinutes * 60 * 1000).toISOString(), // rough approx
                    percent_used: (used / maxRequests) * 100
                },
                today: {
                    requests: p.today_requests,
                    prompt_tokens: p.today_prompt_tokens,
                    completion_tokens: p.today_completion_tokens,
                    cost_usd: p.today_cost_usd
                },
                this_month: {
                    requests: p.month_requests,
                    prompt_tokens: p.month_prompt_tokens,
                    completion_tokens: p.month_completion_tokens,
                    cost_usd: p.month_cost_usd
                },
                 models: modelsRes.rows.filter(m => m.provider === p.provider).map(m => ({
                    model: m.model,
                    requests: m.requests,
                    prompt_tokens: m.prompt_tokens,
                    completion_tokens: m.completion_tokens,
                    cost_usd: m.cost_usd
                }))
            };
        });

        // Budget Calculation
        const current_spend_usd = Number(rangeTotalsRes.rows[0]?.cost_usd || 0);
        const percent_used = monthly_limit_usd > 0 ? (current_spend_usd / monthly_limit_usd) * 100 : 0;

        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysPassed = now.getDate();
        const projected_month_end_usd = daysPassed > 0 ? (current_spend_usd / daysPassed) * daysInMonth : 0;

        res.json({
            providers,
            totals: {
                today_cost_usd: Number(todayTotalsRes.rows[0]?.cost_usd || 0),
                this_month_cost_usd: current_spend_usd,
                this_month_requests: Number(rangeTotalsRes.rows[0]?.requests || 0),
                this_month_prompt_tokens: Number(rangeTotalsRes.rows[0]?.prompt_tokens || 0),
                this_month_completion_tokens: Number(rangeTotalsRes.rows[0]?.completion_tokens || 0),
                most_used_provider: topProviderRes.rows[0]?.provider || 'N/A',
                most_used_model: topModelRes.rows[0]?.model || 'N/A'
            },
            budget: {
                monthly_limit_usd,
                current_spend_usd,
                percent_used,
                projected_month_end_usd
            }
        });

    } catch (err) {
        logger.error('Dashboard stats error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/usage/history
router.get('/history', async (req, res) => {
    try {
        const { provider = 'all', period = '30d', groupBy = 'day' } = req.query;

        let days = 30;
        if (period === '7d') days = 7;
        if (period === '90d') days = 90;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        let providerFilter = '';
        const values = [startDate.toISOString()];
        if (provider !== 'all') {
            providerFilter = `AND provider = $2`;
            values.push(provider);
        }

        const query = `
            SELECT 
                DATE(created_at) as date,
                ${provider === 'all' ? "'all' as provider" : 'provider'},
                COUNT(*)::int as requests,
                COALESCE(SUM(estimated_cost_usd), 0) as cost_usd,
                COALESCE(SUM(prompt_tokens + completion_tokens), 0)::int as tokens
            FROM api_usage_log
            WHERE created_at >= $1 ${providerFilter}
            GROUP BY DATE(created_at) ${provider === 'all' ? '' : ', provider'}
            ORDER BY date ASC
        `;

        const historyRes = await pool.query(query, values);
        res.json(historyRes.rows);

    } catch (err) {
        logger.error('History stats error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/usage/budget
router.post('/budget', async (req, res) => {
    try {
        const { monthly_budget_usd, warning_at_percent } = req.body;

        // Fetch current to merge
        const userRes = await pool.query(`SELECT id, user_metadata FROM user_profiles LIMIT 1`);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User profile not found' });

        const profile = userRes.rows[0];
        const updatedMeta = {
            ...(profile.user_metadata || {}),
            monthly_budget_usd: monthly_budget_usd || 25.00,
            budget_warning_percent: warning_at_percent || 80
        };

        await pool.query(`UPDATE user_profiles SET user_metadata = $1 WHERE id = $2`, [updatedMeta, profile.id]);

        res.json({ ok: true, budget: updatedMeta });
    } catch (err) {
        logger.error('Update budget error:', err.message);
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
