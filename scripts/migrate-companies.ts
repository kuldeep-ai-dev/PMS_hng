import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function migrate() {
    // Direct Connection String (Port 5432)
    const user = 'postgres';
    const password = encodeURIComponent('PMS@hng12345q#');
    const host = 'db.qrddpyqoxhsqurkkusdd.supabase.co';
    const port = '5432';
    const dbname = 'postgres';

    const connectionString = `postgresql://${user}:${password}@${host}:${port}/${dbname}`;

    console.log('🔗 Attempting direct connection to:', host);
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('✅ Connected to Supabase DB');

        const sql = `
-- 1. Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gstin TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  contact_person TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Link bookings to companies
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='company_id') THEN
        ALTER TABLE bookings ADD COLUMN company_id UUID REFERENCES companies(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='bill_to_company') THEN
        ALTER TABLE bookings ADD COLUMN bill_to_company BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
        `;

        console.log('🚀 Applying migration...');
        await client.query(sql);
        console.log('🎉 Migration applied successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
