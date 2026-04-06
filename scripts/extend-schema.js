
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../pms/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function extendSchema() {
    console.log('Extending schema with hotel_settings...');

    const { error } = await supabase.rpc('admin_sql', {
        sql_query: `
            -- Create hotel_settings table
            CREATE TABLE IF NOT EXISTS hotel_settings (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                hotel_name TEXT DEFAULT 'My Hotel',
                gstin TEXT,
                cgst_rate NUMERIC(5, 2) DEFAULT 6.00,
                sgst_rate NUMERIC(5, 2) DEFAULT 6.00,
                currency TEXT DEFAULT 'INR',
                address TEXT,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );

            -- Enable RLS
            ALTER TABLE hotel_settings ENABLE ROW LEVEL SECURITY;

            -- Policies
            DROP POLICY IF EXISTS "Public read access for hotel_settings" ON hotel_settings;
            CREATE POLICY "Public read access for hotel_settings" ON hotel_settings FOR SELECT USING (true);

            DROP POLICY IF EXISTS "Admins can update hotel_settings" ON hotel_settings;
            CREATE POLICY "Admins can update hotel_settings" ON hotel_settings FOR UPDATE USING (
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
            );

            -- Ensure single row
            CREATE OR REPLACE FUNCTION check_hotel_settings_count()
            RETURNS TRIGGER AS $$
            BEGIN
              IF (SELECT COUNT(*) FROM hotel_settings) > 0 THEN
                RAISE EXCEPTION 'Only one row allowed in hotel_settings';
              END IF;
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS tr_limit_hotel_settings ON hotel_settings;
            CREATE TRIGGER tr_limit_hotel_settings
            BEFORE INSERT ON hotel_settings
            FOR EACH ROW EXECUTE PROCEDURE check_hotel_settings_count();

            -- Insert default row if not exists
            INSERT INTO hotel_settings (hotel_name, currency)
            SELECT 'My Hotel', 'INR'
            WHERE NOT EXISTS (SELECT 1 FROM hotel_settings);
        `
    }).catch(e => ({ error: e }));

    // If RPC fails (maybe no admin_sql function), try direct execution or log it
    // Wait, I should check if I have an admin_sql RPC or if I can just run it via a script
    // Previous scripts used a different approach? Let me check run-schema.js
}

extendSchema();
