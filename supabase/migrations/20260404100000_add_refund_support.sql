-- Migration to support Refund tracking in Payments and Restaurant Orders
-- Date: 2026-04-04

-- 1. Add refund support to the room payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS is_refund BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS refund_original_id UUID REFERENCES payments(id) ON DELETE SET NULL;

-- 2. Add refund support to the restaurant orders table (for POS refunds)
ALTER TABLE restaurant_orders
ADD COLUMN IF NOT EXISTS is_refund BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- 3. Update the description/audit capability for POS orders if needed
-- (Assuming we just flag the original order as refunded or insert a negative corrective order)

COMMENT ON COLUMN payments.is_refund IS 'Flag to identify if this transaction is a refund (negative amount)';
COMMENT ON COLUMN payments.refund_reason IS 'The reason selected by the staff for this refund';
COMMENT ON COLUMN restaurant_orders.is_refund IS 'Flag to identify if this POS order was refunded';
COMMENT ON COLUMN restaurant_orders.refund_reason IS 'Reason for the restaurant order refund';
