const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/nc-models - Get all NightCafe models with filtering and sorting
router.get('/', async (req, res, next) => {
  try {
    const { type, min_cost, max_cost, sort_by, sort_order, search } = req.query;
    
    let query = 'SELECT * FROM nc_models WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Filter by type (Image, Edit, Video)
    if (type && type !== 'all') {
      query += ` AND model_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    // Filter by cost range
    if (min_cost) {
      query += ` AND cost_level >= $${paramIndex}`;
      params.push(parseInt(min_cost));
      paramIndex++;
    }
    if (max_cost) {
      query += ` AND cost_level <= $${paramIndex}`;
      params.push(parseInt(max_cost));
      paramIndex++;
    }

    // Search by name or description
    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Sorting
    const validSortFields = ['name', 'art_rating', 'prompting_rating', 'realism_rating', 'typography_rating', 'cost_level'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'name';
    const sortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortField} ${sortOrder}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching nc_models:', err);
    next(err);
  }
});

// GET /api/nc-models/:id - Get single model by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM nc_models WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching nc_model:', err);
    next(err);
  }
});

// GET /api/nc-models/stats/summary - Get model statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        model_type,
        COUNT(*) as count,
        AVG(cost_level) as avg_cost,
        AVG(art_rating) as avg_art,
        AVG(prompting_rating) as avg_prompting,
        AVG(realism_rating) as avg_realism,
        AVG(typography_rating) as avg_typography
      FROM nc_models 
      GROUP BY model_type
    `);
    
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM nc_models');
    
    res.json({
      total: parseInt(totalResult.rows[0].total),
      byType: result.rows
    });
  } catch (err) {
    console.error('Error fetching nc_models stats:', err);
    next(err);
  }
});

module.exports = router;
