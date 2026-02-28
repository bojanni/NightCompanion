const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

let cachedModels = null;
let lastModifiedTime = 0;

// Function to parse CSV file
function parseCSV() {
  const csvPath = path.join(__dirname, '..', 'csv', 'nightcafe_models_compleet.csv');
  
  try {
    const stats = fs.statSync(csvPath);
    if (cachedModels && stats.mtimeMs <= lastModifiedTime) {
      return cachedModels;
    }
    lastModifiedTime = stats.mtimeMs;
  } catch (err) {
    // If stat fails (e.g. file deleted), but we have cache, return cache
    if (cachedModels) return cachedModels;
    return [];
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  
  // Skip header
  const models = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Handle CSV with commas inside quotes
    const parts = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());

    if (parts.length >= 8) {
      const name = parts[0].replace(/^"|"$/g, '');
      const description = parts[1].replace(/^"|"$/g, '');
      
      // Parse star ratings (convert ★ to number)
      const artRating = (parts[2].match(/★/g) || []).length;
      const promptingRating = (parts[3].match(/★/g) || []).length;
      const realismRating = (parts[4].match(/★/g) || []).length;
      const typographyRating = (parts[5].match(/★/g) || []).length;
      
      // Parse cost level (convert $ to number)
      const costLevel = (parts[6].match(/\$/g) || []).length;
      
      // Parse type
      const modelType = parts[7].replace(/^"|"$/g, '');

      models.push({
        id: i, // Add synthetic ID
        name,
        description,
        art_rating: artRating,
        prompting_rating: promptingRating,
        realism_rating: realismRating,
        typography_rating: typographyRating,
        cost_level: costLevel,
        model_type: modelType
      });
    }
  }
  cachedModels = models;
  return models;
}

// GET /api/nc-models - Get all NightCafe models with filtering and sorting
router.get('/', async (req, res, next) => {
  try {
    const { type, min_cost, max_cost, sort_by, sort_order, search } = req.query;
    
    // Load and parse CSV
    const allModels = parseCSV();
    
    // Apply filters
    let filteredModels = allModels.filter(model => {
      // Filter by type
      if (type && type !== 'all' && model.model_type !== type) {
        return false;
      }
      
      // Filter by cost range
      if (min_cost && model.cost_level < parseInt(min_cost)) {
        return false;
      }
      if (max_cost && model.cost_level > parseInt(max_cost)) {
        return false;
      }
      
      // Search by name or description
      if (search) {
        const searchLower = search.toLowerCase();
        const nameMatch = model.name.toLowerCase().includes(searchLower);
        const descMatch = model.description.toLowerCase().includes(searchLower);
        if (!nameMatch && !descMatch) {
          return false;
        }
      }
      
      return true;
    });
    
    // Sorting
    const validSortFields = ['name', 'art_rating', 'prompting_rating', 'realism_rating', 'typography_rating', 'cost_level'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'name';
    const sortOrder = sort_order === 'asc' ? 'asc' : 'desc';
    
    filteredModels.sort((a, b) => {
      if (sortField === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      }
      
      if (a[sortField] < b[sortField]) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (a[sortField] > b[sortField]) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    res.json(filteredModels);
  } catch (err) {
    console.error('Error fetching nc_models:', err);
    next(err);
  }
});

// GET /api/nc-models/stats/summary - Get model statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const allModels = parseCSV();
    
    const statsByType = {};
    allModels.forEach(model => {
      if (!statsByType[model.model_type]) {
        statsByType[model.model_type] = {
          count: 0,
          total_cost: 0,
          total_art: 0,
          total_prompting: 0,
          total_realism: 0,
          total_typography: 0
        };
      }
      
      const typeStats = statsByType[model.model_type];
      typeStats.count++;
      typeStats.total_cost += model.cost_level;
      typeStats.total_art += model.art_rating;
      typeStats.total_prompting += model.prompting_rating;
      typeStats.total_realism += model.realism_rating;
      typeStats.total_typography += model.typography_rating;
    });
    
    const byType = Object.entries(statsByType).map(([model_type, stats]) => ({
      model_type,
      count: stats.count,
      avg_cost: stats.total_cost / stats.count,
      avg_art: stats.total_art / stats.count,
      avg_prompting: stats.total_prompting / stats.count,
      avg_realism: stats.total_realism / stats.count,
      avg_typography: stats.total_typography / stats.count
    }));
    
    res.json({
      total: allModels.length,
      byType
    });
  } catch (err) {
    console.error('Error fetching nc_models stats:', err);
    next(err);
  }
});

// POST /api/nc-models/sync - Sync models from CSV to database
router.post('/sync', async (req, res, next) => {
  try {
    // Basic localhost restriction
    const clientIp = req.socket.remoteAddress;
    const isLocalhost = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
    
    if (!isLocalhost && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Sync can only be triggered from localhost' });
    }

    const { importModels } = require('../scripts/import_nc_models');
    const stats = await importModels(true);
    
    res.json({ 
      success: true, 
      message: 'Sync completed',
      ...stats
    });
  } catch (err) {
    console.error('Error syncing models:', err);
    next(err);
  }
});

// GET /api/nc-models/:id - Get single model by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const allModels = parseCSV();
    const model = allModels.find(m => m.id === parseInt(id));
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    res.json(model);
  } catch (err) {
    console.error('Error fetching nc_model:', err);
    next(err);
  }
});



module.exports = router;
