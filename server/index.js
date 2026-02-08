require('dotenv').config();
console.log('🔍 ENV CHECK:');
console.log('  DB_PASSWORD exists?', !!process.env.DB_PASSWORD);
console.log('  DB_PASSWORD length:', process.env.DB_PASSWORD?.length);
console.log('  DB_USER:', process.env.DB_USER);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const createCrudRouter = require('./routes/crud');

// Mount generic CRUD routes
app.use('/api/prompts', createCrudRouter('prompts'));
app.use('/api/tags', createCrudRouter('tags'));
app.use('/api/characters', createCrudRouter('characters'));
// character_details is usually accessed via characters, but we can expose it directly or handle relations
app.use('/api/character_details', createCrudRouter('character_details'));
app.use('/api/gallery_items', createCrudRouter('gallery_items'));
app.use('/api/collections', createCrudRouter('collections'));

// Mock Auth Route
app.get('/api/auth/user', (req, res) => {
  res.json({
    id: '88ea3bcb-d9a8-44b5-ac26-c90885a74686',
    email: 'user@example.com',
    user_metadata: { name: 'Local User' }
  });
});

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
    console.error('Database connection error:', err);
    res.status(500).json({
      error: 'Database connection failed',
      details: err.message,
      hint: 'Ensure PostgreSQL is running and credentials in .env are correct'
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
