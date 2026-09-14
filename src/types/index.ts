/* ============================================================
   POS 1994 Coffee — Type Definitions
   ============================================================ */

// ── Roles & Auth ──────────────────────────────────────────────
export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER'
export type ProfileStatus = 'active' | 'disabled'

export interface Profile {
  id: string
  name: string
  email?: string
  role: UserRole
  status: ProfileStatus
  created_at: string
}

// ── Categories ────────────────────────────────────────────────
export interface Category {
  id: string
  name: string
  sort_order: number
  active: boolean
  created_at: string
}

// ── Products ──────────────────────────────────────────────────
export interface Product {
  id: string
  category_id: string
  name: string
  price: number
  active: boolean
  created_at: string
  updated_at: string
  category?: Category
}

// ── Tables ────────────────────────────────────────────────────
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'DISABLED'

export interface CoffeeTable {
  id: string
  name: string
  status: TableStatus
  sort_order: number
  active: boolean
  created_at: string
}

// ── Orders ────────────────────────────────────────────────────
export type OrderStatus = 'OPEN' | 'PAID' | 'CANCELLED'

export interface Order {
  id: string
  table_id: string
  cashier_id: string
  invoice_number: string
  status: OrderStatus
  subtotal: number
  discount: number
  total: number
  note?: string
  created_at: string
  paid_at: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancel_reason: string | null
  table?: CoffeeTable
  cashier?: Profile
  items?: OrderItem[]
  payment?: Payment
}

// ── Order Items ───────────────────────────────────────────────
export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  subtotal: number
  note?: string
}

// ── Payments ──────────────────────────────────────────────────
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER'

export interface Payment {
  id: string
  order_id: string
  method: PaymentMethod
  amount: number
  paid_at: string
  cashier_id: string
}

// ── Audit Logs ────────────────────────────────────────────────
export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  details?: string
  created_at: string
  user?: Profile
}

// ── Revenue/Report Types ──────────────────────────────────────
export interface RevenueData {
  total_revenue: number
  total_orders: number
  avg_order_value: number
}

export interface TopProduct {
  product_name: string
  total_quantity: number
  total_revenue: number
}

export interface MonthlyRevenue {
  month: number
  year: number
  total_revenue: number
  total_orders: number
}

// ── Overview & Management Dashboard Types ─────────────────────
export interface HourlyRevenue {
  hour: number
  label: string
  revenue: number
  order_count: number
}

export interface ProductComparison {
  product_name: string
  current_qty: number
  current_revenue: number
  prev_qty: number
  prev_revenue: number
  diff_qty: number
  pct_change: number
  trend: 'up' | 'down' | 'same' | 'new'
}

export interface PaymentBreakdown {
  cash_amount: number
  cash_orders: number
  bank_amount: number
  bank_orders: number
}

export interface CashierPerformance {
  cashier_id: string
  cashier_name: string
  total_orders: number
  total_revenue: number
  avg_order_value: number
}

export interface CategoryRevenue {
  category_name: string
  total_quantity: number
  total_revenue: number
  percentage: number
}

export interface CancelledOrderSummary {
  id: string
  invoice_number: string
  table_name: string
  cancelled_by_name: string
  total: number
  cancel_reason: string
  cancelled_at: string
}

export interface OverviewSummary {
  net_revenue: number
  gross_revenue: number
  discount_total: number
  total_orders: number
  avg_order_value: number
  prev_net_revenue: number
  prev_orders: number
  revenue_growth_pct: number
  orders_growth_pct: number
  peak_hour: number | null
  peak_hour_revenue: number
}

export type ReportPeriodType = 'daily' | 'monthly' | 'quarterly' | 'yearly' | 'product'

export interface ExportReportRow {
  period_label: string
  order_count: number
  gross_revenue: number
  discount: number
  net_revenue: number
  avg_order_value: number
  note?: string
}

export interface ProductReportRow {
  product_name: string
  category_name: string
  unit_price: number
  quantity: number
  total_revenue: number
  percentage: number
}

export interface ShiftClosingData {
  closing_time: string
  period_title: string
  cashier_name: string
  net_revenue: number
  gross_revenue: number
  discount_total: number
  total_orders: number
  cash_amount: number
  cash_orders: number
  bank_amount: number
  bank_orders: number
  cancelled_orders_count: number
  cancelled_orders_amount: number
  top_items: { name: string; qty: number; revenue: number }[]
}

// ── UI / Cart ─────────────────────────────────────────────────
export interface CartItem {
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  subtotal: number
  note?: string
}

export interface ToppingOption {
  id: string
  name: string
  price: number
}

// ── Advanced Sales & Profitability Types ──────────────────────
export type DayTypeFilter = 'ALL' | 'WEEKDAY' | 'WEEKEND'

export interface ProductPerformance {
  product_id?: string
  product_name: string
  category_name?: string
  unit_price: number
  quantity: number
  revenue: number
  share_percent: number
}

export interface DayOfWeekRevenue {
  day_index: number
  day_name: string
  revenue: number
  order_count: number
  avg_revenue: number
  share_percent: number
}

export interface DailyTimelineRevenue {
  date_str: string
  label: string
  revenue: number
  order_count: number
  is_weekend: boolean
}

export interface WeekendComparison {
  weekday_revenue: number
  weekday_orders: number
  weekday_days_count: number
  weekday_avg_daily: number
  weekend_revenue: number
  weekend_orders: number
  weekend_days_count: number
  weekend_avg_daily: number
  weekend_ratio: number
}

