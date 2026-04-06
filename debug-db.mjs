
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('Checking bookings...');
    const { data: b, error: be, count } = await supabase.from('bookings').select('*', { count: 'exact' });
    if (be) console.error('Bookings Error:', be);
    else console.log(`Bookings found: ${count} (Sample: ${b?.length})`);

    if (b && b.length > 0) {
        console.log('Statuses preset:', [...new Set(b.map(x => x.status))]);
    }

    console.log('Checking rooms...');
    const { data: r, error: re } = await supabase.from('rooms').select('number, status').limit(5);
    if (re) console.error('Rooms Error:', re);
    else console.log(`Rooms found: ${r?.length}`);

    console.log('Checking guests...');
    const { data: g, error: ge } = await supabase.from('guests').select('name').limit(5);
    if (ge) console.error('Guests Error:', ge);
    else console.log(`Guests found: ${g?.length}`);
}

debug();
