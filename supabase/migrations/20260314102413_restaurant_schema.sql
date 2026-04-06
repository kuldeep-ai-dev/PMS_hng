            -- Enable UUID extension
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

            -- 1. Restaurant Categories
            CREATE TABLE IF NOT EXISTS restaurant_categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL UNIQUE,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );

            -- 2. Restaurant Menu Items
            CREATE TABLE IF NOT EXISTS restaurant_menu_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                category_id UUID REFERENCES restaurant_categories(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                description TEXT,
                price NUMERIC(10, 2) NOT NULL,
                image_url TEXT,
                is_veg BOOLEAN DEFAULT true,
                is_available BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );

            -- 3. Restaurant Tables
            CREATE TABLE IF NOT EXISTS restaurant_tables (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                table_number TEXT NOT NULL UNIQUE,
                capacity INTEGER DEFAULT 2,
                qr_code_url TEXT,
                status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );

            -- 4. Restaurant Orders
            CREATE TABLE IF NOT EXISTS restaurant_orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
                room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
                guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'billed', 'cancelled')),
                total_amount NUMERIC(10, 2) DEFAULT 0,
                payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'room_charge')),
                order_source TEXT DEFAULT 'pos' CHECK (order_source IN ('pos', 'qr_table', 'qr_room')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );

            -- Ensure order_source exists if table was already present
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'restaurant_orders'
                ) THEN
                    ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'pos';
                END IF;
            END $$;

            -- 5. Restaurant Order Items
            CREATE TABLE IF NOT EXISTS restaurant_order_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                order_id UUID REFERENCES restaurant_orders(id) ON DELETE CASCADE,
                menu_item_id UUID REFERENCES restaurant_menu_items(id) ON DELETE RESTRICT,
                quantity INTEGER NOT NULL CHECK (quantity > 0),
                price_at_time NUMERIC(10, 2) NOT NULL,
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );

            -- ENABLE ROW LEVEL SECURITY
            ALTER TABLE restaurant_categories ENABLE ROW LEVEL SECURITY;
            ALTER TABLE restaurant_menu_items ENABLE ROW LEVEL SECURITY;
            ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
            ALTER TABLE restaurant_orders ENABLE ROW LEVEL SECURITY;
            ALTER TABLE restaurant_order_items ENABLE ROW LEVEL SECURITY;

            -- DROP EXISTING POLICIES (for idempotency)
            DROP POLICY IF EXISTS "Public read access for categories" ON restaurant_categories;
            DROP POLICY IF EXISTS "Staff full access for categories" ON restaurant_categories;
            DROP POLICY IF EXISTS "Public read access for menu" ON restaurant_menu_items;
            DROP POLICY IF EXISTS "Staff full access for menu" ON restaurant_menu_items;
            DROP POLICY IF EXISTS "Public read access for tables" ON restaurant_tables;
            DROP POLICY IF EXISTS "Staff full access for tables" ON restaurant_tables;
            DROP POLICY IF EXISTS "Public select and insert for orders" ON restaurant_orders;
            DROP POLICY IF EXISTS "Staff full access for orders" ON restaurant_orders;
            DROP POLICY IF EXISTS "Public select and insert for order items" ON restaurant_order_items;
            DROP POLICY IF EXISTS "Staff full access for order items" ON restaurant_order_items;

            -- POLICIES

            -- Categories & Menu: Public can read (for QR app), only staff/admin can modify
            CREATE POLICY "Public read access for categories" ON restaurant_categories FOR SELECT USING (true);
            CREATE POLICY "Staff full access for categories" ON restaurant_categories USING (
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'restaurant_staff'))
            );

            CREATE POLICY "Public read access for menu" ON restaurant_menu_items FOR SELECT USING (true);
            CREATE POLICY "Staff full access for menu" ON restaurant_menu_items USING (
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'restaurant_staff'))
            );

            -- Tables: Public can read (to check if table exists via QR), only staff/admin can modify
            CREATE POLICY "Public read access for tables" ON restaurant_tables FOR SELECT USING (true);
            CREATE POLICY "Staff full access for tables" ON restaurant_tables USING (
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'restaurant_staff'))
            );

            -- Orders: Public can insert (from QR) and read their own (if we implemented session tracking, but for now allow insert and limited select maybe)
            -- Simpler: Public can insert via anon key (QR ordering). Staff can do everything.
            CREATE POLICY "Public select and insert for orders" ON restaurant_orders FOR INSERT WITH CHECK (
                order_source IN ('qr_table', 'qr_room') OR auth.uid() IS NULL
            );
            CREATE POLICY "Public read for orders" ON restaurant_orders FOR SELECT USING (true);
            CREATE POLICY "Staff full access for orders" ON restaurant_orders USING (
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'restaurant_staff'))
            );

            -- Order Items
            CREATE POLICY "Public insert for order items" ON restaurant_order_items FOR INSERT WITH CHECK (true);
            CREATE POLICY "Public read for order items" ON restaurant_order_items FOR SELECT USING (true);
            CREATE POLICY "Staff full access for order items" ON restaurant_order_items USING (
                EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'restaurant_staff'))
            );

            -- Storage: Create bucket for menu images if not exists
            INSERT INTO storage.buckets (id, name, public) 
            VALUES ('menu_images', 'menu_images', true)
            ON CONFLICT (id) DO NOTHING;

            DROP POLICY IF EXISTS "Public read menu images" ON storage.objects;
            CREATE POLICY "Public read menu images" ON storage.objects FOR SELECT USING (bucket_id = 'menu_images');

            DROP POLICY IF EXISTS "Staff upload menu images" ON storage.objects;
            CREATE POLICY "Staff upload menu images" ON storage.objects FOR INSERT WITH CHECK (
                bucket_id = 'menu_images' AND EXISTS (SELECT 1 FROM auth.users JOIN public.profiles p ON p.id = auth.users.id WHERE p.id = auth.uid() AND p.role IN ('admin', 'restaurant_staff'))
            );
