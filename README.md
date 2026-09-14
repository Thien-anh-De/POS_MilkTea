# POS 1994 Coffee ☕

> Hệ thống quản lý bán hàng (POS) cho quán cà phê — 0 đồng, không server local, 3–4 người dùng.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| UI | Tailwind CSS v4 |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Hosting | Cloudflare Pages |

## Bắt đầu

### 1. Clone & cài đặt

```bash
git clone https://github.com/Thien-anh-De/POS_1994Coffe.git
cd POS_1994Coffe
npm install
```

### 2. Tạo Supabase project

1. Vào [supabase.com](https://supabase.com) → New Project (Free)
2. Copy **Project URL** và **Anon Key**

### 3. Cấu hình environment

```bash
cp .env.example .env.local
```

Sửa `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Tạo database

Chạy lần lượt trong **Supabase SQL Editor**:

1. `supabase/migrations/001_schema.sql` — Tạo bảng
2. `supabase/migrations/002_rls.sql` — Bảo mật RLS
3. `supabase/seed.sql` — Dữ liệu mẫu (tùy chọn)

### 5. Tạo user đầu tiên

Trong Supabase Dashboard → Authentication → Users → Add User:

- Email: `owner@1994coffee.com`
- Password: chọn mật khẩu mạnh

Sau khi user được tạo, vào SQL Editor chạy:

```sql
UPDATE profiles SET role = 'OWNER' WHERE email = 'owner@1994coffee.com';
```

### 6. Chạy app

```bash
npm run dev
```

Mở `http://localhost:5173` và đăng nhập.

## Cấu trúc thư mục

```
src/
├── components/     # Shared UI components
├── hooks/          # Auth context, toast, custom hooks
├── layouts/        # Main sidebar layout
├── lib/            # Supabase client
├── pages/          # Page components
│   ├── login/
│   ├── pos/
│   ├── products/
│   ├── tables/
│   ├── invoices/
│   ├── reports/
│   └── users/
├── services/       # Supabase data services
├── types/          # TypeScript types
└── utils/          # Helper functions

supabase/
├── migrations/     # SQL schema + RLS
└── seed.sql        # Sample data
```

## Roles & Quyền hạn

| Chức năng | OWNER | MANAGER | CASHIER |
|---|:---:|:---:|:---:|
| Bán hàng (POS) | ✅ | ✅ | ✅ |
| Xem hóa đơn | ✅ | ✅ | ✅ |
| Quản lý món | ✅ | ✅ | ❌ |
| Quản lý bàn | ✅ | ✅ | ❌ |
| Doanh thu | ✅ | ✅ | ❌ |
| Quản lý nhân viên | ✅ | ✅ | ❌ |
| Hủy hóa đơn | ✅ | ✅ | ❌ |

## License

Private — 1994 Coffee
