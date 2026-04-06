const { Client } = require('pg');

const connStr = 'postgresql://postgres.qrddpyqoxhsqurkkusdd:PMS%40hng12345q%23@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function setupCustomLogs() {
    const client = new Client({ connectionString: connStr });
    await client.connect();

    try {
        // 1. Create the table
        await client.query(`
      CREATE TABLE IF NOT EXISTS public.staff_activity_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
          action VARCHAR NOT NULL,
          details TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );
      
      -- Optional indexes for fast querying
      CREATE INDEX IF NOT EXISTS idx_staff_logs_staff_id ON public.staff_activity_logs(staff_id);
      CREATE INDEX IF NOT EXISTS idx_staff_logs_created ON public.staff_activity_logs(created_at DESC);
    `);

        // 2. Create the trigger function
        await client.query(`
      CREATE OR REPLACE FUNCTION public.log_auth_user_changes()
      RETURNS TRIGGER AS $$
      BEGIN
          IF TG_OP = 'UPDATE' THEN
              -- Detect login by checking if last_sign_in_at changed
              IF OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at AND NEW.last_sign_in_at IS NOT NULL THEN
                  -- Only log if the user exists in profiles to avoid foreign key errors
                  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
                      INSERT INTO public.staff_activity_logs (staff_id, action, details)
                      VALUES (NEW.id, 'login', 'User logged in');
                  END IF;
              END IF;
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

        // 3. Attach trigger to auth.users
        await client.query(`
      DROP TRIGGER IF EXISTS auth_user_changes_trigger ON auth.users;
      CREATE TRIGGER auth_user_changes_trigger
      AFTER INSERT OR UPDATE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.log_auth_user_changes();
    `);

        console.log('Successfully created custom staff_activity_logs table and auth.users trigger.');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

setupCustomLogs();
