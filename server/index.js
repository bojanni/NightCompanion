require('dotenv').config();

const logger = require('./lib/logger');
const express = require('express');
const cors = require('cors');
const { pool } = require('./db');
const path = require('path');
const { initSchema } = require('./db-init');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const createCrudRouter = require('./routes/crud');
const apiKeysRouter = require('./routes/api-keys');
const localEndpointsRouter = require('./routes/local-endpoints');

// Mount generic CRUD routes
app.use('/api/prompts', createCrudRouter('prompts', ['title', 'content', 'notes']));
app.use('/api/tags', createCrudRouter('tags', ['name']));
app.use('/api/characters', createCrudRouter('characters', ['name', 'description']));
app.use('/api/character_details', createCrudRouter('character_details'));
app.use('/api/gallery_items', createCrudRouter('gallery_items', ['title', 'prompt_used', 'notes']));
app.use('/api/collections', createCrudRouter('collections'));
app.use('/api/prompt_tags', createCrudRouter('prompt_tags'));
app.use('/api/prompt_versions', createCrudRouter('prompt_versions'));
app.use('/api/style_profiles', createCrudRouter('style_profiles'));
app.use('/api/style_keywords', createCrudRouter('style_keywords'));
app.use('/api/style_learning', createCrudRouter('style_learning'));
app.use('/api/batch_tests', createCrudRouter('batch_tests'));
app.use('/api/batch_test_prompts', createCrudRouter('batch_test_prompts'));
app.use('/api/batch_test_results', createCrudRouter('batch_test_results'));
app.use('/api/model_usage', createCrudRouter('model_usage'));
app.use('/api/user_profiles', createCrudRouter('user_profiles'));

// API Keys & Local Endpoints
app.use('/api/user_api_keys', apiKeysRouter);
app.use('/api/user_local_endpoints', localEndpointsRouter);
app.use('/api/ai', require('./routes/ai'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/providers', require('./routes/providers'));
app.use('/api/usage', require('./routes/usage'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Test DB connection
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Database connection error:', err);
    res.status(500).json({
      error: 'Database connection failed',
      details: err.message,
      hint: 'Ensure PostgreSQL is running and credentials in .env are correct'
    });
  }
});

// Initialize DB and start server
initSchema().then(() => {
  logger.info('✅ Database check complete.');
  app.listen(port, () => {
    logger.info(`✅ Server running on http://localhost:${port}`);
  });
}).catch(err => {
  logger.error('❌ Failed to initialize database:', err);
  process.exit(1);
});
