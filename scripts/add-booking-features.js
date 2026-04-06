
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateBookingSchema() {
    console.log('Adding stay_duration and early_check_in to bookings table...');

    const { error } = await supabase.rpc('admin_sql', {
        sql_query: `
            -- Add stay_duration and early_check_in to bookings table
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS early_check_in BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS stay_duration INTEGER DEFAULT 1;

            -- Update existing bookings to have a default stay_duration of 1 if null
            UPDATE bookings SET stay_duration = 1 WHERE stay_duration IS NULL;
        `
    });

    if (error) {
        console.error('Error updating schema:', error);
    } else {
        console.log('Successfully updated bookings schema.');
    }
}

updateBookingSchema();
