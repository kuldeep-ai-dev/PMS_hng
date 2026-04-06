const dotenv = require('dotenv');
const path = require('path');
const https = require('https');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

// Use Supabase SQL execution via REST
async function executeSql(sql) {
    const url = new URL('/rest/v1/rpc/exec_sql', supabaseUrl);
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ sql });
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// Alternative: use Supabase's pg proxy endpoint
async function runSetup() {
    console.log('🚀 Setting up Restaurant Module database tables...');
    console.log('   Using Supabase URL:', supabaseUrl);
    console.log('');
    
    // We'll use the Supabase Management API instead
    // First let's try direct table creation via the supabase-js client
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const tables = [
        {
            name: 'restaurant_categories',
            sql: `
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                name text NOT NULL UNIQUE,
                display_order integer DEFAULT 0,
                created_at timestamptz DEFAULT now()
            `
        },
        {
            name: 'restaurant_menu_items',
            sql: `
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                category_id uuid,
                name text NOT NULL,
                description text,
                price numeric(10,2) NOT NULL,
                image_url text,
                is_veg boolean DEFAULT true,
                is_available boolean DEFAULT true,
                created_at timestamptz DEFAULT now()
            `
        },
        {
            name: 'restaurant_tables',
            sql: `
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                table_number text NOT NULL UNIQUE,
                capacity integer DEFAULT 2,
                qr_code_url text,
                status text DEFAULT 'available',
                created_at timestamptz DEFAULT now()
            `
        },
        {
            name: 'restaurant_orders',
            sql: `
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                table_id uuid,
                room_id uuid,
                guest_id uuid,
                status text DEFAULT 'pending',
                total_amount numeric(10,2) DEFAULT 0,
                payment_status text DEFAULT 'unpaid',
                order_source text DEFAULT 'pos_walkin',
                created_at timestamptz DEFAULT now(),
                updated_at timestamptz DEFAULT now()
            `
        },
        {
            name: 'restaurant_order_items',
            sql: `
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                order_id uuid,
                menu_item_id uuid,
                quantity integer NOT NULL DEFAULT 1,
                price_at_time numeric(10,2) NOT NULL,
                notes text,
                created_at timestamptz DEFAULT now()
            `
        }
    ];

    let allGood = true;

    for (const table of tables) {
        // Check if table exists by trying to select from it
        const { error: checkError } = await supabase.from(table.name).select('id').limit(1);
        
        if (checkError && checkError.code === '42P01') {
            // Table doesn't exist - we need to create it
            console.log(`⚠️  Table "${table.name}" does not exist yet.`);
            allGood = false;
        } else if (checkError && checkError.code !== 'PGRST116') {
            console.log(`❓ Table "${table.name}": ${checkError.message}`);
        } else {
            console.log(`✅ Table "${table.name}" already exists!`);
        }
    }

    console.log('');
    if (!allGood) {
        console.log('❌ Some tables are missing. Please create them using the Supabase SQL Editor.');
        console.log('');
        console.log('Go to: https://supabase.com/dashboard/project/qrddpyqoxhsqurkkusdd/sql/new');
        console.log('');
        console.log('Paste and run this SQL:');
        console.log('=========================================================================');
        console.log(`
-- 1. Categories
CREATE TABLE IF NOT EXISTS restaurant_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Menu Items
CREATE TABLE IF NOT EXISTS restaurant_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES restaurant_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    is_veg BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tables
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number TEXT NOT NULL UNIQUE,
    capacity INTEGER DEFAULT 2,
    qr_code_url TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance', 'cleaning')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Orders
CREATE TABLE IF NOT EXISTS restaurant_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'billed', 'cancelled')),
    total_amount NUMERIC(10, 2) DEFAULT 0,
    payment_status TEXT DEFAULT 'unpaid',
    order_source TEXT DEFAULT 'pos_walkin',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Order Items
CREATE TABLE IF NOT EXISTS restaurant_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES restaurant_orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES restaurant_menu_items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_time NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE restaurant_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_order_items ENABLE ROW LEVEL SECURITY;

-- Public read access for menu & tables (QR app)
CREATE POLICY IF NOT EXISTS "Public read categories" ON restaurant_categories FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read menu" ON restaurant_menu_items FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read tables" ON restaurant_tables FOR SELECT USING (true);

-- Public can place orders via QR
CREATE POLICY IF NOT EXISTS "Public insert orders" ON restaurant_orders FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Public insert order items" ON restaurant_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Public read orders" ON restaurant_orders FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read order items" ON restaurant_order_items FOR SELECT USING (true);

-- Staff full access
CREATE POLICY IF NOT EXISTS "Staff manage categories" ON restaurant_categories USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'restaurant_staff')));
CREATE POLICY IF NOT EXISTS "Staff manage menu" ON restaurant_menu_items USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'restaurant_staff')));
CREATE POLICY IF NOT EXISTS "Staff manage tables" ON restaurant_tables USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'restaurant_staff')));
CREATE POLICY IF NOT EXISTS "Staff manage orders" ON restaurant_orders USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'restaurant_staff')));
CREATE POLICY IF NOT EXISTS "Staff manage order items" ON restaurant_order_items USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'restaurant_staff')));
        `);
        console.log('=========================================================================');
    } else {
        console.log('🎉 All restaurant tables exist! You are good to go.');
    }
}

runSetup().catch(console.error);
