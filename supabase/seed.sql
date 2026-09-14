-- ==========================================================
--  SEED DATA: MENU QUÁN TRÀ SỮA (theo bảng giá mới)
--  Giá sản phẩm = Giá Size M
--  Size L = Topping "Size L" +5,000đ
-- ==========================================================

TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE tables CASCADE;

-- ──────────────────────────────────────────────────────────────
-- 1. DANH MỤC (CATEGORIES)
-- ──────────────────────────────────────────────────────────────
INSERT INTO categories (name, sort_order) VALUES
  ('Trà trái cây',          1),
  ('Trà sữa',               2),
  ('Trân châu đường đen',   3),
  ('Matcha latte',           4),
  ('Topping',                5);

-- ──────────────────────────────────────────────────────────────
-- 2. SẢN PHẨM (PRODUCTS) — Giá = Giá Size M
-- ──────────────────────────────────────────────────────────────

-- TRÀ TRÁI CÂY
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Trà trái cây'), 'Trà chanh nha đam',         15000),
  ((SELECT id FROM categories WHERE name = 'Trà trái cây'), 'Trà tắc nha đam',           15000),
  ((SELECT id FROM categories WHERE name = 'Trà trái cây'), 'Trà nhài nguyên chất',      15000),
  ((SELECT id FROM categories WHERE name = 'Trà trái cây'), 'Trà vải lài',               20000),
  ((SELECT id FROM categories WHERE name = 'Trà trái cây'), 'Trà nhài Xoài',             20000),
  ((SELECT id FROM categories WHERE name = 'Trà trái cây'), 'Trà nhài Chanh dây',        20000),
  ((SELECT id FROM categories WHERE name = 'Trà trái cây'), 'Trà nhài Dâu tây',          20000),
  ((SELECT id FROM categories WHERE name = 'Trà trái cây'), 'Trà đào nhài',              20000),
  ((SELECT id FROM categories WHERE name = 'Trà trái cây'), 'Lựu hồng dâu',             20000);

-- TRÀ SỮA
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Trà sữa'), 'Hồng trà sữa',               18000),
  ((SELECT id FROM categories WHERE name = 'Trà sữa'), 'Trà xanh nhài sữa',          18000),
  ((SELECT id FROM categories WHERE name = 'Trà sữa'), 'Trà sữa Khoai môn',          20000),
  ((SELECT id FROM categories WHERE name = 'Trà sữa'), 'Trà sữa Bạc hà',             20000),
  ((SELECT id FROM categories WHERE name = 'Trà sữa'), 'Trà sữa Socola',             20000),
  ((SELECT id FROM categories WHERE name = 'Trà sữa'), 'Trà sữa Chocomint',          20000),
  ((SELECT id FROM categories WHERE name = 'Trà sữa'), 'Nhài sữa Dâu tây',           20000),
  ((SELECT id FROM categories WHERE name = 'Trà sữa'), 'Trà sữa mường',              20000),
  ((SELECT id FROM categories WHERE name = 'Trà sữa'), 'Trà sữa Caramel',            20000),
  ((SELECT id FROM categories WHERE name = 'Trà sữa'), 'Trà sữa Vanilla',            20000),
  ((SELECT id FROM categories WHERE name = 'Trà sữa'), 'Trà sữa Đào mật',            20000),
  ((SELECT id FROM categories WHERE name = 'Trà sữa'), 'Lục trà sữa Xoài',           20000);

-- TRÂN CHÂU ĐƯỜNG ĐEN
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Trân châu đường đen'), 'Sữa tươi trân châu đường đen',   25000),
  ((SELECT id FROM categories WHERE name = 'Trân châu đường đen'), 'Matcha trân châu đường đen',      25000),
  ((SELECT id FROM categories WHERE name = 'Trân châu đường đen'), 'Hồng trà trân châu đường đen',    25000);

-- MATCHA LATTE
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Matcha latte'), 'Matcha latte',                  26000),
  ((SELECT id FROM categories WHERE name = 'Matcha latte'), 'Matcha latte kem macchiato',    30000),
  ((SELECT id FROM categories WHERE name = 'Matcha latte'), 'Strawberry matcha latte',       30000),
  ((SELECT id FROM categories WHERE name = 'Matcha latte'), 'Matcha latte caramel',          30000),
  ((SELECT id FROM categories WHERE name = 'Matcha latte'), 'Matcha latte xoài',             30000),
  ((SELECT id FROM categories WHERE name = 'Matcha latte'), 'Cacao kem muối',                30000);

-- TOPPING
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Topping'), 'Trân châu đen',           5000),
  ((SELECT id FROM categories WHERE name = 'Topping'), 'Trân châu trắng giòn',    5000),
  ((SELECT id FROM categories WHERE name = 'Topping'), 'Kem cheese macchiato',     5000),
  ((SELECT id FROM categories WHERE name = 'Topping'), 'Nha đam',                 5000),
  ((SELECT id FROM categories WHERE name = 'Topping'), 'Pudding trứng',           5000),
  ((SELECT id FROM categories WHERE name = 'Topping'), 'Size L',                  5000);

-- ──────────────────────────────────────────────────────────────
-- 3. BÀN (TABLES)
-- ──────────────────────────────────────────────────────────────
INSERT INTO tables (name, sort_order) VALUES
  ('Bàn 01', 1),
  ('Bàn 02', 2),
  ('Bàn 03', 3),
  ('Bàn 04', 4),
  ('Bàn 05', 5),
  ('Bàn 06', 6),
  ('Bàn 07', 7),
  ('Bàn 08', 8),
  ('Bàn 09', 9),
  ('Bàn 10', 10);
