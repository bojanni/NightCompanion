require('dotenv').config({ path: __dirname + '/server/.env' });
const { pool } = require('./server/db');

async function test() {
    try {
        console.log("Running Top Models Query...");
        const res1 = await pool.query(`
            SELECT 
                COALESCE(model_used, model, 'Unknown') as model_name, 
                COUNT(*) as usage_count, 
                ROUND(AVG(rating), 1) as avg_rating 
            FROM gallery_items 
            WHERE COALESCE(model_used, model, '') != '' 
            GROUP BY model_name 
            ORDER BY usage_count DESC 
            LIMIT 20;
        `);
        console.log("Success! Models:", res1.rows.length);

        console.log("Running Top Tags Query...");
        const res2 = await pool.query(`
            SELECT 
                t.name, 
                COUNT(pt.prompt_id) as usage_count 
            FROM tags t
            JOIN prompt_tags pt ON t.id = pt.tag_id
            GROUP BY t.id, t.name
            ORDER BY usage_count DESC 
            LIMIT 30;
        `);
        console.log("Success! Tags:", res2.rows.length);

    } catch (err) {
        console.error("Query Error:", err);
    } finally {
        await pool.end();
    }
}
test();
