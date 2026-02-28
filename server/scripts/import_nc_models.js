const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { pool } = require('../db');
const logger = require('../lib/logger');

// Check if CSV file exists
function csvFileExists() {
  const csvPath = path.join(__dirname, '..', 'csv', 'nightcafe_models_compleet.csv');
  return fs.existsSync(csvPath);
}

// Import function that can be called programmatically
async function importModels(force = false) {
  // Skip if CSV doesn't exist
  if (!csvFileExists()) {
    logger.info('⚠️  CSV file not found, skipping NC models import');
    return { inserted: 0, updated: 0, deleted: 0, total: 0 };
  }
  
  // Using pool from ../db.js so it handles proper authentication parameters
  
  try {
    // Check if models table exists, create if not

    // Create nc_models table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nc_models (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        art_rating INTEGER CHECK (art_rating >= 1 AND art_rating <= 5),
        prompting_rating INTEGER CHECK (prompting_rating >= 1 AND prompting_rating <= 5),
        realism_rating INTEGER CHECK (realism_rating >= 1 AND realism_rating <= 5),
        typography_rating INTEGER CHECK (typography_rating >= 1 AND typography_rating <= 5),
        cost_level INTEGER CHECK (cost_level >= 1 AND cost_level <= 5),
        model_type VARCHAR(50) CHECK (model_type IN ('Image', 'Edit', 'Video')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    logger.info('✓ Created nc_models table');

    // Create indexes for filtering
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_nc_models_type ON nc_models(model_type);
      CREATE INDEX IF NOT EXISTS idx_nc_models_cost ON nc_models(cost_level);
      CREATE INDEX IF NOT EXISTS idx_nc_models_art ON nc_models(art_rating);
    `);
    logger.info('✓ Created indexes');

    // Read and parse CSV
    const csvPath = path.join(__dirname, '..', 'csv', 'nightcafe_models_compleet.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    // Skip header
    const headers = lines[0].split(',');
    logger.info(`✓ Found ${lines.length - 1} models in CSV`);

    // Parse each line
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

    logger.info(`✓ Parsed ${models.length} models from CSV`);

    // Get existing models
    const existingResult = await pool.query('SELECT name, description, art_rating, prompting_rating, realism_rating, typography_rating, cost_level, model_type FROM nc_models');
    const existingModels = new Map(existingResult.rows.map(m => [m.name, m]));

    const toInsert = [];
    const toUpdate = [];
    const csvModelNames = new Set(models.map(m => m.name));
    const toDelete = [];

    for (const model of models) {
      if (!existingModels.has(model.name)) {
        toInsert.push(model);
      } else {
        const ext = existingModels.get(model.name);
        
        const propsChanged = 
          ext.description !== model.description ||
          Number(ext.art_rating) !== model.art_rating ||
          Number(ext.prompting_rating) !== model.prompting_rating ||
          Number(ext.realism_rating) !== model.realism_rating ||
          Number(ext.typography_rating) !== model.typography_rating ||
          Number(ext.cost_level) !== model.cost_level ||
          ext.model_type !== model.model_type;

        if (propsChanged || force) {
          toUpdate.push(model);
        }
      }
    }

    for (const name of existingModels.keys()) {
      if (!csvModelNames.has(name)) {
        toDelete.push(name);
      }
    }

    if (toInsert.length === 0 && toUpdate.length === 0 && toDelete.length === 0) {
      logger.info('✓ No changes found. NC Models match DB exactly.');
      return { inserted: 0, updated: 0, deleted: 0, total: existingResult.rowCount };
    }

    logger.info(`✓ Sync evaluation: ${toInsert.length} new, ${toUpdate.length} updated, ${toDelete.length} deleted.`);

    if (toInsert.length > 0) {
      logger.info(`+ Added models: ${toInsert.map(m => m.name).join(', ')}`);
      const batchSize = 20;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        const values = [];
        const params = [];
        
        batch.forEach((model, idx) => {
          const offset = idx * 8;
          values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
          params.push(
            model.name,
            model.description,
            model.art_rating,
            model.prompting_rating,
            model.realism_rating,
            model.typography_rating,
            model.cost_level,
            model.model_type
          );
        });

        await pool.query(
          `INSERT INTO nc_models (name, description, art_rating, prompting_rating, realism_rating, typography_rating, cost_level, model_type) VALUES ${values.join(', ')}`,
          params
        );
      }
    }

    if (toUpdate.length > 0) {
      logger.info(`~ Updated models: ${toUpdate.map(m => m.name).join(', ')}`);
      for (const model of toUpdate) {
          await pool.query(`
            UPDATE nc_models SET 
              description = $1, art_rating = $2, prompting_rating = $3, 
              realism_rating = $4, typography_rating = $5, cost_level = $6, 
              model_type = $7, updated_at = CURRENT_TIMESTAMP
            WHERE name = $8
          `, [
            model.description, model.art_rating, model.prompting_rating, 
            model.realism_rating, model.typography_rating, model.cost_level, 
            model.model_type, model.name
          ]);
      }
    }
    
    if (toDelete.length > 0) {
      logger.info(`- Deleted models: ${toDelete.join(', ')}`);
      for (const name of toDelete) {
        await pool.query('DELETE FROM nc_models WHERE name = $1', [name]);
      }
    }

    // Verify
    const result = await pool.query('SELECT COUNT(*) as count FROM nc_models');
    logger.info(`✓ Database now has ${result.rows[0].count} total models`);

    return {
      inserted: toInsert.length,
      updated: toUpdate.length,
      deleted: toDelete.length,
      total: parseInt(result.rows[0].count)
    };

  } catch (error) {
    logger.error('Error:', error.message);
    throw error;
  }
}

// CLI mode with safety check
async function main() {
  // Safety check to prevent accidental data loss when run manually
  if (process.env.CONFIRM_IMPORT === 'true') {
    await importModels(true);
  } else {
    logger.info('⚠️  This script will SYNC the nc_models table based on the CSV data.');
    logger.info('');
    logger.info('To force an import regardless of differences, run with:');
    logger.info('  CONFIRM_IMPORT=true node server/scripts/import_nc_models.js');
    logger.info('');
    logger.info('Or add to your .env file:');
    logger.info('  CONFIRM_IMPORT=true');
    logger.info('Otherwise the sync is evaluated at server startup.');
    process.exit(0);
  }
}

// Export for programmatic use
module.exports = { importModels };

// Run if called directly
if (require.main === module) {
  main();
}
