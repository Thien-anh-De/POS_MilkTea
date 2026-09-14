import { supabase } from '@/lib/supabase'
import type {
  RevenueData,
  TopProduct,
  MonthlyRevenue,
  DayTypeFilter,
  HourlyRevenue,
  DayOfWeekRevenue,
  DailyTimelineRevenue,
  WeekendComparison,
  ProductPerformance,
} from '@/types'

export interface DetailedAnalyticsResult {
  summary: RevenueData & {
    cash_amount: number
    cash_orders: number
    bank_amount: number
    bank_orders: number
  }
  hourly: HourlyRevenue[]
  day_of_week: DayOfWeekRevenue[]
  daily_timeline: DailyTimelineRevenue[]
  weekend_comparison: WeekendComparison
}

export interface ProductRankingsResult {
  all_products: ProductPerformance[]
  top_high: ProductPerformance[]
  top_low: ProductPerformance[]
  total_sales_revenue: number
  total_sales_quantity: number
}

export const reportService = {
  // ── Existing Helper Methods ─────────────────────────────────
  async getRevenue(from: string, to: string): Promise<RevenueData> {
    const { data, error } = await supabase
      .from('orders')
      .select('total')
      .eq('status', 'PAID')
      .gte('paid_at', from)
      .lte('paid_at', to)

    if (error) throw new Error(error.message)

    const orders = data ?? []
    const total_revenue = orders.reduce((sum, o) => sum + Number(o.total), 0)
    const total_orders = orders.length
    const avg_order_value = total_orders > 0 ? Math.round(total_revenue / total_orders) : 0

    return { total_revenue, total_orders, avg_order_value }
  },

  async getTodayRevenue(): Promise<RevenueData> {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()
    return this.getRevenue(start, end)
  },

  async getMonthlyRevenue(year: number): Promise<MonthlyRevenue[]> {
    const results: MonthlyRevenue[] = []

    for (let month = 1; month <= 12; month++) {
      const start = new Date(year, month - 1, 1).toISOString()
      const end = new Date(year, month, 1).toISOString()

      const { data } = await supabase
        .from('orders')
        .select('total')
        .eq('status', 'PAID')
        .gte('paid_at', start)
        .lte('paid_at', end)

      const orders = data ?? []
      results.push({
        month,
        year,
        total_revenue: orders.reduce((sum, o) => sum + Number(o.total), 0),
        total_orders: orders.length,
      })
    }

    return results
  },

  async getYearlyRevenue(year: number): Promise<RevenueData> {
    const start = new Date(year, 0, 1).toISOString()
    const end = new Date(year + 1, 0, 1).toISOString()
    return this.getRevenue(start, end)
  },

  async getTopProducts(from: string, to: string, limit = 10): Promise<TopProduct[]> {
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'PAID')
      .gte('paid_at', from)
      .lte('paid_at', to)

    if (!orders || orders.length === 0) return []
    const orderIds = orders.map((o) => o.id)

    const { data: items } = await supabase
      .from('order_items')
      .select('product_name, quantity, subtotal')
      .in('order_id', orderIds)

    if (!items) return []

    const map = new Map<string, { quantity: number; revenue: number }>()
    for (const item of items) {
      const existing = map.get(item.product_name) ?? { quantity: 0, revenue: 0 }
      existing.quantity += item.quantity
      existing.revenue += Number(item.subtotal)
      map.set(item.product_name, existing)
    }

    const results: TopProduct[] = []
    for (const [name, val] of map.entries()) {
      results.push({
        product_name: name,
        total_quantity: val.quantity,
        total_revenue: val.revenue,
      })
    }

    results.sort((a, b) => b.total_quantity - a.total_quantity)
    return results.slice(0, limit)
  },

  // ── Detailed Multidimensional Analytics (Hour, Day of Week, Daily, Weekend) ────
  async getDetailedAnalytics(
    from: string,
    to: string,
    filterType: DayTypeFilter = 'ALL'
  ): Promise<DetailedAnalyticsResult> {
    // 1. Fetch orders in range with payments
    const { data: rawOrders, error } = await supabase
      .from('orders')
      .select('id, total, subtotal, discount, paid_at, payment:payments(method, amount)')
      .eq('status', 'PAID')
      .gte('paid_at', from)
      .lte('paid_at', to)

    if (error) throw new Error(error.message)
    const allPaidOrders = rawOrders ?? []

    // 2. Separate into Weekday vs Weekend for benchmark
    let weekdayRev = 0
    let weekdayOrders = 0
    const weekdayDaysSet = new Set<string>()

    let weekendRev = 0
    let weekendOrders = 0
    const weekendDaysSet = new Set<string>()

    allPaidOrders.forEach((ord) => {
      if (!ord.paid_at) return
      const d = new Date(ord.paid_at)
      const dayOfWeek = d.getDay() // 0 = Sun, 6 = Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const dateKey = ord.paid_at.substring(0, 10)
      const amt = Number(ord.total) || 0

      if (isWeekend) {
        weekendRev += amt
        weekendOrders += 1
        weekendDaysSet.add(dateKey)
      } else {
        weekdayRev += amt
        weekdayOrders += 1
        weekdayDaysSet.add(dateKey)
      }
    })

    const weekdayDaysCount = Math.max(weekdayDaysSet.size, 1)
    const weekendDaysCount = Math.max(weekendDaysSet.size, 1)
    const totalAllRev = weekdayRev + weekendRev
    const weekendRatio = totalAllRev > 0 ? Math.round((weekendRev / totalAllRev) * 100) : 0

    const weekend_comparison: WeekendComparison = {
      weekday_revenue: weekdayRev,
      weekday_orders: weekdayOrders,
      weekday_days_count: weekdayDaysCount,
      weekday_avg_daily: Math.round(weekdayRev / weekdayDaysCount),
      weekend_revenue: weekendRev,
      weekend_orders: weekendOrders,
      weekend_days_count: weekendDaysCount,
      weekend_avg_daily: Math.round(weekendRev / weekendDaysCount),
      weekend_ratio: weekendRatio,
    }

    // 3. Filter orders according to user's selected day type filter
    const filteredOrders = allPaidOrders.filter((ord) => {
      if (!ord.paid_at) return false
      if (filterType === 'ALL') return true
      const dayOfWeek = new Date(ord.paid_at).getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      return filterType === 'WEEKEND' ? isWeekend : !isWeekend
    })

    // 4. Summarize filtered orders
    let total_revenue = 0
    let cash_amount = 0
    let cash_orders = 0
    let bank_amount = 0
    let bank_orders = 0

    filteredOrders.forEach((ord) => {
      const tot = Number(ord.total) || 0
      total_revenue += tot

      const method = (ord.payment as any)?.[0]?.method || (ord.payment as any)?.method || 'CASH'
      if (method === 'CASH') {
        cash_amount += tot
        cash_orders += 1
      } else {
        bank_amount += tot
        bank_orders += 1
      }
    })

    const total_orders = filteredOrders.length
    const avg_order_value = total_orders > 0 ? Math.round(total_revenue / total_orders) : 0

    // 5. Hourly Breakdown (06:00 to 23:00)
    const hourlyMap = new Map<number, { revenue: number; count: number }>()
    for (let h = 6; h <= 23; h++) {
      hourlyMap.set(h, { revenue: 0, count: 0 })
    }

    filteredOrders.forEach((ord) => {
      if (!ord.paid_at) return
      const h = new Date(ord.paid_at).getHours()
      const cur = hourlyMap.get(h) ?? { revenue: 0, count: 0 }
      cur.revenue += Number(ord.total) || 0
      cur.count += 1
      hourlyMap.set(h, cur)
    })

    const hourly: HourlyRevenue[] = Array.from(hourlyMap.entries()).map(([hour, val]) => ({
      hour,
      label: `${hour}:00 - ${hour + 1}:00`,
      revenue: val.revenue,
      order_count: val.count,
    }))

    // 6. Day of Week Breakdown (Thứ 2 -> Chủ Nhật)
    const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
    const dayOfWeekMap = new Map<number, { revenue: number; count: number }>()
    for (let d = 0; d <= 6; d++) {
      dayOfWeekMap.set(d, { revenue: 0, count: 0 })
    }

    filteredOrders.forEach((ord) => {
      if (!ord.paid_at) return
      const d = new Date(ord.paid_at).getDay()
      const cur = dayOfWeekMap.get(d) ?? { revenue: 0, count: 0 }
      cur.revenue += Number(ord.total) || 0
      cur.count += 1
      dayOfWeekMap.set(d, cur)
    })

    const orderedDays = [1, 2, 3, 4, 5, 6, 0]
    const day_of_week: DayOfWeekRevenue[] = orderedDays.map((idx) => {
      const data = dayOfWeekMap.get(idx) ?? { revenue: 0, count: 0 }
      return {
        day_index: idx,
        day_name: dayNames[idx],
        revenue: data.revenue,
        order_count: data.count,
        avg_revenue: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
        share_percent: total_revenue > 0 ? Math.round((data.revenue / total_revenue) * 100) : 0,
      }
    })

    // 7. Daily Timeline Breakdown
    const dailyMap = new Map<string, { revenue: number; count: number; isWeekend: boolean }>()
    filteredOrders.forEach((ord) => {
      if (!ord.paid_at) return
      const d = new Date(ord.paid_at)
      const dateKey = ord.paid_at.substring(0, 10)
      const isWeekend = d.getDay() === 0 || d.getDay() === 6
      const cur = dailyMap.get(dateKey) ?? { revenue: 0, count: 0, isWeekend }
      cur.revenue += Number(ord.total) || 0
      cur.count += 1
      dailyMap.set(dateKey, cur)
    })

    const daily_timeline: DailyTimelineRevenue[] = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, val]) => {
        const parts = dateKey.split('-')
        const label = `${parts[2]}/${parts[1]}/${parts[0]}`
        return {
          date_str: dateKey,
          label,
          revenue: val.revenue,
          order_count: val.count,
          is_weekend: val.isWeekend,
        }
      })

    return {
      summary: {
        total_revenue,
        total_orders,
        avg_order_value,
        cash_amount,
        cash_orders,
        bank_amount,
        bank_orders,
      },
      hourly,
      day_of_week,
      daily_timeline,
      weekend_comparison,
    }
  },

  // ── Product Rankings: Top Doanh Thu Cao & Top Doanh Thu Yếu ─────
  async getProductRankings(
    from: string,
    to: string,
    filterType: DayTypeFilter = 'ALL'
  ): Promise<ProductRankingsResult> {
    // 1. Fetch all products from menu (including category)
    const { data: rawProducts } = await supabase
      .from('products')
      .select('id, name, price, active, category:categories(name)')
      .order('name')

    const menuProducts = rawProducts ?? []

    // 2. Fetch paid orders in date range with filterType
    const { data: rawOrders } = await supabase
      .from('orders')
      .select('id, paid_at')
      .eq('status', 'PAID')
      .gte('paid_at', from)
      .lte('paid_at', to)

    const allOrders = rawOrders ?? []
    const validOrders = allOrders.filter((ord) => {
      if (!ord.paid_at) return false
      if (filterType === 'ALL') return true
      const day = new Date(ord.paid_at).getDay()
      const isWeekend = day === 0 || day === 6
      return filterType === 'WEEKEND' ? isWeekend : !isWeekend
    })

    const orderIds = validOrders.map((o) => o.id)

    // 3. Fetch sold items
    const salesMap = new Map<string, { qty: number; revenue: number }>()
    let total_sales_revenue = 0
    let total_sales_quantity = 0

    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from('order_items')
        .select('product_name, quantity, subtotal')
        .in('order_id', orderIds)

      ;(items ?? []).forEach((it) => {
        const cur = salesMap.get(it.product_name) ?? { qty: 0, revenue: 0 }
        cur.qty += it.quantity
        cur.revenue += Number(it.subtotal) || 0
        salesMap.set(it.product_name, cur)

        total_sales_revenue += Number(it.subtotal) || 0
        total_sales_quantity += it.quantity
      })
    }

    // 4. Merge all products with sales & calculate share percentage
    const all_products: ProductPerformance[] = []
    const processedNames = new Set<string>()

    menuProducts.forEach((p) => {
      processedNames.add(p.name)
      const sales = salesMap.get(p.name) ?? { qty: 0, revenue: 0 }
      const unit_price = Number(p.price) || 0
      const share_percent =
        total_sales_revenue > 0 ? Math.round((sales.revenue / total_sales_revenue) * 100) : 0

      all_products.push({
        product_id: p.id,
        product_name: p.name,
        category_name: (p.category as any)?.name || 'Chưa phân loại',
        unit_price,
        quantity: sales.qty,
        revenue: sales.revenue,
        share_percent,
      })
    })

    // Include items sold that are no longer in menu
    for (const [name, sales] of salesMap.entries()) {
      if (!processedNames.has(name)) {
        const unit_price = sales.qty > 0 ? Math.round(sales.revenue / sales.qty) : 0
        const share_percent =
          total_sales_revenue > 0 ? Math.round((sales.revenue / total_sales_revenue) * 100) : 0

        all_products.push({
          product_name: name,
          category_name: 'Món khác',
          unit_price,
          quantity: sales.qty,
          revenue: sales.revenue,
          share_percent,
        })
      }
    }

    // 5. Generate Rankings:
    // Top doanh thu cao (Món bán chạy nhất theo Doanh thu & Số lượng)
    const top_high = [...all_products]
      .filter((p) => p.revenue > 0 || p.quantity > 0)
      .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)

    // Top doanh thu yếu (Món bán ít nhất hoặc 0 ly / 0 đ)
    const top_low = [...all_products].sort(
      (a, b) => a.revenue - b.revenue || a.quantity - b.quantity
    )

    return {
      all_products,
      top_high,
      top_low,
      total_sales_revenue,
      total_sales_quantity,
    }
  },
}
