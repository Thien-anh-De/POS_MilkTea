

-- Helper function: get current user's role ──────────────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_owner_all" ON profiles;
CREATE POLICY "profiles_owner_all" ON profiles
  FOR ALL USING (get_user_role() = 'OWNER');

DROP POLICY IF EXISTS "profiles_manager_update" ON profiles;
CREATE POLICY "profiles_manager_update" ON profiles
  FOR UPDATE USING (
    get_user_role() = 'MANAGER'
    AND role != 'OWNER'
  );

DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (true);

-- categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select" ON categories;
CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "categories_manage" ON categories;
CREATE POLICY "categories_manage" ON categories
  FOR ALL USING (get_user_role() IN ('OWNER', 'MANAGER'));

-- products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "products_manage" ON products;
CREATE POLICY "products_manage" ON products
  FOR ALL USING (get_user_role() IN ('OWNER', 'MANAGER'));

-- tables
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tables_select" ON tables;
CREATE POLICY "tables_select" ON tables
  FOR SELECT USING (true);

-- All authenticated users can update table status (needed for POS)
DROP POLICY IF EXISTS "tables_update_status" ON tables;
CREATE POLICY "tables_update_status" ON tables
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "tables_manage" ON tables;
CREATE POLICY "tables_manage" ON tables
  FOR INSERT WITH CHECK (get_user_role() IN ('OWNER', 'MANAGER'));

DROP POLICY IF EXISTS "tables_delete" ON tables;
CREATE POLICY "tables_delete" ON tables
  FOR DELETE USING (get_user_role() IN ('OWNER', 'MANAGER'));

-- orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select" ON orders;
CREATE POLICY "orders_select" ON orders
  FOR SELECT USING (true);

-- Any authenticated user can create orders (cashier function)
DROP POLICY IF EXISTS "orders_insert" ON orders;
CREATE POLICY "orders_insert" ON orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Any authenticated user can update orders (pay, etc.)
DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_update" ON orders
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_select" ON order_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "order_items_insert" ON order_items;
CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "order_items_update" ON order_items;
CREATE POLICY "order_items_update" ON order_items
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "order_items_delete" ON order_items;
CREATE POLICY "order_items_delete" ON order_items
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only OWNER and MANAGER can view audit logs
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (get_user_role() IN ('OWNER', 'MANAGER'));

-- Any authenticated user can insert (system logs actions)
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
