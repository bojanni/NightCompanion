const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Check if CSV file exists
function csvFileExists() {
  const csvPath = path.join(__dirname, '..', '..', 'csv', 'nightcafe_models_compleet.csv');
  return fs.existsSync(csvPath);
}

// Import function that can be called programmatically
async function importModels(force = false) {
  // Skip if CSV doesn't exist
  if (!csvFileExists()) {
    console.log('⚠️  CSV file not found, skipping NC models import');
    return;
  }
  
  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nightcompanion',
  });

  try {
    // Check if models already exist (skip if table is empty or doesn't exist)
    if (!force) {
      try {
        const existingCount = await pool.query('SELECT COUNT(*) FROM nc_models');
        if (parseInt(existingCount.rows[0].count) > 0) {
          console.log(`✓ nc_models table already has ${existingCount.rows[0].count} models, skipping import`);
          return;
        }
      } catch {
        // Table doesn't exist yet, will create it below
      }
    }

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
    console.log('✓ Created nc_models table');

    // Create indexes for filtering
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_nc_models_type ON nc_models(model_type);
      CREATE INDEX IF NOT EXISTS idx_nc_models_cost ON nc_models(cost_level);
      CREATE INDEX IF NOT EXISTS idx_nc_models_art ON nc_models(art_rating);
    `);
    console.log('✓ Created indexes');

    // Read and parse CSV
    const csvPath = path.join(__dirname, '..', 'csv', 'nightcafe_models_compleet.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    // Skip header
    const headers = lines[0].split(',');
    console.log(`✓ Found ${lines.length - 1} models in CSV`);

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

    console.log(`✓ Parsed ${models.length} models`);

    // Clear existing data and insert new
    await pool.query('TRUNCATE TABLE nc_models RESTART IDENTITY CASCADE');
    console.log('✓ Cleared existing nc_models data');

    // Insert in batches
    const batchSize = 20;
    for (let i = 0; i < models.length; i += batchSize) {
      const batch = models.slice(i, i + batchSize);
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

    console.log(`✓ Inserted ${models.length} models into database`);

    // Verify
    const result = await pool.query('SELECT COUNT(*) as count FROM nc_models');
    console.log(`✓ Database now has ${result.rows[0].count} models`);

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// CLI mode with safety check
async function main() {
  // Safety check to prevent accidental data loss when run manually
  if (process.env.CONFIRM_IMPORT === 'true') {
    await importModels(true);
  } else {
    console.log('⚠️  This script will TRUNCATE the nc_models table and import new data.');
    console.log('⚠️  All existing data will be permanently deleted.');
    console.log('');
    console.log('To proceed with import, run with:');
    console.log('  CONFIRM_IMPORT=true node server/scripts/import_nc_models.js');
    console.log('');
    console.log('Or add to your .env file:');
    console.log('  CONFIRM_IMPORT=true');
    process.exit(0);
  }
}

// Export for programmatic use
module.exports = { importModels };

// Run if called directly
if (require.main === module) {
  main();
}
