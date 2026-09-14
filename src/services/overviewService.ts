import { supabase } from '@/lib/supabase'
import type {
  OverviewSummary,
  HourlyRevenue,
  ProductComparison,
  PaymentBreakdown,
  CashierPerformance,
  CategoryRevenue,
  CancelledOrderSummary,
  ExportReportRow,
  ReportPeriodType,
  ProductReportRow,
} from '@/types'

export type PeriodType = 'today' | 'yesterday' | '7days' | 'this_month' | 'this_year' | 'custom'

export interface OverviewPayload {
  summary: OverviewSummary
  hourly: HourlyRevenue[]
  products: ProductComparison[]
  payments: PaymentBreakdown
  cancelled: CancelledOrderSummary[]
  cashiers: CashierPerformance[]
  categories: CategoryRevenue[]
  currentRange: { from: string; to: string; label: string }
}

export const overviewService = {
  /**
   * Helper to compute ISO start/end for periods & comparison periods
   */
  getPeriodRange(period: PeriodType, customFrom?: string, customTo?: string) {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    let currentStart = todayStart
    let currentEnd = todayEnd
    let prevStart = new Date(todayStart.getTime() - 86400000)
    let prevEnd = new Date(todayEnd.getTime() - 86400000)
    let label = 'Hôm nay'

    if (period === 'yesterday') {
      currentStart = new Date(todayStart.getTime() - 86400000)
      currentEnd = new Date(todayEnd.getTime() - 86400000)
      prevStart = new Date(currentStart.getTime() - 86400000)
      prevEnd = new Date(currentEnd.getTime() - 86400000)
      label = 'Hôm qua'
    } else if (period === '7days') {
      currentStart = new Date(todayStart.getTime() - 6 * 86400000)
      currentEnd = todayEnd
      prevStart = new Date(currentStart.getTime() - 7 * 86400000)
      prevEnd = new Date(currentStart.getTime() - 1)
      label = '7 ngày qua'
    } else if (period === 'this_month') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      label = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`
    } else if (period === 'this_year') {
      currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0)
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
      label = `Năm ${now.getFullYear()}`
    } else if (period === 'custom' && customFrom && customTo) {
      currentStart = new Date(customFrom + 'T00:00:00')
      currentEnd = new Date(customTo + 'T23:59:59.999')
      const duration = currentEnd.getTime() - currentStart.getTime()
      prevStart = new Date(currentStart.getTime() - duration - 1000)
      prevEnd = new Date(currentStart.getTime() - 1000)
      label = `${customFrom} đến ${customTo}`
    }

    return {
      currentFrom: currentStart.toISOString(),
      currentTo: currentEnd.toISOString(),
      prevFrom: prevStart.toISOString(),
      prevTo: prevEnd.toISOString(),
      label,
    }
  },

  /**
   * Main dashboard query aggregating net revenue, hourly distribution,
   * product comparisons, payment breakdown, and cashier metrics.
   */
  async getOverviewData(
    period: PeriodType = 'today',
    customFrom?: string,
    customTo?: string
  ): Promise<OverviewPayload> {
    const range = this.getPeriodRange(period, customFrom, customTo)

    // 1. Fetch current paid orders
    const { data: currentOrders, error: curErr } = await supabase
      .from('orders')
      .select('id, invoice_number, subtotal, discount, total, paid_at, cashier_id, table:tables(name), cashier:profiles!cashier_id(name)')
      .eq('status', 'PAID')
      .gte('paid_at', range.currentFrom)
      .lte('paid_at', range.currentTo)

    if (curErr) throw new Error(curErr.message)

    // 2. Fetch previous paid orders for comparison
    const { data: prevOrders, error: prevErr } = await supabase
      .from('orders')
      .select('id, total')
      .eq('status', 'PAID')
      .gte('paid_at', range.prevFrom)
      .lte('paid_at', range.prevTo)

    if (prevErr) throw new Error(prevErr.message)

    // 3. Fetch cancelled orders in current period
    const { data: cancelledOrders, error: canErr } = await supabase
      .from('orders')
      .select('id, invoice_number, total, cancelled_at, cancel_reason, table:tables(name), cancelled_by_profile:profiles!cancelled_by(name)')
      .eq('status', 'CANCELLED')
      .gte('created_at', range.currentFrom)
      .lte('created_at', range.currentTo)
      .order('cancelled_at', { ascending: false })

    if (canErr) throw new Error(canErr.message)

    // 4. Fetch current order items
    const curOrderIds = (currentOrders ?? []).map((o) => o.id)
    let curItems: { product_name: string; quantity: number; subtotal: number; product_id: string }[] = []
    if (curOrderIds.length > 0) {
      const { data: items, error: itemsErr } = await supabase
        .from('order_items')
        .select('product_name, quantity, subtotal, product_id')
        .in('order_id', curOrderIds)
      if (!itemsErr && items) curItems = items
    }

    // 5. Fetch previous order items for product comparison (e.g. yesterday)
    const prevOrderIds = (prevOrders ?? []).map((o) => o.id)
    let prevItems: { product_name: string; quantity: number; subtotal: number }[] = []
    if (prevOrderIds.length > 0) {
      const { data: pItems } = await supabase
        .from('order_items')
        .select('product_name, quantity, subtotal')
        .in('order_id', prevOrderIds)
      if (pItems) prevItems = pItems
    }

    // 6. Fetch payments for current orders
    let paymentsData: { method: string; amount: number }[] = []
    if (curOrderIds.length > 0) {
      const { data: pays } = await supabase
        .from('payments')
        .select('method, amount')
        .in('order_id', curOrderIds)
      if (pays) paymentsData = pays
    }

    // 7. Fetch categories map
    const { data: productsWithCat } = await supabase
      .from('products')
      .select('id, category:categories(name)')
    const productCategoryMap = new Map<string, string>()
    if (productsWithCat) {
      for (const p of productsWithCat) {
        const cat = p.category as unknown
        const catName = Array.isArray(cat) ? cat[0]?.name : (cat as { name: string } | null)?.name
        if (catName) {
          productCategoryMap.set(p.id, catName)
        }
      }
    }

    // --- Aggregations ---

    // A. Summary calculations
    const paidList = currentOrders ?? []
    const net_revenue = paidList.reduce((s, o) => s + (o.total || 0), 0)
    const gross_revenue = paidList.reduce((s, o) => s + (o.subtotal || 0), 0)
    const discount_total = paidList.reduce((s, o) => s + (o.discount || 0), 0)
    const total_orders = paidList.length
    const avg_order_value = total_orders > 0 ? Math.round(net_revenue / total_orders) : 0

    const prevList = prevOrders ?? []
    const prev_net_revenue = prevList.reduce((s, o) => s + (o.total || 0), 0)
    const prev_orders = prevList.length

    const revenue_growth_pct =
      prev_net_revenue > 0
        ? Math.round(((net_revenue - prev_net_revenue) / prev_net_revenue) * 100)
        : net_revenue > 0
        ? 100
        : 0

    const orders_growth_pct =
      prev_orders > 0
        ? Math.round(((total_orders - prev_orders) / prev_orders) * 100)
        : total_orders > 0
        ? 100
        : 0

    // B. Hourly breakdown (0 to 23)
    const hourlyMap = new Map<number, { revenue: number; count: number }>()
    for (let h = 0; h < 24; h++) {
      hourlyMap.set(h, { revenue: 0, count: 0 })
    }

    for (const ord of paidList) {
      if (ord.paid_at) {
        const h = new Date(ord.paid_at).getHours()
        const cur = hourlyMap.get(h) ?? { revenue: 0, count: 0 }
        cur.revenue += ord.total || 0
        cur.count += 1
        hourlyMap.set(h, cur)
      }
    }

    let peak_hour: number | null = null
    let peak_hour_revenue = 0

    const hourly: HourlyRevenue[] = []
    for (let h = 0; h < 24; h++) {
      const info = hourlyMap.get(h) ?? { revenue: 0, count: 0 }
      if (info.revenue > peak_hour_revenue) {
        peak_hour_revenue = info.revenue
        peak_hour = h
      }
      hourly.push({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        revenue: info.revenue,
        order_count: info.count,
      })
    }

    // C. Top products comparison with previous period
    const curProductMap = new Map<string, { qty: number; revenue: number }>()
    for (const item of curItems) {
      const cur = curProductMap.get(item.product_name) ?? { qty: 0, revenue: 0 }
      cur.qty += item.quantity
      cur.revenue += item.subtotal
      curProductMap.set(item.product_name, cur)
    }

    const prevProductMap = new Map<string, { qty: number; revenue: number }>()
    for (const item of prevItems) {
      const cur = prevProductMap.get(item.product_name) ?? { qty: 0, revenue: 0 }
      cur.qty += item.quantity
      cur.revenue += item.subtotal
      prevProductMap.set(item.product_name, cur)
    }

    const products: ProductComparison[] = []
    for (const [name, current] of curProductMap.entries()) {
      const prev = prevProductMap.get(name) ?? { qty: 0, revenue: 0 }
      const diff_qty = current.qty - prev.qty
      let pct_change = 0
      let trend: 'up' | 'down' | 'same' | 'new' = 'same'

      if (prev.qty === 0) {
        trend = 'new'
        pct_change = 100
      } else {
        pct_change = Math.round((diff_qty / prev.qty) * 100)
        if (diff_qty > 0) trend = 'up'
        else if (diff_qty < 0) trend = 'down'
        else trend = 'same'
      }

      products.push({
        product_name: name,
        current_qty: current.qty,
        current_revenue: current.revenue,
        prev_qty: prev.qty,
        prev_revenue: prev.revenue,
        diff_qty,
        pct_change,
        trend,
      })
    }
    products.sort((a, b) => b.current_qty - a.current_qty)

    // D. Payment breakdown (Cash vs Bank transfer)
    let cash_amount = 0
    let cash_orders = 0
    let bank_amount = 0
    let bank_orders = 0

    if (paymentsData.length > 0) {
      for (const p of paymentsData) {
        if (p.method === 'CASH') {
          cash_amount += p.amount
          cash_orders += 1
        } else {
          bank_amount += p.amount
          bank_orders += 1
        }
      }
    } else {
      cash_amount = net_revenue
      cash_orders = total_orders
    }

    const payments: PaymentBreakdown = {
      cash_amount,
      cash_orders,
      bank_amount,
      bank_orders,
    }

    // E. Cancelled orders summary
    const cancelled: CancelledOrderSummary[] = (cancelledOrders ?? []).map((co) => {
      const tb = co.table as unknown
      const tableName = Array.isArray(tb) ? tb[0]?.name : (tb as { name: string } | null)?.name
      const prof = co.cancelled_by_profile as unknown
      const profName = Array.isArray(prof) ? prof[0]?.name : (prof as { name: string } | null)?.name
      return {
        id: co.id,
        invoice_number: co.invoice_number,
        table_name: tableName ?? 'Mang về',
        cancelled_by_name: profName ?? 'Quản trị viên',
        total: co.total,
        cancel_reason: co.cancel_reason || 'Không ghi lý do',
        cancelled_at: co.cancelled_at || '',
      }
    })

    // F. Cashier performance
    const cashierMap = new Map<string, { name: string; count: number; revenue: number }>()
    for (const o of paidList) {
      const cid = o.cashier_id || 'unknown'
      const prof = o.cashier as unknown
      const cname = (Array.isArray(prof) ? prof[0]?.name : (prof as { name: string } | null)?.name) || 'Thu ngân'
      const existing = cashierMap.get(cid) ?? { name: cname, count: 0, revenue: 0 }
      existing.count += 1
      existing.revenue += o.total || 0
      cashierMap.set(cid, existing)
    }

    const cashiers: CashierPerformance[] = []
    for (const [id, c] of cashierMap.entries()) {
      cashiers.push({
        cashier_id: id,
        cashier_name: c.name,
        total_orders: c.count,
        total_revenue: c.revenue,
        avg_order_value: c.count > 0 ? Math.round(c.revenue / c.count) : 0,
      })
    }
    cashiers.sort((a, b) => b.total_revenue - a.total_revenue)

    // G. Category breakdown
    const categoryMap = new Map<string, { qty: number; revenue: number }>()
    for (const item of curItems) {
      const catName = productCategoryMap.get(item.product_id) || 'Món khác'
      const existing = categoryMap.get(catName) ?? { qty: 0, revenue: 0 }
      existing.qty += item.quantity
      existing.revenue += item.subtotal
      categoryMap.set(catName, existing)
    }

    const totalCategoryRevenue = Array.from(categoryMap.values()).reduce((s, c) => s + c.revenue, 0)
    const categories: CategoryRevenue[] = []
    for (const [cname, val] of categoryMap.entries()) {
      categories.push({
        category_name: cname,
        total_quantity: val.qty,
        total_revenue: val.revenue,
        percentage: totalCategoryRevenue > 0 ? Math.round((val.revenue / totalCategoryRevenue) * 100) : 0,
      })
    }
    categories.sort((a, b) => b.total_revenue - a.total_revenue)

    return {
      summary: {
        net_revenue,
        gross_revenue,
        discount_total,
        total_orders,
        avg_order_value,
        prev_net_revenue,
        prev_orders,
        revenue_growth_pct,
        orders_growth_pct,
        peak_hour,
        peak_hour_revenue,
      },
      hourly,
      products,
      payments,
      cancelled,
      cashiers,
      categories,
      currentRange: {
        from: range.currentFrom,
        to: range.currentTo,
        label: range.label,
      },
    }
  },

  /**
   * Generates structured export reports by Day, Month, Quarter, or Year
   */
  async getReportData(
    type: ReportPeriodType,
    options: {
      year: number
      month?: number
      from?: string
      to?: string
    }
  ): Promise<ExportReportRow[]> {
    const { year, month } = options

    if (type === 'daily') {
      const targetMonth = month ? month - 1 : new Date().getMonth()
      const daysInMonth = new Date(year, targetMonth + 1, 0).getDate()
      const startIso = new Date(year, targetMonth, 1, 0, 0, 0).toISOString()
      const endIso = new Date(year, targetMonth, daysInMonth, 23, 59, 59, 999).toISOString()

      const { data } = await supabase
        .from('orders')
        .select('total, subtotal, discount, paid_at')
        .eq('status', 'PAID')
        .gte('paid_at', startIso)
        .lte('paid_at', endIso)

      const orders = data ?? []
      const rows: ExportReportRow[] = []

      for (let d = 1; d <= daysInMonth; d++) {
        const dayPrefix = `${year}-${String(targetMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const dayOrders = orders.filter((o) => o.paid_at && o.paid_at.startsWith(dayPrefix))

        const net = dayOrders.reduce((s, o) => s + (o.total || 0), 0)
        const gross = dayOrders.reduce((s, o) => s + (o.subtotal || 0), 0)
        const disc = dayOrders.reduce((s, o) => s + (o.discount || 0), 0)
        const count = dayOrders.length

        rows.push({
          period_label: `Ngày ${String(d).padStart(2, '0')}/${String(targetMonth + 1).padStart(2, '0')}/${year}`,
          order_count: count,
          gross_revenue: gross,
          discount: disc,
          net_revenue: net,
          avg_order_value: count > 0 ? Math.round(net / count) : 0,
        })
      }
      return rows
    }

    if (type === 'monthly') {
      const startIso = new Date(year, 0, 1, 0, 0, 0).toISOString()
      const endIso = new Date(year, 11, 31, 23, 59, 59, 999).toISOString()

      const { data } = await supabase
        .from('orders')
        .select('total, subtotal, discount, paid_at')
        .eq('status', 'PAID')
        .gte('paid_at', startIso)
        .lte('paid_at', endIso)

      const orders = data ?? []
      const rows: ExportReportRow[] = []

      for (let m = 0; m < 12; m++) {
        const mPrefix = `${year}-${String(m + 1).padStart(2, '0')}`
        const mOrders = orders.filter((o) => o.paid_at && o.paid_at.startsWith(mPrefix))

        const net = mOrders.reduce((s, o) => s + (o.total || 0), 0)
        const gross = mOrders.reduce((s, o) => s + (o.subtotal || 0), 0)
        const disc = mOrders.reduce((s, o) => s + (o.discount || 0), 0)
        const count = mOrders.length

        rows.push({
          period_label: `Tháng ${String(m + 1).padStart(2, '0')}/${year}`,
          order_count: count,
          gross_revenue: gross,
          discount: disc,
          net_revenue: net,
          avg_order_value: count > 0 ? Math.round(net / count) : 0,
        })
      }
      return rows
    }

    if (type === 'quarterly') {
      const quarters = [
        { name: `Quý 1/${year} (Tháng 1 - 3)`, startM: 0, endM: 2 },
        { name: `Quý 2/${year} (Tháng 4 - 6)`, startM: 3, endM: 5 },
        { name: `Quý 3/${year} (Tháng 7 - 9)`, startM: 6, endM: 8 },
        { name: `Quý 4/${year} (Tháng 10 - 12)`, startM: 9, endM: 11 },
      ]

      const startIso = new Date(year, 0, 1).toISOString()
      const endIso = new Date(year, 11, 31, 23, 59, 59, 999).toISOString()

      const { data } = await supabase
        .from('orders')
        .select('total, subtotal, discount, paid_at')
        .eq('status', 'PAID')
        .gte('paid_at', startIso)
        .lte('paid_at', endIso)

      const orders = data ?? []
      const rows: ExportReportRow[] = []

      for (const q of quarters) {
        const qOrders = orders.filter((o) => {
          if (!o.paid_at) return false
          const m = new Date(o.paid_at).getMonth()
          return m >= q.startM && m <= q.endM
        })

        const net = qOrders.reduce((s, o) => s + (o.total || 0), 0)
        const gross = qOrders.reduce((s, o) => s + (o.subtotal || 0), 0)
        const disc = qOrders.reduce((s, o) => s + (o.discount || 0), 0)
        const count = qOrders.length

        rows.push({
          period_label: q.name,
          order_count: count,
          gross_revenue: gross,
          discount: disc,
          net_revenue: net,
          avg_order_value: count > 0 ? Math.round(net / count) : 0,
        })
      }
      return rows
    }

    if (type === 'yearly') {
      const currentYear = new Date().getFullYear()
      const years = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear]
      const rows: ExportReportRow[] = []

      for (const y of years) {
        const startIso = new Date(y, 0, 1).toISOString()
        const endIso = new Date(y, 11, 31, 23, 59, 59, 999).toISOString()

        const { data } = await supabase
          .from('orders')
          .select('total, subtotal, discount')
          .eq('status', 'PAID')
          .gte('paid_at', startIso)
          .lte('paid_at', endIso)

        const orders = data ?? []
        const net = orders.reduce((s, o) => s + (o.total || 0), 0)
        const gross = orders.reduce((s, o) => s + (o.subtotal || 0), 0)
        const disc = orders.reduce((s, o) => s + (o.discount || 0), 0)
        const count = orders.length

        rows.push({
          period_label: `Năm ${y}`,
          order_count: count,
          gross_revenue: gross,
          discount: disc,
          net_revenue: net,
          avg_order_value: count > 0 ? Math.round(net / count) : 0,
        })
      }
      return rows
    }

    return []
  },

  /**
   * Báo cáo bán hàng theo mặt hàng (Product Sales Report)
   */
  async getProductReportData(options: {
    year: number
    month?: number
    from?: string
    to?: string
  }): Promise<ProductReportRow[]> {
    const { year, month, from, to } = options
    let startIso: string
    let endIso: string

    if (from && to) {
      startIso = new Date(from + 'T00:00:00').toISOString()
      endIso = new Date(to + 'T23:59:59.999').toISOString()
    } else if (month && month >= 1 && month <= 12) {
      const daysInMonth = new Date(year, month, 0).getDate()
      startIso = new Date(year, month - 1, 1, 0, 0, 0).toISOString()
      endIso = new Date(year, month - 1, daysInMonth, 23, 59, 59, 999).toISOString()
    } else {
      startIso = new Date(year, 0, 1, 0, 0, 0).toISOString()
      endIso = new Date(year, 11, 31, 23, 59, 59, 999).toISOString()
    }

    // 1. Get paid orders in range
    const { data: orders, error: ordErr } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'PAID')
      .gte('paid_at', startIso)
      .lte('paid_at', endIso)

    if (ordErr) throw new Error(ordErr.message)
    if (!orders || orders.length === 0) return []

    const orderIds = orders.map((o) => o.id)

    // 2. Fetch order items for these orders
    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('product_id, product_name, unit_price, quantity, subtotal')
      .in('order_id', orderIds)

    if (itemsErr) throw new Error(itemsErr.message)
    if (!items || items.length === 0) return []

    // 3. Fetch categories mapping
    const { data: products } = await supabase
      .from('products')
      .select('id, category:categories(name)')

    const productCategoryMap = new Map<string, string>()
    if (products) {
      for (const p of products) {
        const cat = p.category as unknown
        const catName = Array.isArray(cat) ? cat[0]?.name : (cat as { name: string } | null)?.name
        if (catName) {
          productCategoryMap.set(p.id, catName)
        }
      }
    }

    // 4. Aggregate by product_name
    const map = new Map<
      string,
      { category_name: string; unit_price: number; quantity: number; revenue: number }
    >()

    let totalAllRevenue = 0

    for (const item of items) {
      const catName = productCategoryMap.get(item.product_id) || 'Khác'
      const existing = map.get(item.product_name) ?? {
        category_name: catName,
        unit_price: item.unit_price,
        quantity: 0,
        revenue: 0,
      }
      existing.quantity += item.quantity
      existing.revenue += item.subtotal
      existing.unit_price = item.unit_price
      totalAllRevenue += item.subtotal
      map.set(item.product_name, existing)
    }

    const results: ProductReportRow[] = []
    for (const [name, val] of map.entries()) {
      results.push({
        product_name: name,
        category_name: val.category_name,
        unit_price: val.unit_price,
        quantity: val.quantity,
        total_revenue: val.revenue,
        percentage: totalAllRevenue > 0 ? Number(((val.revenue / totalAllRevenue) * 100).toFixed(1)) : 0,
      })
    }

    // Sort by quantity sold descending
    results.sort((a, b) => b.quantity - a.quantity || b.total_revenue - a.total_revenue)
    return results
  },
}
