import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@/hooks/useToast'
import {
  reportService,
  type DetailedAnalyticsResult,
  type ProductRankingsResult,
} from '@/services/reportService'
import { ToastContainer, LoadingSpinner } from '@/components/ui'
import { formatCurrency } from '@/utils/helpers'
import type { DayTypeFilter, ProductPerformance } from '@/types'
import {
  TrendingUp,
  Calendar,
  Clock,
  Trophy,
  Coins,
  Sun,
  Coffee,
  Sparkles,
  ArrowUpRight,
  Receipt,
  Layers,
  Building2,
  Palmtree,
  SlidersHorizontal,
} from 'lucide-react'

type PresetTime = 'today' | 'yesterday' | 'last7days' | 'thismonth' | 'last30days' | 'custom'
type ProductRankTab = 'top_high' | 'top_low'
type DimensionTab = 'hourly' | 'day_of_week' | 'daily'

export default function ReportsPage() {
  const { toasts, error: toastError, removeToast } = useToast()

  // Filters State
  const [preset, setPreset] = useState<PresetTime>('thismonth')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dayTypeFilter, setDayTypeFilter] = useState<DayTypeFilter>('ALL')

  // Tabs
  const [activeDimension, setActiveDimension] = useState<DimensionTab>('hourly')
  const [activeProductTab, setActiveProductTab] = useState<ProductRankTab>('top_high')

  // Data State
  const [loading, setLoading] = useState(false)
  const [analytics, setAnalytics] = useState<DetailedAnalyticsResult | null>(null)
  const [rankings, setRankings] = useState<ProductRankingsResult | null>(null)

  // Initialize date range based on preset
  const applyPreset = useCallback((type: PresetTime) => {
    const now = new Date()
    const formatDate = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    if (type === 'today') {
      const str = formatDate(now)
      setDateFrom(str)
      setDateTo(str)
    } else if (type === 'yesterday') {
      const yest = new Date(now)
      yest.setDate(yest.getDate() - 1)
      const str = formatDate(yest)
      setDateFrom(str)
      setDateTo(str)
    } else if (type === 'last7days') {
      const past = new Date()
      past.setDate(past.getDate() - 6)
      setDateFrom(formatDate(past))
      setDateTo(formatDate(now))
    } else if (type === 'thismonth') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      setDateFrom(formatDate(first))
      setDateTo(formatDate(now))
    } else if (type === 'last30days') {
      const past = new Date()
      past.setDate(past.getDate() - 29)
      setDateFrom(formatDate(past))
      setDateTo(formatDate(now))
    }
  }, [])

  useEffect(() => {
    applyPreset(preset)
  }, [preset, applyPreset])

  // Fetch Report Data
  const loadData = useCallback(async () => {
    if (!dateFrom || !dateTo) return
    setLoading(true)
    try {
      const startIso = new Date(`${dateFrom}T00:00:00.000`).toISOString()
      const endIso = new Date(`${dateTo}T23:59:59.999`).toISOString()

      const [analyticsData, rankingsData] = await Promise.all([
        reportService.getDetailedAnalytics(startIso, endIso, dayTypeFilter),
        reportService.getProductRankings(startIso, endIso, dayTypeFilter),
      ])

      setAnalytics(analyticsData)
      setRankings(rankingsData)
    } catch (err: any) {
      toastError(err.message || 'Không thể tải báo cáo bán hàng')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, dayTypeFilter, toastError])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Current Products List for Active Tab
  const currentProductsList: ProductPerformance[] = useMemo(() => {
    if (!rankings) return []
    return activeProductTab === 'top_high' ? rankings.top_high : rankings.top_low
  }, [rankings, activeProductTab])

  // Max value for hourly visual bars
  const maxHourlyRev = useMemo(() => {
    if (!analytics || analytics.hourly.length === 0) return 1
    return Math.max(...analytics.hourly.map((h) => h.revenue), 1)
  }, [analytics])

  // Max value for day of week visual bars
  const maxDayOfWeekRev = useMemo(() => {
    if (!analytics || analytics.day_of_week.length === 0) return 1
    return Math.max(...analytics.day_of_week.map((d) => d.revenue), 1)
  }, [analytics])

  const formatShortCurrency = (amount: number) => {
    if (amount === 0) return '0'
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1).replace('.0', '')}tr`
    }
    if (amount >= 1000) {
      return `${Math.round(amount / 1000)}k`
    }
    return `${amount}đ`
  }

  const shiftSummary = useMemo(() => {
    if (!analytics) {
      return { morning: 0, noon: 0, afternoon: 0, evening: 0, mCount: 0, nCount: 0, aCount: 0, eCount: 0 }
    }
    let morning = 0, noon = 0, afternoon = 0, evening = 0
    let mCount = 0, nCount = 0, aCount = 0, eCount = 0
    analytics.hourly.forEach((h) => {
      if (h.hour >= 6 && h.hour <= 10) {
        morning += h.revenue
        mCount += h.order_count
      } else if (h.hour >= 11 && h.hour <= 13) {
        noon += h.revenue
        nCount += h.order_count
      } else if (h.hour >= 14 && h.hour <= 17) {
        afternoon += h.revenue
        aCount += h.order_count
      } else if (h.hour >= 18) {
        evening += h.revenue
        eCount += h.order_count
      }
    })
    return { morning, noon, afternoon, evening, mCount, nCount, aCount, eCount }
  }, [analytics])

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Coffee color="var(--color-coffee-500)" size={28} />
          Báo Cáo Doanh Thu & Bán Hàng
        </h1>
        <p className="page-subtitle">
          Thống kê top doanh thu cao, top doanh thu yếu, phân bổ theo giờ và so sánh ngày thường vs cuối tuần
        </p>
      </div>

      {/* ── FILTER TOOLBAR ─────────────────────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Row 1: Time Presets & Date Inputs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Presets */}
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', alignSelf: 'center', marginRight: '0.5rem' }}>
              Khoảng thời gian:
            </span>
            {[
              { key: 'today', label: 'Hôm nay' },
              { key: 'yesterday', label: 'Hôm qua' },
              { key: 'last7days', label: '7 ngày qua' },
              { key: 'thismonth', label: 'Tháng này' },
              { key: 'last30days', label: '30 ngày qua' },
              { key: 'custom', label: 'Tùy chỉnh' },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => {
                  setPreset(p.key as PresetTime)
                  if (p.key !== 'custom') applyPreset(p.key as PresetTime)
                }}
                className={`btn btn-sm ${preset === p.key ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: 'var(--radius-md)', fontWeight: 500 }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Range Inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Calendar size={15} color="var(--color-coffee-400)" />
              <input
                type="date"
                className="input input-sm"
                value={dateFrom}
                onChange={(e) => {
                  setPreset('custom')
                  setDateFrom(e.target.value)
                }}
                style={{ width: '135px' }}
              />
            </div>
            <span style={{ color: 'var(--color-text-muted)' }}>đến</span>
            <input
              type="date"
              className="input input-sm"
              value={dateTo}
              onChange={(e) => {
                setPreset('custom')
                setDateTo(e.target.value)
              }}
              style={{ width: '135px' }}
            />
          </div>
        </div>

        {/* Row 2: Weekday vs Weekend Filter Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <SlidersHorizontal size={14} />
              Xem dữ liệu:
            </span>
            <button
              onClick={() => setDayTypeFilter('ALL')}
              className={`btn btn-sm ${dayTypeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              🟢 Tất cả các ngày
            </button>
            <button
              onClick={() => setDayTypeFilter('WEEKDAY')}
              className={`btn btn-sm ${dayTypeFilter === 'WEEKDAY' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                borderRadius: 'var(--radius-full)',
                borderColor: dayTypeFilter === 'WEEKDAY' ? undefined : '#93c5fd',
                color: dayTypeFilter === 'WEEKDAY' ? undefined : '#1e40af',
              }}
            >
              <Building2 size={13} style={{ marginRight: '0.25rem' }} />
              Chỉ Ngày thường (Thứ 2 – Thứ 6)
            </button>
            <button
              onClick={() => setDayTypeFilter('WEEKEND')}
              className={`btn btn-sm ${dayTypeFilter === 'WEEKEND' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                borderRadius: 'var(--radius-full)',
                borderColor: dayTypeFilter === 'WEEKEND' ? undefined : '#fbcfe8',
                color: dayTypeFilter === 'WEEKEND' ? undefined : '#9d174d',
              }}
            >
              <Palmtree size={13} style={{ marginRight: '0.25rem' }} />
              Chỉ Cuối tuần (Thứ 7 & Chủ Nhật)
            </button>
          </div>

          {analytics?.weekend_comparison && (
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Tỷ trọng doanh thu cuối tuần: <strong style={{ color: 'var(--color-coffee-600)' }}>{analytics.weekend_comparison.weekend_ratio}%</strong>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <LoadingSpinner size={40} />
        </div>
      )}

      {!loading && analytics && (
        <>
          {/* ── KPI STATS CARDS ────────────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
            className="stagger-children"
          >
            {/* Doanh thu thuần */}
            <div className="stat-card" style={{ borderLeft: '4px solid var(--color-coffee-500)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <span className="stat-label">Tổng doanh thu</span>
                <Coins size={18} color="var(--color-coffee-500)" />
              </div>
              <div className="stat-value" style={{ color: 'var(--color-coffee-800)' }}>
                {formatCurrency(analytics.summary.total_revenue)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Từ {analytics.summary.total_orders} hóa đơn thanh toán
              </div>
            </div>

            {/* Giá trị đơn trung bình */}
            <div className="stat-card" style={{ borderLeft: '4px solid #16a34a' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <span className="stat-label">Giá trị TB / đơn</span>
                <TrendingUp size={18} color="#16a34a" />
              </div>
              <div className="stat-value" style={{ color: '#15803d' }}>
                {formatCurrency(analytics.summary.avg_order_value)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>
                Mức chi tiêu trung bình mỗi lượt khách
              </div>
            </div>

            {/* Tiền mặt */}
            <div className="stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <span className="stat-label">Tiền mặt</span>
                <Receipt size={18} color="#0284c7" />
              </div>
              <div className="stat-value" style={{ color: '#0369a1' }}>
                {formatCurrency(analytics.summary.cash_amount)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                {analytics.summary.cash_orders} đơn ({analytics.summary.total_revenue > 0 ? Math.round((analytics.summary.cash_amount / analytics.summary.total_revenue) * 100) : 0}%)
              </div>
            </div>

            {/* Chuyển khoản */}
            <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <span className="stat-label">Chuyển khoản (QR)</span>
                <ArrowUpRight size={18} color="#8b5cf6" />
              </div>
              <div className="stat-value" style={{ color: '#6d28d9' }}>
                {formatCurrency(analytics.summary.bank_amount)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                {analytics.summary.bank_orders} đơn ({analytics.summary.total_revenue > 0 ? Math.round((analytics.summary.bank_amount / analytics.summary.total_revenue) * 100) : 0}%)
              </div>
            </div>
          </div>

          {/* ── WEEKDAY VS WEEKEND BENCHMARK CARD ──────────────────────── */}
          {analytics.weekend_comparison && (
            <div
              className="glass-card"
              style={{
                padding: '1.25rem',
                marginBottom: '1.75rem',
                background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.4) 0%, rgba(243, 232, 255, 0.4) 100%)',
                border: '1px solid rgba(217, 119, 6, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} color="var(--color-coffee-600)" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--color-coffee-900)' }}>
                    So sánh Sức Mua: Ngày thường (T2–T6) vs Cuối tuần (T7–CN)
                  </h3>
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-coffee-700)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  Tỷ trọng cuối tuần: <strong>{analytics.weekend_comparison.weekend_ratio}%</strong> doanh số
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {/* Ngày thường */}
                <div
                  style={{
                    background: 'var(--color-surface)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#1e40af', fontWeight: 600, fontSize: '0.9rem' }}>
                    <Building2 size={16} />
                    <span>Ngày trong tuần (Thứ 2 – Thứ 6)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d4ed8' }}>
                        {formatCurrency(analytics.weekend_comparison.weekday_avg_daily)}
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)' }}> / ngày</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        Tổng {formatCurrency(analytics.weekend_comparison.weekday_revenue)} ({analytics.weekend_comparison.weekday_orders} đơn trong {analytics.weekend_comparison.weekday_days_count} ngày)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cuối tuần */}
                <div
                  style={{
                    background: 'var(--color-surface)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid #fbcfe8',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#9d174d', fontWeight: 600, fontSize: '0.9rem' }}>
                    <Palmtree size={16} />
                    <span>Cuối tuần (Thứ 7 & Chủ Nhật)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#be185d' }}>
                        {formatCurrency(analytics.weekend_comparison.weekend_avg_daily)}
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)' }}> / ngày</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        Tổng {formatCurrency(analytics.weekend_comparison.weekend_revenue)} ({analytics.weekend_comparison.weekend_orders} đơn trong {analytics.weekend_comparison.weekend_days_count} ngày)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── MULTIDIMENSIONAL REVENUE BREAKDOWN ─────────────────────── */}
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={20} color="var(--color-coffee-500)" />
                  Phân Bổ Doanh Thu Đa Chiều
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
                  Theo dõi xu hướng mua hàng theo giờ trong ngày, theo thứ trong tuần và tiến độ theo ngày
                </p>
              </div>

              {/* Sub-dimension tabs */}
              <div style={{ display: 'flex', gap: '0.375rem', background: 'var(--color-surface-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-lg)' }}>
                <button
                  onClick={() => setActiveDimension('hourly')}
                  className={`btn btn-sm ${activeDimension === 'hourly' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  <Sun size={14} style={{ marginRight: '0.25rem' }} />
                  Theo Giờ (Khung giờ vàng)
                </button>
                <button
                  onClick={() => setActiveDimension('day_of_week')}
                  className={`btn btn-sm ${activeDimension === 'day_of_week' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  <Calendar size={14} style={{ marginRight: '0.25rem' }} />
                  Theo Thứ (T2 – CN)
                </button>
                <button
                  onClick={() => setActiveDimension('daily')}
                  className={`btn btn-sm ${activeDimension === 'daily' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  <Layers size={14} style={{ marginRight: '0.25rem' }} />
                  Tiến độ Theo Ngày
                </button>
              </div>
            </div>

            {/* TAB: THEO GIỜ (HOURLY VERTICAL COLUMN CHART) */}
            {activeDimension === 'hourly' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
                    Biểu đồ cột dọc theo từng khung giờ từ <strong>06:00 đến 23:00</strong> (Cột vàng cam hiển thị giờ cao điểm nhất):
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(180deg, #f59e0b, #d97706)' }} />
                      Giờ cao điểm
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(180deg, var(--color-coffee-400), var(--color-coffee-700))' }} />
                      Giờ hoạt động
                    </span>
                  </div>
                </div>

                {/* Vertical Column Chart */}
                <div
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '1.5rem 1rem 1rem 1rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div
                    style={{
                      height: '240px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      gap: '0.375rem',
                      overflowX: 'auto',
                      WebkitOverflowScrolling: 'touch',
                      borderBottom: '2px solid var(--color-border)',
                      paddingBottom: '0.25rem',
                    }}
                  >
                    {analytics.hourly.map((h) => {
                      const pct = Math.max(Math.round((h.revenue / maxHourlyRev) * 100), h.revenue > 0 ? 8 : 2)
                      const isPeak = h.revenue > 0 && h.revenue === maxHourlyRev

                      return (
                        <div
                          key={h.hour}
                          style={{
                            flex: '1 1 0',
                            minWidth: '38px',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            position: 'relative',
                          }}
                          title={`${h.label}: ${formatCurrency(h.revenue)} (${h.order_count} đơn)`}
                        >
                          {/* Value on top of bar */}
                          {h.revenue > 0 ? (
                            <div
                              style={{
                                marginBottom: '0.375rem',
                                fontSize: '0.675rem',
                                fontWeight: 800,
                                color: isPeak ? '#d97706' : 'var(--color-coffee-800)',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isPeak && <div style={{ fontSize: '0.65rem' }}>🔥</div>}
                              {formatShortCurrency(h.revenue)}
                            </div>
                          ) : (
                            <div style={{ height: '14px', marginBottom: '0.375rem' }} />
                          )}

                          {/* The Vertical Column Bar */}
                          <div
                            style={{
                              width: '70%',
                              maxWidth: '28px',
                              minWidth: '16px',
                              height: `${pct}%`,
                              borderRadius: '6px 6px 0 0',
                              background: isPeak
                                ? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
                                : h.revenue > 0
                                ? 'linear-gradient(180deg, var(--color-coffee-400) 0%, var(--color-coffee-700) 100%)'
                                : 'rgba(0,0,0,0.06)',
                              boxShadow: isPeak ? '0 4px 12px rgba(245, 158, 11, 0.4)' : 'none',
                              transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>

                  {/* X-Axis Hour Labels & Order Counts */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.375rem',
                      overflowX: 'auto',
                      paddingTop: '0.5rem',
                    }}
                  >
                    {analytics.hourly.map((h) => {
                      const isPeak = h.revenue > 0 && h.revenue === maxHourlyRev
                      return (
                        <div
                          key={h.hour}
                          style={{
                            flex: '1 1 0',
                            minWidth: '38px',
                            textAlign: 'center',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: isPeak ? 800 : 600,
                              color: isPeak ? '#d97706' : 'var(--color-text-primary)',
                            }}
                          >
                            {h.hour}h
                          </div>
                          <div style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                            {h.order_count > 0 ? `${h.order_count}đ` : '·'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Shift Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(254, 243, 199, 0.5)', border: '1px solid #fde68a', borderRadius: 'var(--radius-lg)', padding: '0.875rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400e' }}>🌅 Ca Sáng (06h – 10h)</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#78350f', margin: '0.25rem 0' }}>
                      {formatCurrency(shiftSummary.morning)}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#92400e' }}>{shiftSummary.mCount} đơn hàng</div>
                  </div>

                  <div style={{ background: 'rgba(254, 215, 170, 0.4)', border: '1px solid #fed7aa', borderRadius: 'var(--radius-lg)', padding: '0.875rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#9a3412' }}>☀️ Ca Trưa (11h – 13h)</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#7c2d12', margin: '0.25rem 0' }}>
                      {formatCurrency(shiftSummary.noon)}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#9a3412' }}>{shiftSummary.nCount} đơn hàng</div>
                  </div>

                  <div style={{ background: 'rgba(219, 234, 254, 0.5)', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-lg)', padding: '0.875rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e40af' }}>☕ Ca Chiều (14h – 17h)</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1d4ed8', margin: '0.25rem 0' }}>
                      {formatCurrency(shiftSummary.afternoon)}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#1e40af' }}>{shiftSummary.aCount} đơn hàng</div>
                  </div>

                  <div style={{ background: 'rgba(243, 232, 255, 0.5)', border: '1px solid #e9d5ff', borderRadius: 'var(--radius-lg)', padding: '0.875rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b21a8' }}>🌙 Ca Tối (18h – 23h)</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#581c87', margin: '0.25rem 0' }}>
                      {formatCurrency(shiftSummary.evening)}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#6b21a8' }}>{shiftSummary.eCount} đơn hàng</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: THEO THỨ TRONG TUẦN */}
            {activeDimension === 'day_of_week' && (
              <div>
                <div style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                  Tổng hợp doanh thu theo từng thứ trong tuần để phát hiện ngày bán chạy nhất:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.875rem' }}>
                  {analytics.day_of_week.map((d) => {
                    const isWeekend = d.day_index === 0 || d.day_index === 6
                    const isBusiest = d.revenue > 0 && d.revenue === maxDayOfWeekRev
                    const heightPct = Math.max(Math.round((d.revenue / maxDayOfWeekRev) * 100), 8)

                    return (
                      <div
                        key={d.day_index}
                        style={{
                          background: isWeekend ? 'rgba(244, 114, 182, 0.08)' : 'var(--color-surface)',
                          border: isBusiest
                            ? '2px solid #f59e0b'
                            : isWeekend
                            ? '1px solid #fbcfe8'
                            : '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '1rem 0.75rem',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          position: 'relative',
                        }}
                      >
                        {isBusiest && (
                          <div
                            style={{
                              position: 'absolute',
                              top: -10,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              background: '#f59e0b',
                              color: '#fff',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 10,
                            }}
                          >
                            ĐÔNG NHẤT
                          </div>
                        )}

                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isWeekend ? '#9d174d' : 'var(--color-text-primary)' }}>
                            {d.day_name}
                          </div>
                          <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                            {isWeekend ? 'Cuối tuần' : 'Ngày thường'}
                          </div>
                        </div>

                        {/* Bar visual */}
                        <div style={{ height: 90, margin: '1rem 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                          <div
                            style={{
                              width: 32,
                              height: `${heightPct}%`,
                              borderRadius: '6px 6px 0 0',
                              background: isBusiest
                                ? 'linear-gradient(180deg, #f59e0b, #d97706)'
                                : isWeekend
                                ? 'linear-gradient(180deg, #ec4899, #be185d)'
                                : 'linear-gradient(180deg, var(--color-coffee-400), var(--color-coffee-700))',
                              transition: 'height 0.4s ease',
                            }}
                          />
                        </div>

                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-coffee-900)' }}>
                            {formatCurrency(d.revenue)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                            {d.order_count} đơn ({d.share_percent}%)
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB: TIẾN ĐỘ THEO NGÀY */}
            {activeDimension === 'daily' && (
              <div>
                {analytics.daily_timeline.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                    Chưa có dữ liệu bán hàng trong khoảng ngày đã chọn.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Ngày</th>
                          <th>Loại ngày</th>
                          <th style={{ textAlign: 'center' }}>Số đơn</th>
                          <th style={{ textAlign: 'right' }}>Doanh thu</th>
                          <th style={{ textAlign: 'right' }}>Giá trị TB / đơn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.daily_timeline.map((item) => (
                          <tr key={item.date_str}>
                            <td style={{ fontWeight: 600 }}>{item.label}</td>
                            <td>
                              {item.is_weekend ? (
                                <span style={{ background: '#fce7f3', color: '#be185d', padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600 }}>
                                  🌴 Cuối tuần
                                </span>
                              ) : (
                                <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 500 }}>
                                  🏢 Ngày thường
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.order_count}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-coffee-600)' }}>
                              {formatCurrency(item.revenue)}
                            </td>
                            <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                              {item.order_count > 0 ? formatCurrency(Math.round(item.revenue / item.order_count)) : '0 đ'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── PRODUCT REVENUE RANKINGS: TOP CAO & TOP YẾU ─────────────── */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trophy size={20} color="var(--color-warning)" />
                  Xếp Hạng Doanh Thu Theo Món
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
                  Xem danh sách món mang lại doanh thu cao nhất và các món bán chậm / doanh thu yếu (kể cả 0 ly)
                </p>
              </div>

              {/* 2 Tabs: Top Cao vs Top Yếu */}
              <div style={{ display: 'flex', gap: '0.375rem', background: 'var(--color-surface-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-lg)' }}>
                <button
                  onClick={() => setActiveProductTab('top_high')}
                  className={`btn btn-sm ${activeProductTab === 'top_high' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  🔥 Top Doanh Thu Cao (Bán chạy)
                </button>
                <button
                  onClick={() => setActiveProductTab('top_low')}
                  className={`btn btn-sm ${activeProductTab === 'top_low' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    borderRadius: 'var(--radius-md)',
                    color: activeProductTab === 'top_low' ? undefined : '#b91c1c',
                  }}
                >
                  📉 Top Doanh Thu Yếu (Bán ít / 0 ly)
                </button>
              </div>
            </div>

            {/* Description note */}
            <div
              style={{
                fontSize: '0.8rem',
                padding: '0.5rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0,0,0,0.02)',
                borderLeft: '3px solid var(--color-coffee-500)',
                marginBottom: '1rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              {activeProductTab === 'top_high'
                ? '🔥 Các món chủ lực mang lại doanh số cao nhất cho quán trong khoảng thời gian đã chọn.'
                : '📉 Các món có lượt bán ít nhất hoặc chưa bán được ly nào (0 ly) trong thực đơn để quán cân nhắc đổi món hoặc kích cầu.'}
            </div>

            {/* Table */}
            {currentProductsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                Chưa có dữ liệu bán hàng cho danh mục này.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>#</th>
                      <th>Tên món</th>
                      <th>Danh mục</th>
                      <th style={{ textAlign: 'right' }}>Đơn giá</th>
                      <th style={{ textAlign: 'center' }}>Số lượng bán</th>
                      <th style={{ textAlign: 'right' }}>Doanh thu</th>
                      <th style={{ textAlign: 'center', width: 140 }}>Tỷ trọng doanh số</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentProductsList.map((p, idx) => {
                      const isTop3 = idx < 3 && activeProductTab === 'top_high'
                      const isZeroSales = p.quantity === 0

                      return (
                        <tr key={p.product_id || p.product_name} style={isZeroSales ? { opacity: 0.65 } : undefined}>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: isTop3
                                  ? idx === 0
                                    ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                                    : idx === 1
                                    ? 'linear-gradient(135deg, #94a3b8, #64748b)'
                                    : 'linear-gradient(135deg, #cd7f32, #a0522d)'
                                  : 'rgba(0,0,0,0.05)',
                                color: isTop3 ? '#fff' : 'var(--color-text-muted)',
                              }}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {p.product_name}
                            {isZeroSales && (
                              <span style={{ fontSize: '0.7rem', color: '#dc2626', marginLeft: '0.375rem', background: '#fee2e2', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
                                0 ly
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {p.category_name || 'Chưa phân loại'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>
                            {formatCurrency(p.unit_price)}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: isZeroSales ? '#dc2626' : 'var(--color-text-primary)' }}>
                            {p.quantity} ly
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-coffee-600)' }}>
                            {formatCurrency(p.revenue)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-coffee-800)', minWidth: '32px' }}>
                                {p.share_percent}%
                              </span>
                              <div style={{ width: 50, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${Math.min(p.share_percent, 100)}%`,
                                    background: activeProductTab === 'top_high' ? 'var(--color-coffee-500)' : '#ef4444',
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
