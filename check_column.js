
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn() {
    const { data, error } = await supabase
        .from('prompts')
        .select('suggested_model')
        .limit(1);

    if (error) {
        console.error('Error selecting suggested_model:', error);
    } else {
        console.log('Column suggested_model exists. Data:', data);
    }
}

checkColumn();
