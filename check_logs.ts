import { createClient } from './src/utils/supabase/server';

async function checkLogs() {
    const supabase = await createClient();
    const { data } = await supabase.from('night_audit_logs').select('*').order('audit_date', { ascending: false }).limit(5);
    console.log('Logs:', JSON.stringify(data, null, 2));
}

checkLogs();
