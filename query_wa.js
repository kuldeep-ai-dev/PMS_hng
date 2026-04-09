require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from('whatsapp_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
    console.log(JSON.stringify(data, null, 2));
}
main();
