const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = 'postgresql://postgres.qrddpyqoxhsqurkkusdd:PMS%40hng12345q%23@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
    console.log('🚀 Running Migration: marketing_campaigns...');
    
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const sql = `
            -- Create Marketing Campaigns table
            CREATE TABLE IF NOT EXISTS marketing_campaigns (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                description TEXT,
                audience_type TEXT NOT NULL CHECK (audience_type IN ('hotel_guests', 'restaurant_customers')),
                content TEXT NOT NULL,
                media_url TEXT,
                status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
                total_recipients INTEGER DEFAULT 0,
                successful_sends INTEGER DEFAULT 0,
                failed_sends INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
                created_by UUID REFERENCES profiles(id)
            );

            -- Enable RLS
            ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

            -- Policies
            DROP POLICY IF EXISTS "Staff can manage campaigns" ON marketing_campaigns;
            CREATE POLICY "Staff can manage campaigns" ON marketing_campaigns
                USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

            -- Create index for faster lookups
            CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
            CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_at ON marketing_campaigns(created_at);
        `;

        await client.query(sql);
        console.log('✅ Migration applied successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await client.end();
    }
}

runMigration();
