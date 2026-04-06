
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

async function runMigration() {
    console.log('Running payments migration RPC...');

    const { error, data } = await supabase.rpc('admin_sql', {
        sql_query: `
            CREATE TABLE IF NOT EXISTS public.payments (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
                amount NUMERIC(10, 2) NOT NULL,
                method payment_mode NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );

            ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Authenticated users can manage payments'
                ) THEN
                    CREATE POLICY "Authenticated users can manage payments" ON public.payments FOR ALL USING (auth.role() = 'authenticated');
                END IF;
            END
            $$;
        `
    });

    if (error) {
        console.error('RPC failed:', error);

        // try another common RPC name just in case
        console.log('Trying exec_sql...');
        const res2 = await supabase.rpc('exec_sql', { sql_query: `SELECT 1;` });
        if (res2.error) {
            console.error('exec_sql also failed:', res2.error);
        } else {
            console.log('exec_sql works, trying migration via exec_sql...');
            const finalRes = await supabase.rpc('exec_sql', {
                sql_query: `
                CREATE TABLE IF NOT EXISTS public.payments (
                    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
                    amount NUMERIC(10, 2) NOT NULL,
                    method payment_mode NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
                );

                ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Authenticated users can manage payments'
                    ) THEN
                        CREATE POLICY "Authenticated users can manage payments" ON public.payments FOR ALL USING (auth.role() = 'authenticated');
                    END IF;
                END
                $$;
            `});
            if (finalRes.error) {
                console.error('Migration via exec_sql failed:', finalRes.error);
            } else {
                console.log('Migration successful via exec_sql!');
            }
        }
    } else {
        console.log('Migration successful via admin_sql!', data);
    }
}

runMigration();
