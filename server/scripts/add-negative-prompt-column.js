const { pool } = require('../db');

async function addNegativePromptColumn() {
  try {
    // Check if column already exists
    const { rows: existing } = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'prompts' AND column_name = 'negative_prompt'
    `);

    if (existing.length > 0) {
      console.log('Column negative_prompt already exists in prompts table');
      return;
    }

    // Add the column
    await pool.query(`
      ALTER TABLE prompts 
      ADD COLUMN negative_prompt TEXT
    `);

    console.log('Successfully added negative_prompt column to prompts table');
  } catch (error) {
    console.error('Error adding negative_prompt column:', error);
  } finally {
    pool.end();
    process.exit(0);
  }
}

addNegativePromptColumn();
