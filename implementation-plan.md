# Implementation Plan — POS_1994Coffe

> **Repository chính:** https://github.com/Thien-anh-De/POS_1994Coffe
>
> **Mục tiêu:** Xây một POS web nhỏ cho quán cà phê, 0 đồng để bắt đầu, không cần server local, khoảng 3–4 người dùng, dễ dùng và dễ sửa.

---

## 1. Phạm vi MVP

Chỉ làm **7 chức năng**:

1. Đăng nhập
2. Bán hàng
3. Quản lý bàn
4. Quản lý món
5. Hóa đơn
6. Doanh thu
7. Nhân viên & phân quyền

### Không làm trong MVP

- Kho nguyên liệu
- CRM / khách hàng thân thiết
- Multi-branch
- AI
- Kế toán
- Đồng bộ Grab/Shopee
- App mobile native
- Máy in nhiệt

---

## 2. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | React + TypeScript + Vite |
| UI | Tailwind CSS |
| Hosting | Cloudflare Pages Free |
| Backend / Database | Supabase Free |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Authorization | Supabase RLS + Role |
| Source control | GitHub |
| Testing | Vitest + Playwright |

### Nguyên tắc

- Không chạy server local khi sử dụng thực tế.
- GitHub là source code chính.
- Supabase là nguồn dữ liệu chính.
- Không lưu doanh thu trong localStorage.
- Không xóa hóa đơn đã thanh toán.
- Không đưa secret/service-role key lên frontend.
- Phân quyền phải được bảo vệ ở database/RLS, không chỉ ẩn nút trên UI.

---

# 3. PHASE 0 — Bắt đầu từ repo có sẵn

## 3.1 Clone repo

```bash
git clone https://github.com/Thien-anh-De/POS_1994Coffe.git
cd POS_1994Coffe
```

## 3.2 Tạo project React

Nếu repo đang trống:

```bash
npm create vite@latest . -- --template react-ts
npm install
```

## 3.3 Cài các package cần thiết

```bash
npm install @supabase/supabase-js
npm install react-router-dom
npm install lucide-react
npm install -D tailwindcss @tailwindcss/vite vitest @playwright/test
```

> Có thể điều chỉnh package theo setup thực tế, nhưng không thêm thư viện lớn nếu chưa cần.

## 3.4 Tạo Supabase project

Tạo một project Free cho POS_1994Coffe.

Chuẩn bị:

```text
Project URL
Publishable/Anon key
Database password
```

## 3.5 Tạo file môi trường

```text
.env.local
```

Ví dụ:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Không commit `.env.local`.

## 3.6 Tạo cấu trúc thư mục

```text
POS_1994Coffe/
├── src/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   │   ├── login/
│   │   ├── pos/
│   │   ├── products/
│   │   ├── tables/
│   │   ├── invoices/
│   │   ├── reports/
│   │   └── users/
│   ├── services/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   └── utils/
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── tests/
├── .env.example
└── README.md
```

## 3.7 Commit đầu tiên

```bash
git add .
git commit -m "chore: initialize POS project"
git push origin main
```

### Done khi

- Repo có source code.
- Project chạy được bằng `npm run dev`.
- Kết nối Supabase thành công.
- `.env.local` không nằm trên GitHub.

---

# 4. PHASE 1 — Đăng nhập

## Mục tiêu

Có login/logout và 3 role cơ bản.

### Role

```text
OWNER
MANAGER
CASHIER
```

## Tasks

- Tạo Supabase Auth.
- Tạo bảng `profiles`.
- Tạo trang `/login`.
- Tạo protected route.
- Sau login chuyển đúng màn hình theo role.
- Thêm logout.

### Quy tắc

```text
OWNER   → Dashboard + toàn quyền
MANAGER → Setup + báo cáo
CASHIER → POS + hóa đơn cần thiết
```

### Done khi

- User chưa login không vào được trang nội bộ.
- 3 role hoạt động đúng.
- Logout hoạt động.

---

# 5. PHASE 2 — Quản lý món, bàn, nhân viên

> **Phase này có thể giao cho người khác làm độc lập.**

## 5.1 Quản lý món

Route:

```text
/products
```

Chức năng:

- Thêm danh mục
- Thêm món
- Sửa món
- Đổi giá
- Ẩn món

Không cần upload ảnh ở MVP.

## 5.2 Quản lý bàn

Route:

```text
/tables
```

Chức năng:

- Thêm bàn
- Đổi tên bàn
- Bật/tắt bàn

Trạng thái:

```text
AVAILABLE
OCCUPIED
DISABLED
```

## 5.3 Quản lý nhân viên

Route:

```text
/users
```

OWNER/MANAGER có thể:

- Thêm nhân viên
- Đổi role
- Khóa tài khoản

### Done khi

Người phụ trách setup có thể tự nhập:

```text
Danh mục
Món
Bàn
Nhân viên
```

mà không cần sửa code.

---

# 6. PHASE 3 — Bán hàng

> **Đây là chức năng trung tâm của hệ thống.**

Route:

```text
/pos
```

## Luồng

```text
Chọn bàn
   ↓
Mở/Tạo order
   ↓
Chọn món
   ↓
Tăng/giảm số lượng
   ↓
Tính tổng
   ↓
Thanh toán
```

## Tasks

1. Hiển thị danh sách bàn.
2. Click bàn → mở/tạo order.
3. Hiển thị category + products.
4. Thêm món vào order.
5. Tăng/giảm quantity.
6. Tính `subtotal`.
7. Cho phép giảm giá đơn giản theo số tiền.
8. Tính `total`.
9. Chọn phương thức thanh toán.
10. Lưu order + payment.
11. Sau khi thanh toán: order `PAID`, bàn `AVAILABLE`.

### Payment MVP

```text
CASH
BANK_TRANSFER
```

### Done khi

Nhân viên có thể hoàn thành một đơn:

```text
Bàn → Món → Tổng tiền → Thanh toán → Xong
```

---

# 7. PHASE 4 — Hóa đơn

Route:

```text
/invoices
```

## Chức năng

- Danh sách hóa đơn
- Lọc theo ngày
- Tìm mã hóa đơn
- Xem chi tiết
- Hủy hóa đơn theo quyền

## Mã hóa đơn

Ví dụ:

```text
INV-20260909-0001
```

## Quy tắc quan trọng

Không xóa hóa đơn đã thanh toán.

```text
PAID → CANCELLED
```

Khi hủy:

1. Kiểm tra quyền.
2. Nhập lý do.
3. Đổi trạng thái.
4. Ghi `audit_logs`.

### Done khi

- Tra cứu được hóa đơn.
- Hóa đơn cũ giữ nguyên giá tại thời điểm bán.
- Hóa đơn hủy không tính vào doanh thu.

---

# 8. PHASE 5 — Doanh thu

Route:

```text
/reports
```

## Chỉ làm 4 phần

### 8.1 Hôm nay

```text
Doanh thu
Số hóa đơn
Giá trị đơn trung bình
```

### 8.2 Theo khoảng ngày

```text
Từ ngày → Đến ngày
```

### 8.3 Theo tháng

```text
Tháng 01
Tháng 02
...
```

### 8.4 Theo năm

```text
2026
```

Thêm:

```text
Top món bán chạy
```

## Quy tắc tính doanh thu

Chỉ tính:

```text
orders.status = PAID
```

Không tính:

```text
OPEN
CANCELLED
```

### Done khi

Doanh thu ngày/tháng/năm khớp với tổng các hóa đơn `PAID`.

---

# 9. PHASE 6 — Database + Security

> Nên làm song song và hoàn thiện trước production.

## 9.1 Database MVP

Chỉ cần 8 bảng:

```text
profiles
categories
products
tables
orders
order_items
payments
audit_logs
```

## 9.2 Cột chính

### profiles

```text
id
name
role
status
created_at
```

### categories

```text
id
name
sort_order
active
created_at
```

### products

```text
id
category_id
name
price
active
created_at
updated_at
```

### tables

```text
id
name
status
sort_order
active
created_at
```

### orders

```text
id
table_id
cashier_id
status
subtotal
discount
total
created_at
paid_at
```

### order_items

```text
id
order_id
product_id
product_name
unit_price
quantity
subtotal
```

`product_name` và `unit_price` phải lưu theo thời điểm bán để hóa đơn cũ không đổi khi món được sửa giá.

### payments

```text
id
order_id
method
amount
paid_at
cashier_id
```

### audit_logs

```text
id
user_id
action
entity_type
entity_id
created_at
```

## 9.3 RLS

Kiểm tra quyền từng role.

### CASHIER

```text
Đọc món              ✅
Đọc bàn               ✅
Tạo order             ✅
Thanh toán            ✅
Sửa giá món           ❌
Quản lý nhân viên     ❌
Xem audit log         ❌
```

### MANAGER

```text
Setup món/bàn         ✅
Xem hóa đơn            ✅
Xem báo cáo            ✅
Quản lý Owner          ❌
```

### OWNER

```text
Toàn quyền            ✅
```

## 9.4 Validation

Kiểm tra:

- Quantity > 0
- Price >= 0
- Total hợp lệ
- User có quyền
- Không thanh toán order không hợp lệ

## 9.5 Error handling

Không hiển thị:

```text
SQL error
stack trace
raw 500 response
```

Hiển thị thông báo đơn giản cho người dùng.

### Done khi

Cashier không thể vượt quyền kể cả khi gọi API trực tiếp.

---

# 10. PHASE 7 — Test + Deploy

## 10.1 Test nghiệp vụ

### Test 01 — Bán hàng

```text
B01
→ Cafe sữa x1
→ Trà đào x1
→ Thanh toán
→ B01 = AVAILABLE
```

### Test 02 — 2 người bán đồng thời

```text
User A → B01
User B → B02
```

Không được ghi nhầm order.

### Test 03 — Đổi giá

```text
Cafe sữa = 30.000
→ bán
→ đổi giá = 35.000
→ hóa đơn cũ vẫn = 30.000
```

### Test 04 — Hủy hóa đơn

```text
PAID
→ CANCELLED
→ doanh thu cập nhật đúng
→ audit log được tạo
```

### Test 05 — Phân quyền

Cashier không thể:

```text
Sửa giá
Thêm nhân viên
Xóa hóa đơn
Xem report bị giới hạn
```

## 10.2 Deploy

Kết nối:

```text
GitHub
  ↓
Cloudflare Pages
  ↓
Production
```

Kiểm tra:

- HTTPS
- Environment variables
- Supabase Auth redirect
- RLS
- Production build
- Error handling

### Done khi

Có URL public và quán có thể truy cập từ điện thoại/tablet/laptop mà không cần chạy server local.

---

# 11. Chia việc cho 3–4 người

## Người 1 — Core POS

```text
Login
POS
Orders
Payments
```

## Người 2 — Data / Setup

```text
Products
Categories
Tables
Users
```

## Người 3 — Hóa đơn + báo cáo

```text
Invoices
Revenue
Top products
```

## Người 4 — QA / Security

```text
RLS
Permission test
Bug test
E2E test
```

### Quy tắc Git đơn giản

Mỗi người làm branch riêng:

```text
feature/login
feature/pos
feature/products
feature/reports
```

Không push trực tiếp feature đang làm vào `main`.

Flow:

```text
feature/*
   ↓
Pull Request
   ↓
Review
   ↓
main
```

---

# 12. MVP Release Checklist

## Bắt buộc

- [ ] Login/logout
- [ ] OWNER/MANAGER/CASHIER
- [ ] Thêm/sửa/ẩn món
- [ ] Thêm/sửa bàn
- [ ] Tạo order
- [ ] Thêm món
- [ ] Thanh toán
- [ ] Hóa đơn
- [ ] Hủy hóa đơn có quyền
- [ ] Doanh thu ngày
- [ ] Doanh thu tháng
- [ ] Doanh thu năm
- [ ] Audit log cơ bản
- [ ] RLS
- [ ] Deploy public

## Chưa làm

- [ ] Kho
- [ ] CRM
- [ ] Loyalty
- [ ] Multi-branch
- [ ] Máy in
- [ ] AI
- [ ] Grab/Shopee
- [ ] Kế toán

---

# 13. Tiêu chí hoàn thành MVP

MVP được coi là hoàn thành khi:

1. 3–4 tài khoản đăng nhập được.
2. Người khác có thể tự nhập món và bàn.
3. Nhân viên bán được một đơn từ chọn bàn → thanh toán.
4. Hóa đơn được lưu và tra cứu.
5. Doanh thu ngày/tháng/năm tính đúng.
6. Cashier không vượt quyền.
7. Không cần server local.
8. Code nằm trong repo `POS_1994Coffe` và có thể deploy lại.
9. Người khác có thể đọc cấu trúc code và tiếp tục sửa lỗi.

---

# 14. Thứ tự triển khai cuối cùng

```text
Repo có sẵn
   ↓
PHASE 0 — Setup
   ↓
PHASE 1 — Login
   ↓
PHASE 2 — Món / Bàn / Nhân viên
   ↓
PHASE 3 — POS
   ↓
PHASE 4 — Hóa đơn
   ↓
PHASE 5 — Doanh thu
   ↓
PHASE 6 — Security
   ↓
PHASE 7 — Test + Deploy
```

> **Mục tiêu cuối:** một POS nhỏ, đủ dùng cho 1 quán, 3–4 người, bắt đầu với chi phí 0 đồng, đơn giản hơn nhiều so với KiotViet nhưng có nền tảng đủ sạch để sửa và mở rộng sau này.
