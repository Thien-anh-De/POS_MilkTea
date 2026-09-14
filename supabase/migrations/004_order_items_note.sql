-- Add note column to order_items table to store order modifications
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS note TEXT;
