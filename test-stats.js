require('dotenv').config({ path: __dirname + '/server/.env' });
const { pool } = require('./server/db');

async function test() {
    try {
        console.log("Running Query...");
        const res = await pool.query(`
            SELECT 
                COALESCE(model_used, model, '') as model_name, 
                COUNT(*) as usage_count, 
                ROUND(AVG(rating), 1) as avg_rating 
            FROM gallery_items 
            WHERE COALESCE(model_used, model, '') != '' 
            GROUP BY model_name 
            ORDER BY usage_count DESC 
            LIMIT 20;
        `);
        console.log("Success!");
        console.log(res.rows);
    } catch (err) {
        console.error("Query Error:");
        console.error(err);
    } finally {
        await pool.end();
    }
}
test();
