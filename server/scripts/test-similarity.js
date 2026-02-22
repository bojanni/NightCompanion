require('dotenv').config({ path: '../.env' });
const { pool } = require('../db');

async function testSimilarity() {
    console.log('Testing pg_trgm similarity...');

    // Insert some mock prompts
    const prompt1 = "A beautiful sunset over a calm ocean with vibrant orange and purple clouds";
    const prompt2 = "A gorgeous sunset over a calm ocean with vibrant pink and purple clouds";
    const prompt3 = "A cybernetic ninja flying through a neon city";

    try {
        await pool.query('INSERT INTO prompts (content) VALUES ($1), ($2), ($3)', [prompt1, prompt2, prompt3]);

        // Test query (similar to the endpoint)
        const testContent = "A beautiful sunset over the calm ocean with orange and purple clouds";

        console.log(`\nSearching for similarity to: "${testContent}"`);

        const res = await pool.query(`
            SELECT content, similarity(content, $1) as sim 
            FROM prompts 
            WHERE similarity(content, $1) > 0.5
            ORDER BY sim DESC 
            LIMIT 5
        `, [testContent]);

        console.log(`Found ${res.rowCount} similar prompts:`);
        res.rows.forEach(r => {
            console.log(`- [Sim: ${parseFloat(r.sim).toFixed(3)}] ${r.content}`);
        });

        // Cleanup
        await pool.query('DELETE FROM prompts WHERE content IN ($1, $2, $3)', [prompt1, prompt2, prompt3]);
        console.log('\nCleanup done.');

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await pool.end();
    }
}

testSimilarity();
