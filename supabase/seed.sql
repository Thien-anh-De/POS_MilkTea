TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE tables CASCADE;

-- Categories 
INSERT INTO categories (name, sort_order) VALUES
  ('Cà phê',        1),
  ('Cacao - Socola',2),
  ('Đá xay',        3),
  ('Trà',           4),
  ('Đồ ăn vặt',     5),
  ('Matcha',        6),
  ('Yakult',        7),
  ('Sữa chua',      8),
  ('Đồ ăn nhanh',   9),
  ('Topping',       10),
  ('Nước ép',       11),
  ('Latte',         12),
  ('Sinh tố',       13),
  ('Sữa chua dẻo',  14);

-- Products

-- CÀ PHÊ
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Cà phê'), 'Cà phê đen', 25000),
  ((SELECT id FROM categories WHERE name = 'Cà phê'), 'Cà phê nâu', 30000),
  ((SELECT id FROM categories WHERE name = 'Cà phê'), 'Nâu lắc đá', 35000),
  ((SELECT id FROM categories WHERE name = 'Cà phê'), 'Bạc xỉu', 35000),
  ((SELECT id FROM categories WHERE name = 'Cà phê'), 'Bạc xỉu nóng', 40000),
  ((SELECT id FROM categories WHERE name = 'Cà phê'), 'Latte', 35000),
  ((SELECT id FROM categories WHERE name = 'Cà phê'), 'Capuchino', 35000),
  ((SELECT id FROM categories WHERE name = 'Cà phê'), 'Espresso', 35000),
  ((SELECT id FROM categories WHERE name = 'Cà phê'), 'Cafe cốt dừa', 40000),
  ((SELECT id FROM categories WHERE name = 'Cà phê'), 'Americano', 40000),
  ((SELECT id FROM categories WHERE name = 'Cà phê'), 'Cà phê muối', 35000),
  ((SELECT id FROM categories WHERE name = 'Cà phê'), 'Cà phê trứng', 35000),
  ((SELECT id FROM categories WHERE name = 'Cà phê'), 'Cà phê kem dẻo Ban Mê', 40000);

-- CACAO - SOCOLA
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Cacao - Socola'), 'Hot cacao marshmallow', 35000),
  ((SELECT id FROM categories WHERE name = 'Cacao - Socola'), 'Cacao kem muối', 35000),
  ((SELECT id FROM categories WHERE name = 'Cacao - Socola'), 'Cacao', 30000),
  ((SELECT id FROM categories WHERE name = 'Cacao - Socola'), 'Hot socola marshmallow', 35000),
  ((SELECT id FROM categories WHERE name = 'Cacao - Socola'), 'Socola kem muối', 35000),
  ((SELECT id FROM categories WHERE name = 'Cacao - Socola'), 'Socola', 30000);

-- ĐÁ XAY
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Đá xay'), 'Cốt dừa đá xay', 35000),
  ((SELECT id FROM categories WHERE name = 'Đá xay'), 'Cốt dừa cafe', 40000),
  ((SELECT id FROM categories WHERE name = 'Đá xay'), 'Cốt dừa cacao', 40000),
  ((SELECT id FROM categories WHERE name = 'Đá xay'), 'Cốt dừa socola', 40000),
  ((SELECT id FROM categories WHERE name = 'Đá xay'), 'Cốt dừa việt quất', 40000),
  ((SELECT id FROM categories WHERE name = 'Đá xay'), 'Cốt dừa xoài', 40000),
  ((SELECT id FROM categories WHERE name = 'Đá xay'), 'Cốt dừa dâu tây', 40000),
  ((SELECT id FROM categories WHERE name = 'Đá xay'), 'Cốt dừa kiwi', 40000),
  ((SELECT id FROM categories WHERE name = 'Đá xay'), 'Chanh tuyết', 40000),
  ((SELECT id FROM categories WHERE name = 'Đá xay'), 'Chanh leo tuyết', 40000),
  ((SELECT id FROM categories WHERE name = 'Đá xay'), 'Matcha đá xay', 40000);

-- TRÀ
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà Lipton', 25000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà nhài', 25000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà hoa cúc', 25000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà hoa cúc đường phèn', 30000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà gừng', 25000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà táo', 25000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà dâu', 25000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà chanh mật ong', 30000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà đào', 30000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà đào cam sả', 35000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà thảo mộc', 30000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà mạn (ấm trà)', 30000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà đường nhãn', 35000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà tắc (quất)', 25000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà detox', 30000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà hoa gạo lứt', 30000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà hoa quả nhiệt đới', 35000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà dứa chanh leo', 30000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà nhài nhãn', 30000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà quất nha đam', 30000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà nhài nha đam', 30000),
  ((SELECT id FROM categories WHERE name = 'Trà'), 'Trà sen vàng', 40000);

-- ĐỒ ĂN VẶT
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Đồ ăn vặt'), 'Khô gà', 30000),
  ((SELECT id FROM categories WHERE name = 'Đồ ăn vặt'), 'Khô bò', 30000),
  ((SELECT id FROM categories WHERE name = 'Đồ ăn vặt'), 'Khô heo cháy tỏi', 30000),
  ((SELECT id FROM categories WHERE name = 'Đồ ăn vặt'), 'Ngô cay giòn', 20000),
  ((SELECT id FROM categories WHERE name = 'Đồ ăn vặt'), 'Hướng dương mộc', 15000),
  ((SELECT id FROM categories WHERE name = 'Đồ ăn vặt'), 'Hướng dương vị', 15000),
  ((SELECT id FROM categories WHERE name = 'Đồ ăn vặt'), 'Snack que', 5000),
  ((SELECT id FROM categories WHERE name = 'Đồ ăn vặt'), 'Hạt dinh hương', 10000),
  ((SELECT id FROM categories WHERE name = 'Đồ ăn vặt'), 'Xoài lắc chanh leo', 35000);

-- MATCHA
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Matcha'), 'Coco matcha', 40000);

-- YAKULT
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Yakult'), 'Yakult xoài', 30000),
  ((SELECT id FROM categories WHERE name = 'Yakult'), 'Yakult dâu tây', 30000),
  ((SELECT id FROM categories WHERE name = 'Yakult'), 'Yakult việt quất', 30000),
  ((SELECT id FROM categories WHERE name = 'Yakult'), 'Yakult thanh long', 30000),
  ((SELECT id FROM categories WHERE name = 'Yakult'), 'Yakult thanh long xoài', 30000);

-- SỮA CHUA
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Sữa chua'), 'Sữa chua bánh đa', 25000),
  ((SELECT id FROM categories WHERE name = 'Sữa chua'), 'Sữa chua cà phê', 30000),
  ((SELECT id FROM categories WHERE name = 'Sữa chua'), 'Sữa chua ca cao', 30000),
  ((SELECT id FROM categories WHERE name = 'Sữa chua'), 'Sữa chua socola', 30000),
  ((SELECT id FROM categories WHERE name = 'Sữa chua'), 'Sữa chua việt quất', 30000),
  ((SELECT id FROM categories WHERE name = 'Sữa chua'), 'Sữa chua kiwi', 30000),
  ((SELECT id FROM categories WHERE name = 'Sữa chua'), 'Sữa chua đào', 30000),
  ((SELECT id FROM categories WHERE name = 'Sữa chua'), 'Sữa chua matcha', 30000),
  ((SELECT id FROM categories WHERE name = 'Sữa chua'), 'Sữa chua xoài', 30000),
  ((SELECT id FROM categories WHERE name = 'Sữa chua'), 'Sữa chua dâu tây', 30000),
  ((SELECT id FROM categories WHERE name = 'Sữa chua'), 'Sữa chua nha đam', 30000),
  ((SELECT id FROM categories WHERE name = 'Sữa chua'), 'Sữa chua hoa quả', 40000);

-- ĐỒ ĂN NHANH
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Đồ ăn nhanh'), 'Mì trộn tương đen', 25000),
  ((SELECT id FROM categories WHERE name = 'Đồ ăn nhanh'), 'Mì trộn thường', 20000),
  ((SELECT id FROM categories WHERE name = 'Đồ ăn nhanh'), 'Mì trộn trứng', 25000),
  ((SELECT id FROM categories WHERE name = 'Đồ ăn nhanh'), 'Mì trộn xúc xích', 25000),
  ((SELECT id FROM categories WHERE name = 'Đồ ăn nhanh'), 'Mì trộn khô heo', 25000),
  ((SELECT id FROM categories WHERE name = 'Đồ ăn nhanh'), 'Mì trộn khô gà', 25000);

-- TOPPING
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Topping'), 'Nha đam', 5000),
  ((SELECT id FROM categories WHERE name = 'Topping'), 'Kem cheese', 5000),
  ((SELECT id FROM categories WHERE name = 'Topping'), 'Hạt chia', 5000),
  ((SELECT id FROM categories WHERE name = 'Topping'), 'Topping dừa khô', 5000);

-- NƯỚC ÉP
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Nước ép'), 'Ép chanh tươi', 20000),
  ((SELECT id FROM categories WHERE name = 'Nước ép'), 'Ép chanh muối', 25000),
  ((SELECT id FROM categories WHERE name = 'Nước ép'), 'Ép chanh leo', 30000),
  ((SELECT id FROM categories WHERE name = 'Nước ép'), 'Ép dưa leo', 40000),
  ((SELECT id FROM categories WHERE name = 'Nước ép'), 'Ép cam', 40000),
  ((SELECT id FROM categories WHERE name = 'Nước ép'), 'Ép táo', 40000),
  ((SELECT id FROM categories WHERE name = 'Nước ép'), 'Ép dưa hấu', 30000),
  ((SELECT id FROM categories WHERE name = 'Nước ép'), 'Ép ổi', 30000),
  ((SELECT id FROM categories WHERE name = 'Nước ép'), 'Ép dứa', 30000),
  ((SELECT id FROM categories WHERE name = 'Nước ép'), 'Ép cà rốt', 40000);

-- LATTE
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Latte'), 'Matcha latte nóng', 45000),
  ((SELECT id FROM categories WHERE name = 'Latte'), 'Matcha latte đá', 40000),
  ((SELECT id FROM categories WHERE name = 'Latte'), 'Matcha latte kem muối', 40000),
  ((SELECT id FROM categories WHERE name = 'Latte'), 'Sữa tươi', 20000),
  ((SELECT id FROM categories WHERE name = 'Latte'), 'Latte đào', 30000),
  ((SELECT id FROM categories WHERE name = 'Latte'), 'Latte xoài', 30000),
  ((SELECT id FROM categories WHERE name = 'Latte'), 'Latte dâu tây', 30000),
  ((SELECT id FROM categories WHERE name = 'Latte'), 'Latte việt quất', 30000),
  ((SELECT id FROM categories WHERE name = 'Latte'), 'Bột sắn dây', 20000);

-- SINH TỐ
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Sinh tố'), 'Sinh tố bơ', 40000),
  ((SELECT id FROM categories WHERE name = 'Sinh tố'), 'Sinh tố mãng cầu', 40000),
  ((SELECT id FROM categories WHERE name = 'Sinh tố'), 'Sinh tố dâu tây', 40000),
  ((SELECT id FROM categories WHERE name = 'Sinh tố'), 'Sinh tố xoài', 30000),
  ((SELECT id FROM categories WHERE name = 'Sinh tố'), 'Sinh tố dưa hấu', 30000),
  ((SELECT id FROM categories WHERE name = 'Sinh tố'), 'Sinh tố thanh long', 30000),
  ((SELECT id FROM categories WHERE name = 'Sinh tố'), 'Sinh tố mây trời', 35000);

-- SỮA CHUA DẺO
INSERT INTO products (category_id, name, price) VALUES
  ((SELECT id FROM categories WHERE name = 'Sữa chua dẻo'), 'Sữa chua dẻo', 30000),
  ((SELECT id FROM categories WHERE name = 'Sữa chua dẻo'), 'Sữa chua dẻo dâu tây', 35000),
  ((SELECT id FROM categories WHERE name = 'Sữa chua dẻo'), 'Sữa chua dẻo việt quất', 35000),
  ((SELECT id FROM categories WHERE name = 'Sữa chua dẻo'), 'Sữa chua dẻo matcha', 35000);


-- 3. Tables 

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
