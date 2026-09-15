-- ==========================================================
-- SCRIPT XÓA DỮ LIỆU TEST / RESET DỮ LIỆU HỆ THỐNG POS
-- Chạy script này trong: Supabase Dashboard -> SQL Editor
-- ==========================================================

-- ==========================================================
-- LỰA CHỌN 1: CHỈ XÓA ĐƠN HÀNG, DOANH THU TEST (KHUYÊN DÙNG TRƯỚC KHI BÁN THẬT)
-- Giữ lại: Menu món, Danh mục, Danh sách Bàn, Tài khoản nhân viên
-- ==========================================================

-- 1. Xóa toàn bộ chi tiết đơn hàng, thanh toán và đơn hàng
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE orders CASCADE;

-- 2. Xóa nhật ký hoạt động (audit logs) nếu không muốn lưu vết test
TRUNCATE TABLE audit_logs CASCADE;

-- 3. Đưa tất cả bàn về trạng thái trống (AVAILABLE)
UPDATE tables SET status = 'AVAILABLE';


-- ==========================================================
-- LỰA CHỌN 2: XÓA CẢ MENU MÓN & DANH MỤC (NẾU MUỐN NHẬP MENU MỚI TỪ ĐẦU)
-- (Bỏ comment các dòng bên dưới nếu bạn muốn xóa)
-- ==========================================================
-- TRUNCATE TABLE products CASCADE;
-- TRUNCATE TABLE categories CASCADE;


-- ==========================================================
-- LỰA CHỌN 3: XÓA CHỈ CÁC ĐƠN TEST TRONG MỘT KHOẢNG THỜI GIAN NHẤT ĐỊNH
-- Ví dụ: Chỉ xóa các đơn tạo trước ngày hôm nay
-- ==========================================================
-- DELETE FROM orders WHERE created_at < '2026-09-15 00:00:00';
-- UPDATE tables SET status = 'AVAILABLE' WHERE id NOT IN (SELECT table_id FROM orders WHERE status = 'OPEN');
