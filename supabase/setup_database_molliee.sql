-- ==========================================================
--  HE THONG CO SO DU LIEU: POS MOLLIEE (QUAN TRA SUA)
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BẢNG PROFILES (HỒ SƠ NHÂN SỰ)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT,
  role       TEXT NOT NULL DEFAULT 'CASHIER' CHECK (role IN ('OWNER', 'MANAGER', 'CASHIER')),
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger tự động tạo profile khi đăng ký tài khoản qua Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'OWNER'), -- Mặc định là OWNER
    'active'
  )
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        role = COALESCE(public.profiles.role, EXCLUDED.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. BẢNG DANH MỤC (CATEGORIES)
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. BẢNG SẢN PHẨM / MÓN (PRODUCTS)
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  price       NUMERIC(12, 0) NOT NULL CHECK (price >= 0),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- 4. BẢNG BÀN (TABLES)
CREATE TABLE IF NOT EXISTS tables (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'DISABLED')),
  sort_order INT NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. BẢNG ĐƠN HÀNG (ORDERS)
CREATE TABLE IF NOT EXISTS orders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id       UUID NOT NULL REFERENCES tables(id) ON DELETE RESTRICT,
  cashier_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL UNIQUE,
  status         TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PAID', 'CANCELLED')),
  subtotal       NUMERIC(12, 0) NOT NULL DEFAULT 0,
  discount       NUMERIC(12, 0) NOT NULL DEFAULT 0,
  total          NUMERIC(12, 0) NOT NULL DEFAULT 0,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at        TIMESTAMPTZ,
  cancelled_at   TIMESTAMPTZ,
  cancelled_by   UUID REFERENCES profiles(id),
  cancel_reason  TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- 6. BẢNG CHI TIẾT MÓN TRONG ĐƠN (ORDER_ITEMS)
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  unit_price   NUMERIC(12, 0) NOT NULL CHECK (unit_price >= 0),
  quantity     INT NOT NULL CHECK (quantity > 0),
  subtotal     NUMERIC(12, 0) NOT NULL CHECK (subtotal >= 0),
  note         TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 7. BẢNG THANH TOÁN (PAYMENTS)
CREATE TABLE IF NOT EXISTS payments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method     TEXT NOT NULL CHECK (method IN ('CASH', 'BANK_TRANSFER')),
  amount     NUMERIC(12, 0) NOT NULL CHECK (amount >= 0),
  paid_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  cashier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- 8. BẢNG NHẬT KÝ HOẠT ĐỘNG (AUDIT_LOGS)
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  details     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ==========================================================
-- BẢO MẬT VÀ PHÂN QUYỀN (RLS)
-- ==========================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies Profiles
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_owner_all" ON profiles;
CREATE POLICY "profiles_owner_all" ON profiles FOR ALL USING (get_user_role() = 'OWNER');

DROP POLICY IF EXISTS "profiles_manager_update" ON profiles;
CREATE POLICY "profiles_manager_update" ON profiles FOR UPDATE USING (
  get_user_role() = 'MANAGER' AND role != 'OWNER'
);

DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);

-- Policies Categories
DROP POLICY IF EXISTS "categories_select" ON categories;
CREATE POLICY "categories_select" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "categories_manage" ON categories;
CREATE POLICY "categories_manage" ON categories FOR ALL USING (get_user_role() IN ('OWNER', 'MANAGER'));

-- Policies Products
DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "products_manage" ON products;
CREATE POLICY "products_manage" ON products FOR ALL USING (get_user_role() IN ('OWNER', 'MANAGER'));

-- Policies Tables
DROP POLICY IF EXISTS "tables_select" ON tables;
CREATE POLICY "tables_select" ON tables FOR SELECT USING (true);

DROP POLICY IF EXISTS "tables_update_status" ON tables;
CREATE POLICY "tables_update_status" ON tables FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "tables_manage" ON tables;
CREATE POLICY "tables_manage" ON tables FOR INSERT WITH CHECK (get_user_role() IN ('OWNER', 'MANAGER'));

DROP POLICY IF EXISTS "tables_delete" ON tables;
CREATE POLICY "tables_delete" ON tables FOR DELETE USING (get_user_role() IN ('OWNER', 'MANAGER'));

-- Policies Orders
DROP POLICY IF EXISTS "orders_select" ON orders;
CREATE POLICY "orders_select" ON orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "orders_insert" ON orders;
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "orders_delete" ON orders;
CREATE POLICY "orders_delete" ON orders FOR DELETE USING (auth.uid() IS NOT NULL);


-- Policies Order Items
DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "order_items_insert" ON order_items;
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "order_items_update" ON order_items;
CREATE POLICY "order_items_update" ON order_items FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "order_items_delete" ON order_items;
CREATE POLICY "order_items_delete" ON order_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- Policies Payments
DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments FOR SELECT USING (true);

DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policies Audit Logs
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (get_user_role() IN ('OWNER', 'MANAGER'));

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Hàm xóa tài khoản nhân viên an toàn
CREATE OR REPLACE FUNCTION public.delete_user(user_id UUID)
RETURNS void AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role != 'OWNER' THEN
    RAISE EXCEPTION 'Chỉ có Chủ quán (OWNER) mới có quyền xóa tài khoản';
  END IF;
  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'Bạn không thể tự xóa tài khoản của chính mình';
  END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE cashier_id = user_id) OR
     EXISTS (SELECT 1 FROM public.payments WHERE cashier_id = user_id) THEN
    RAISE EXCEPTION 'Nhân viên này đã có lịch sử đơn hàng. Vui lòng chọn Khóa tài khoản để bảo toàn dữ liệu!';
  END IF;
  DELETE FROM public.profiles WHERE id = user_id;
  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;

-- ==========================================================
-- DỮ LIỆU KHỞI TẠO CHO QUÁN TRÀ SỮA MOLLIEE
-- ==========================================================

-- 1. Khởi tạo danh sách Bàn
INSERT INTO tables (name, sort_order) VALUES
  ('Mang về',   0),
  ('Bàn 01',    1),
  ('Bàn 02',    2),
  ('Bàn 03',    3),
  ('Bàn 04',    4),
  ('Bàn 05',    5),
  ('Bàn 06',    6),
  ('Bàn 07',    7),
  ('Bàn 08',    8),
  ('Bàn 09',    9),
  ('Bàn 10',   10)
ON CONFLICT DO NOTHING;

-- 2. Khởi tạo danh mục Trà sữa Molliee
INSERT INTO categories (name, sort_order) VALUES
  ('Trà sữa',       1),
  ('Trà trái cây',  2),
  ('Đá xay - Freeze', 3),
  ('Topping',       4),
  ('Cà phê',        5),
  ('Đồ ăn vặt',     6)
ON CONFLICT DO NOTHING;