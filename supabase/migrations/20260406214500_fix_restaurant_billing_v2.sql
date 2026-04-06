-- Migration: fix_restaurant_billing_v2
-- Description: Adds missing columns and tables for restaurant billing, customers, and loyalty.

-- 1. Create restaurant_customers table
CREATE TABLE IF NOT EXISTS restaurant_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    last_visit_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create restaurant_loyalty_wallets table
CREATE TABLE IF NOT EXISTS restaurant_loyalty_wallets (
    mobile_number TEXT PRIMARY KEY REFERENCES restaurant_customers(mobile_number) ON DELETE CASCADE,
    points_balance INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add missing columns to restaurant_orders
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES restaurant_customers(id) ON DELETE SET NULL;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS customer_mobile TEXT;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS tax NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS payment_mode TEXT;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS bill_no TEXT;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS kot_no TEXT;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS loyalty_discount_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INTEGER DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS order_time TIMESTAMPTZ DEFAULT now();

-- 4. Create sequence functions (RPCs)
-- Function to get the next bill number
CREATE OR REPLACE FUNCTION get_next_restaurant_bill_no() RETURNS TEXT AS $$
DECLARE
    next_no INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(NULLIF(bill_no, '') AS INTEGER)), 0) + 1 INTO next_no FROM restaurant_orders;
    RETURN next_no::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to get the next KOT number
CREATE OR REPLACE FUNCTION get_next_restaurant_kot_no() RETURNS TEXT AS $$
DECLARE
    next_no INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(NULLIF(kot_no, '') AS INTEGER)), 0) + 1 INTO next_no FROM restaurant_orders;
    RETURN next_no::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 5. Enable RLS and Policies for new tables
ALTER TABLE restaurant_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_loyalty_wallets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Staff full access for customers" ON restaurant_customers;
DROP POLICY IF EXISTS "Public read access for customers" ON restaurant_customers;
DROP POLICY IF EXISTS "Staff full access for wallets" ON restaurant_loyalty_wallets;
DROP POLICY IF EXISTS "Public read access for wallets" ON restaurant_loyalty_wallets;

-- Create Policies
CREATE POLICY "Staff full access for customers" ON restaurant_customers USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'restaurant_staff'))
);
CREATE POLICY "Public read access for customers" ON restaurant_customers FOR SELECT USING (true);

CREATE POLICY "Staff full access for wallets" ON restaurant_loyalty_wallets USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'restaurant_staff'))
);
CREATE POLICY "Public read access for wallets" ON restaurant_loyalty_wallets FOR SELECT USING (true);
