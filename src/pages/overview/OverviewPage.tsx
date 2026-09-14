import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { overviewService, type PeriodType, type OverviewPayload } from '@/services/overviewService'
import { ToastContainer, LoadingSpinner, Modal } from '@/components/ui'
import { formatCurrency, formatDateTime, calculateGoldenHourOutliers } from '@/utils/helpers'
import { exportReportToCsv, printReportHtml, printShiftClosingSlip } from '@/utils/exportReport'
import type { ExportReportRow, ReportPeriodType, ShiftClosingData, ProductReportRow } from '@/types'
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  DollarSign,
  Calendar,
  Clock,
  CreditCard,
  Wallet,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Minus,
  PieChart,
  Users,
  CheckCircle2,
  Download,
  Flame,
  CupSoda,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Scale,
} from 'lucide-react'

export default function OverviewPage() {
  const { profile } = useAuth()
  const { toasts, error: toastError, success: toastSuccess, removeToast } = useToast()

  // Main state
  const [period, setPeriod] = useState<PeriodType>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<OverviewPayload | null>(null)

  // Chart view mode: Revenue vs Orders
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue')
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)

  // Export Modal state
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [reportType, setReportType] = useState<ReportPeriodType>('daily')
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1)
  const [reportRows, setReportRows] = useState<ExportReportRow[]>([])
  const [productReportRows, setProductReportRows] = useState<ProductReportRow[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [loadingReport, setLoadingReport] = useState(false)

  // Shift closing modal state
  const [shiftModalOpen, setShiftModalOpen] = useState(false)

  // Load main dashboard data
  const loadOverview = useCallback(async () => {
    setLoading(true)
    try {
      const res = await overviewService.getOverviewData(
        period,
        period === 'custom' ? customFrom : undefined,
        period === 'custom' ? customTo : undefined
      )
      setData(res)
    } catch {
      toastError('Không thể tải số liệu tổng quan bán hàng')
    } finally {
      setLoading(false)
    }
  }, [period, customFrom, customTo, toastError])

  useEffect(() => {
    if (period !== 'custom' || (customFrom && customTo)) {
      loadOverview()
    }
  }, [period, loadOverview, customFrom, customTo])

  // Load report data for export modal
  const loadReportData = useCallback(async () => {
    setLoadingReport(true)
    try {
      if (reportType === 'product') {
        const pRows = await overviewService.getProductReportData({
          year: reportYear,
          month: reportMonth,
        })
        setProductReportRows(pRows)
      } else {
        const rows = await overviewService.getReportData(reportType, {
          year: reportYear,
          month: reportMonth,
        })
        setReportRows(rows)
      }
    } catch {
      toastError('Không thể tải dữ liệu báo cáo')
    } finally {
      setLoadingReport(false)
    }
  }, [reportType, reportYear, reportMonth, toastError])

  useEffect(() => {
    if (exportModalOpen) {
      loadReportData()
    }
  }, [exportModalOpen, loadReportData])

  // Handle Export CSV
  const handleExportCsv = () => {
    if (reportType === 'product') {
      if (productReportRows.length === 0) {
        toastError('Không có dữ liệu để xuất')
        return
      }
      const headers = [
        'STT',
        'Tên mặt hàng',
        'Nhóm hàng (Danh mục)',
        'Đơn giá (VNĐ)',
        'Số lượng đã bán',
        'Doanh thu (VNĐ)',
        'Tỷ trọng doanh thu (%)',
      ]
      const rows = productReportRows.map((r, i) => [
        i + 1,
        r.product_name,
        r.category_name,
        r.unit_price,
        r.quantity,
        r.total_revenue,
        `${r.percentage}%`,
      ])
      const totalQty = productReportRows.reduce((s, r) => s + r.quantity, 0)
      const totalRev = productReportRows.reduce((s, r) => s + r.total_revenue, 0)
      const summaryRow = ['TỔNG CỘNG', `${productReportRows.length} mặt hàng`, '-', '-', totalQty, totalRev, '100%']

      const filename = `Bao-cao-ban-hang-theo-mat-hang-Molliee-T${reportMonth}-${reportYear}`
      exportReportToCsv(
        filename,
        `BÁO CÁO BÁN HÀNG THEO MẶT HÀNG - THÁNG ${reportMonth}/${reportYear}`,
        `Đơn vị tính: Việt Nam Đồng (VNĐ)`,
        headers,
        rows,
        summaryRow
      )
      toastSuccess('Đã tải xuống file Excel báo cáo mặt hàng (.CSV UTF-8)')
      return
    }

    if (reportRows.length === 0) {
      toastError('Không có dữ liệu để xuất')
      return
    }
    const headers = [
      'Kỳ báo cáo',
      'Số hóa đơn',
      'Doanh thu trước giảm (VNĐ)',
      'Tiền giảm giá (VNĐ)',
      'Doanh thu thuần (VNĐ)',
      'Đơn giá TB (VNĐ)',
    ]

    const rows = reportRows.map((r) => [
      r.period_label,
      r.order_count,
      r.gross_revenue,
      r.discount,
      r.net_revenue,
      r.avg_order_value,
    ])

    const totalOrders = reportRows.reduce((s, r) => s + r.order_count, 0)
    const totalGross = reportRows.reduce((s, r) => s + r.gross_revenue, 0)
    const totalDisc = reportRows.reduce((s, r) => s + r.discount, 0)
    const totalNet = reportRows.reduce((s, r) => s + r.net_revenue, 0)
    const avgOrder = totalOrders > 0 ? Math.round(totalNet / totalOrders) : 0

    const summaryRow = [
      'TỔNG CỘNG',
      totalOrders,
      totalGross,
      totalDisc,
      totalNet,
      avgOrder,
    ]

    const typeLabels: Record<ReportPeriodType, string> = {
      daily: `Theo ngày (Tháng ${reportMonth}/${reportYear})`,
      monthly: `Theo tháng (Năm ${reportYear})`,
      quarterly: `Theo quý (Năm ${reportYear})`,
      yearly: `Theo năm`,
      product: `Theo mặt hàng`,
    }

    const filename = `Bao-cao-doanh-thu-Molliee-${reportType}-${reportYear}`
    exportReportToCsv(
      filename,
      `BÁO CÁO DOANH THU THUẦN - ${typeLabels[reportType].toUpperCase()}`,
      `Đơn vị tính: Việt Nam Đồng (VNĐ)`,
      headers,
      rows,
      summaryRow
    )
    toastSuccess('Đã tải xuống file Excel (.CSV UTF-8)')
  }

  // Handle Print Report
  const handlePrintReport = () => {
    if (reportType === 'product') {
      if (productReportRows.length === 0) return
      const headers = [
        'STT',
        'Tên mặt hàng',
        'Nhóm hàng',
        'Đơn giá',
        'Số lượng',
        'Doanh thu',
        'Tỷ trọng',
      ]
      const rows = productReportRows.map((r, i) => [
        i + 1,
        r.product_name,
        r.category_name,
        formatCurrency(r.unit_price),
        `${r.quantity} ly`,
        formatCurrency(r.total_revenue),
        `${r.percentage}%`,
      ])
      const totalQty = productReportRows.reduce((s, r) => s + r.quantity, 0)
      const totalRev = productReportRows.reduce((s, r) => s + r.total_revenue, 0)
      const summaryRow = ['TỔNG CỘNG', `${productReportRows.length} món`, '-', '-', `${totalQty} ly`, formatCurrency(totalRev), '100%']

      printReportHtml(
        `Báo cáo bán hàng theo mặt hàng - Tháng ${reportMonth}/${reportYear}`,
        `Hệ thống POS Molliee`,
        headers,
        rows,
        summaryRow
      )
      return
    }

    if (reportRows.length === 0) return

    const headers = [
      'Kỳ báo cáo',
      'Số hóa đơn',
      'Doanh thu trước giảm',
      'Giảm giá',
      'Doanh thu thuần',
      'Đơn giá TB',
    ]

    const rows = reportRows.map((r) => [
      r.period_label,
      r.order_count,
      formatCurrency(r.gross_revenue),
      formatCurrency(r.discount),
      formatCurrency(r.net_revenue),
      formatCurrency(r.avg_order_value),
    ])

    const totalOrders = reportRows.reduce((s, r) => s + r.order_count, 0)
    const totalGross = reportRows.reduce((s, r) => s + r.gross_revenue, 0)
    const totalDisc = reportRows.reduce((s, r) => s + r.discount, 0)
    const totalNet = reportRows.reduce((s, r) => s + r.net_revenue, 0)
    const avgOrder = totalOrders > 0 ? Math.round(totalNet / totalOrders) : 0

    const summaryRow = [
      'TỔNG CỘNG',
      totalOrders,
      formatCurrency(totalGross),
      formatCurrency(totalDisc),
      formatCurrency(totalNet),
      formatCurrency(avgOrder),
    ]

    const typeLabels: Record<ReportPeriodType, string> = {
      daily: `Báo cáo theo ngày - Tháng ${reportMonth}/${reportYear}`,
      monthly: `Báo cáo 12 tháng - Năm ${reportYear}`,
      quarterly: `Báo cáo 4 quý - Năm ${reportYear}`,
      yearly: `Báo cáo tổng hợp các năm`,
      product: `Báo cáo bán hàng theo mặt hàng`,
    }

    printReportHtml(
      typeLabels[reportType],
      `Hệ thống POS Molliee`,
      headers,
      rows,
      summaryRow
    )
  }

  // Handle Print Shift Closing Slip
  const handlePrintShift = () => {
    if (!data) return
    const top5 = (data.products || []).slice(0, 5).map((p) => ({
      name: p.product_name,
      qty: p.current_qty,
      revenue: p.current_revenue,
    }))

    const cancelledAmt = (data.cancelled || []).reduce((s, c) => s + c.total, 0)

    const closingData: ShiftClosingData = {
      closing_time: new Date().toLocaleString('vi-VN'),
      period_title: data.currentRange.label,
      cashier_name: profile?.name || 'Quản lý',
      net_revenue: data.summary.net_revenue,
      gross_revenue: data.summary.gross_revenue,
      discount_total: data.summary.discount_total,
      total_orders: data.summary.total_orders,
      cash_amount: data.payments.cash_amount,
      cash_orders: data.payments.cash_orders,
      bank_amount: data.payments.bank_amount,
      bank_orders: data.payments.bank_orders,
      cancelled_orders_count: data.cancelled.length,
      cancelled_orders_amount: cancelledAmt,
      top_items: top5,
    }

    printShiftClosingSlip(closingData)
    toastSuccess('Đã gửi lệnh in phiếu chốt sổ')
    setShiftModalOpen(false)
  }

  // Calculate max values for hourly chart
  const maxHourlyRevenue = data
    ? Math.max(...data.hourly.map((h) => h.revenue), 1)
    : 1
  const maxHourlyOrders = data
    ? Math.max(...data.hourly.map((h) => h.order_count), 1)
    : 1

  // Outlier detection for Golden Hours
  const goldenHourAnalysis = useMemo(() => {
    if (!data?.hourly || data.hourly.length === 0) return null
    return calculateGoldenHourOutliers(data.hourly)
  }, [data?.hourly])

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── Top Header ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Tổng quan bán hàng
          </h1>
        </div>

        {/* Quick action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShiftModalOpen(true)}
            title="Bàn giao ca hoặc chốt két cuối ngày"
          >
            <Printer size={16} color="var(--color-coffee-500)" />
            Chốt két / In phiếu ca
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setExportModalOpen(true)}
          >
            <FileSpreadsheet size={16} />
            Xuất báo cáo doanh thu
          </button>
        </div>
      </div>

      {/* ── Period Selector Filter Bar ────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        {/* Pills */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {[
            { key: 'today', label: 'Hôm nay' },
            { key: 'yesterday', label: 'Hôm qua' },
            { key: '7days', label: '7 ngày qua' },
            { key: 'this_month', label: 'Tháng này' },
            { key: 'this_year', label: 'Năm nay' },
            { key: 'custom', label: 'Tùy chọn...' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setPeriod(item.key as PeriodType)}
              className={`btn btn-sm ${
                period === item.key ? 'btn-primary' : 'btn-secondary'
              }`}
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Custom date range picker if custom selected */}
        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="date"
              className="input btn-sm"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{ width: '140px', padding: '0.25rem 0.5rem' }}
            />
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>đến</span>
            <input
              type="date"
              className="input btn-sm"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{ width: '140px', padding: '0.25rem 0.5rem' }}
            />
            <button className="btn btn-primary btn-sm" onClick={loadOverview}>
              Lọc
            </button>
          </div>
        )}

        {/* Current range info badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
          <Calendar size={15} color="var(--color-coffee-500)" />
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Kỳ xem: <strong style={{ color: 'var(--color-text-primary)' }}>{data?.currentRange.label || '...'}</strong>
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <LoadingSpinner size={36} />
        </div>
      ) : data ? (
        <div>
          {/* ── KPI Row: 5 Cards ───────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
            className="stagger-children"
          >
            {/* Card 1: Doanh thu thuần */}
            <div
              className="stat-card"
              style={{
                borderLeft: '4px solid var(--color-coffee-500)',
                background: 'linear-gradient(180deg, #ffffff 0%, #fdfaf6 100%)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="stat-label" style={{ fontWeight: 600, color: 'var(--color-coffee-700)' }}>
                  DOANH THU THUẦN
                </span>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--color-coffee-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DollarSign size={18} color="var(--color-coffee-600)" />
                </div>
              </div>
              <div className="stat-value" style={{ fontSize: '1.875rem' }}>
                {formatCurrency(data.summary.net_revenue)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                {data.summary.revenue_growth_pct >= 0 ? (
                  <span style={{ color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', fontWeight: 600 }}>
                    <TrendingUp size={14} style={{ marginRight: 2 }} />
                    +{data.summary.revenue_growth_pct}%
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-danger)', display: 'inline-flex', alignItems: 'center', fontWeight: 600 }}>
                    <TrendingDown size={14} style={{ marginRight: 2 }} />
                    {data.summary.revenue_growth_pct}%
                  </span>
                )}
                <span style={{ color: 'var(--color-text-muted)' }}>so với kỳ trước</span>
              </div>
            </div>

            {/* Card 2: Số hóa đơn */}
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="stat-label">SỐ HÓA ĐƠN</span>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Receipt size={18} color="#059669" />
                </div>
              </div>
              <div className="stat-value" style={{ color: '#0f172a' }}>
                {data.summary.total_orders}{' '}
                <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>đơn</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                {data.summary.orders_growth_pct >= 0 ? (
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                    +{data.summary.orders_growth_pct}%
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                    {data.summary.orders_growth_pct}%
                  </span>
                )}
                <span style={{ color: 'var(--color-text-muted)' }}>đơn hoàn tất</span>
              </div>
            </div>

            {/* Card 3: Giá trị TB đơn */}
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="stat-label">GIÁ TRỊ TB / ĐƠN</span>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CreditCard size={18} color="#2563eb" />
                </div>
              </div>
              <div className="stat-value" style={{ color: '#0f172a' }}>
                {formatCurrency(data.summary.avg_order_value)}
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Doanh thu / hóa đơn
              </div>
            </div>

            {/* Card 4: Giảm giá & Khuyến mãi */}
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="stat-label">TỔNG GIẢM GIÁ</span>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={18} color="#d97706" />
                </div>
              </div>
              <div className="stat-value" style={{ color: '#d97706' }}>
                {formatCurrency(data.summary.discount_total)}
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Tiền trước giảm: {formatCurrency(data.summary.gross_revenue)}
              </div>
            </div>

            {/* Card 5: Khung giờ vàng (Outlier) hoặc Đều khách */}
            {goldenHourAnalysis?.isEvenDistribution ? (
              <div
                className="stat-card"
                style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                  borderColor: '#bbf7d0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="stat-label" style={{ color: '#166534', fontWeight: 600 }}>
                    LƯỢNG KHÁCH
                  </span>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#dcfce7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Scale size={18} color="#16a34a" />
                  </div>
                </div>
                <div className="stat-value" style={{ color: '#15803d', fontSize: '1.4rem' }}>
                  Đều khách
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#15803d', fontWeight: 500 }}>
                  Doanh thu phân bổ đều các giờ
                </div>
              </div>
            ) : (
              <div
                className="stat-card"
                style={{
                  background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)',
                  borderColor: '#fde68a',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="stat-label" style={{ color: '#92400e', fontWeight: 600 }}>
                    KHUNG GIỜ VÀNG
                  </span>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Flame size={18} color="#ea580c" />
                  </div>
                </div>
                <div className="stat-value" style={{ color: '#ea580c', fontSize: '1.4rem' }}>
                  {goldenHourAnalysis?.goldenHours[0]
                    ? `${String(goldenHourAnalysis.goldenHours[0].hour).padStart(2, '0')}:00 - ${String(
                        goldenHourAnalysis.goldenHours[0].hour + 1
                      ).padStart(2, '0')}:00`
                    : data.summary.peak_hour !== null
                    ? `${String(data.summary.peak_hour).padStart(2, '0')}:00 - ${String(
                        data.summary.peak_hour + 1
                      ).padStart(2, '0')}:00`
                    : '--:--'}
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#b45309', fontWeight: 500 }}>
                  {goldenHourAnalysis?.goldenHours[0]
                    ? `Doanh thu đỉnh: ${formatCurrency(goldenHourAnalysis.goldenHours[0].revenue)} (x${goldenHourAnalysis.goldenHours[0].ratioVsMean} TB)`
                    : `Doanh thu đỉnh: ${formatCurrency(data.summary.peak_hour_revenue)}`}
                </div>
              </div>
            )}
          </div>

          {/* ── Cash Flow Bar (Dòng tiền két vs Chuyển khoản) ────── */}
          <div
            className="glass-card"
            style={{
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              background: '#ffffff',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wallet size={18} color="var(--color-coffee-600)" />
                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                  Đối soát dòng tiền thanh toán
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  (Kiểm kê két tiền mặt & ngân hàng)
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>💵 Tiền mặt két: </span>
                  <strong style={{ color: '#16a34a' }}>
                    {formatCurrency(data.payments.cash_amount)}
                  </strong>{' '}
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    ({data.payments.cash_orders} đơn)
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>💳 Chuyển khoản/QR: </span>
                  <strong style={{ color: '#2563eb' }}>
                    {formatCurrency(data.payments.bank_amount)}
                  </strong>{' '}
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    ({data.payments.bank_orders} đơn)
                  </span>
                </div>
              </div>
            </div>

            {/* Split Progress Bar */}
            {data.summary.net_revenue > 0 ? (
              <div
                style={{
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: '#e2e8f0',
                  overflow: 'hidden',
                  display: 'flex',
                }}
              >
                <div
                  style={{
                    width: `${(data.payments.cash_amount / data.summary.net_revenue) * 100}%`,
                    backgroundColor: '#16a34a',
                    transition: 'width 0.4s ease',
                  }}
                  title={`Tiền mặt: ${formatCurrency(data.payments.cash_amount)}`}
                />
                <div
                  style={{
                    width: `${(data.payments.bank_amount / data.summary.net_revenue) * 100}%`,
                    backgroundColor: '#2563eb',
                    transition: 'width 0.4s ease',
                  }}
                  title={`Chuyển khoản: ${formatCurrency(data.payments.bank_amount)}`}
                />
              </div>
            ) : (
              <div style={{ height: 10, borderRadius: 999, backgroundColor: '#f1f5f9' }} />
            )}
          </div>

          {/* ── Main Charts Grid: Hourly Breakdown + Category Share ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            {/* Chart 1: Mức độ doanh thu theo giờ (0h - 23h) */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={18} color="var(--color-coffee-500)" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                    Mức độ doanh thu theo giờ (0h - 23h)
                  </h3>
                </div>

                {/* Metric switch */}
                <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--color-surface)', padding: '2px', borderRadius: 'var(--radius-md)' }}>
                  <button
                    className={`btn btn-sm ${chartMetric === 'revenue' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto' }}
                    onClick={() => setChartMetric('revenue')}
                  >
                    Doanh thu
                  </button>
                  <button
                    className={`btn btn-sm ${chartMetric === 'orders' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto' }}
                    onClick={() => setChartMetric('orders')}
                  >
                    Số đơn
                  </button>
                </div>
              </div>

              {/* Hover detail tooltip bar */}
              <div
                style={{
                  height: 28,
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                }}
              >
                {hoveredHour !== null ? (
                  <>
                    <strong style={{ color: 'var(--color-coffee-600)' }}>
                      Khung {String(hoveredHour).padStart(2, '0')}:00 - {String(hoveredHour + 1).padStart(2, '0')}:00:
                    </strong>
                    <span>Doanh thu: <strong>{formatCurrency(data.hourly[hoveredHour].revenue)}</strong></span>
                    <span>&bull;</span>
                    <span>Đơn hàng: <strong>{data.hourly[hoveredHour].order_count} đơn</strong></span>
                    {hoveredHour === data.summary.peak_hour && (
                      <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
                        🔥 Giờ cao điểm
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    Rê chuột vào các cột để xem chi tiết từng khung giờ
                  </span>
                )}
              </div>

              {/* SVG / CSS Bar Chart */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '3px',
                  height: 220,
                  paddingBottom: '1.5rem',
                  position: 'relative',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                {data.hourly.map((h) => {
                  const val = chartMetric === 'revenue' ? h.revenue : h.order_count
                  const max = chartMetric === 'revenue' ? maxHourlyRevenue : maxHourlyOrders
                  const pct = Math.max(0, (val / max) * 100)
                  const isPeak = (goldenHourAnalysis ? goldenHourAnalysis.goldenHourSet.has(h.hour) : h.hour === data.summary.peak_hour) && h.revenue > 0
                  const isHovered = hoveredHour === h.hour

                  return (
                    <div
                      key={h.hour}
                      onMouseEnter={() => setHoveredHour(h.hour)}
                      onMouseLeave={() => setHoveredHour(null)}
                      style={{
                        flex: 1,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        position: 'relative',
                        cursor: 'pointer',
                      }}
                    >
                      {/* Bar */}
                      <div
                        style={{
                          width: '80%',
                          minHeight: val > 0 ? 6 : 2,
                          height: `${Math.max(pct, 2)}%`,
                          borderRadius: '3px 3px 0 0',
                          background: isPeak
                            ? 'linear-gradient(180deg, #f59e0b, #b45309)'
                            : isHovered
                            ? 'var(--color-coffee-400)'
                            : val > 0
                            ? 'linear-gradient(180deg, #94a3b8, #64748b)'
                            : '#e2e8f0',
                          transition: 'all 0.2s ease',
                          transform: isHovered ? 'scaleY(1.04)' : 'none',
                          boxShadow: isPeak ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'none',
                        }}
                      />

                      {/* Hour label below */}
                      <span
                        style={{
                          position: 'absolute',
                          bottom: -22,
                          fontSize: '0.625rem',
                          color: isPeak
                            ? 'var(--color-coffee-600)'
                            : isHovered
                            ? 'var(--color-text-primary)'
                            : 'var(--color-text-muted)',
                          fontWeight: isPeak || isHovered ? 700 : 400,
                        }}
                      >
                        {h.hour % 3 === 0 || isPeak ? `${h.hour}h` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Chart Legend */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(180deg, #f59e0b, #b45309)' }} />
                  <span>Khung giờ cao điểm nhất</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#64748b' }} />
                  <span>Các khung giờ hoạt động</span>
                </div>
              </div>
            </div>

            {/* Chart 2: Cơ cấu doanh thu theo Nhóm hàng */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <PieChart size={18} color="var(--color-coffee-500)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                  Cơ cấu doanh thu theo Nhóm đồ uống
                </h3>
              </div>

              {data.categories.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  Chưa có dữ liệu bán hàng trong kỳ này
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {data.categories.map((cat, idx) => {
                    const colors = ['#b45309', '#059669', '#2563eb', '#7c3aed', '#db2777', '#ca8a04', '#475569']
                    const color = colors[idx % colors.length]

                    return (
                      <div key={cat.category_name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', fontSize: '0.8125rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {cat.category_name}
                          </span>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>{cat.total_quantity} ly</span>
                            <span style={{ fontWeight: 700, color }}>{formatCurrency(cat.total_revenue)}</span>
                            <span className="badge" style={{ backgroundColor: `${color}15`, color, minWidth: 40, textAlign: 'center' }}>
                              {cat.percentage}%
                            </span>
                          </div>
                        </div>

                        <div style={{ height: 7, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${cat.percentage}%`,
                              height: '100%',
                              backgroundColor: color,
                              borderRadius: 999,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Top Sản Phẩm Bán Chạy & So Sánh Với Ngày Hôm Qua ── */}
          <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CupSoda size={18} color="var(--color-coffee-600)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                  Top sản phẩm bán chạy & So sánh với ngày hôm qua
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Tự động đối chiếu số lượng bán giữa 2 kỳ
              </span>
            </div>

            {data.products.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Chưa có dữ liệu món bán ra trong kỳ này
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 48, textAlign: 'center' }}>Hạng</th>
                      <th>Tên món</th>
                      <th style={{ textAlign: 'right' }}>SL bán (Kỳ này)</th>
                      <th style={{ textAlign: 'right' }}>SL bán (Hôm qua)</th>
                      <th style={{ textAlign: 'center' }}>Biến động vs Hôm qua</th>
                      <th style={{ textAlign: 'right' }}>Doanh thu món</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.slice(0, 10).map((prod, index) => (
                      <tr key={prod.product_name}>
                        <td style={{ textAlign: 'center' }}>
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
                              background:
                                index === 0
                                  ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                                  : index === 1
                                  ? 'linear-gradient(135deg, #94a3b8, #64748b)'
                                  : index === 2
                                  ? 'linear-gradient(135deg, #cd7f32, #a0522d)'
                                  : 'var(--color-surface)',
                              color: index < 3 ? 'white' : 'var(--color-text-muted)',
                              border: index >= 3 ? '1px solid var(--color-border)' : 'none',
                            }}
                          >
                            {index + 1}
                          </span>
                        </td>

                        <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {prod.product_name}
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {prod.current_qty} ly
                        </td>

                        <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                          {prod.prev_qty} ly
                        </td>

                        {/* So sánh với hôm qua badge */}
                        <td style={{ textAlign: 'center' }}>
                          {prod.trend === 'up' && (
                            <span className="badge badge-success" style={{ gap: 2 }}>
                              <ArrowUp size={12} />
                              +{prod.diff_qty} (+{prod.pct_change}%)
                            </span>
                          )}
                          {prod.trend === 'down' && (
                            <span className="badge badge-danger" style={{ gap: 2 }}>
                              <ArrowDown size={12} />
                              {prod.diff_qty} ({prod.pct_change}%)
                            </span>
                          )}
                          {prod.trend === 'same' && (
                            <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', gap: 2 }}>
                              <Minus size={12} />
                              Ngang bằng
                            </span>
                          )}
                          {prod.trend === 'new' && (
                            <span className="badge badge-info" style={{ gap: 2 }}>
                              <Sparkles size={12} />
                              Món mới (+{prod.current_qty})
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-coffee-500)' }}>
                          {formatCurrency(prod.current_revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Cashier Performance & Cancelled Orders Audit ──────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Cashier Performance */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Users size={18} color="var(--color-coffee-500)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                  Hiệu suất Thu ngân / Nhân viên trực ca
                </h3>
              </div>

              {data.cashiers.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  Chưa có dữ liệu nhân viên trong kỳ
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nhân viên</th>
                      <th style={{ textAlign: 'right' }}>Số hóa đơn</th>
                      <th style={{ textAlign: 'right' }}>Doanh thu mang lại</th>
                      <th style={{ textAlign: 'right' }}>Đơn TB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cashiers.map((c) => (
                      <tr key={c.cashier_id}>
                        <td style={{ fontWeight: 600 }}>{c.cashier_name}</td>
                        <td style={{ textAlign: 'right' }}>{c.total_orders} đơn</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-coffee-500)', fontWeight: 600 }}>
                          {formatCurrency(c.total_revenue)}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                          {formatCurrency(c.avg_order_value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Cancelled Orders Audit (Phát hiện thất thoát) */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} color={data.cancelled.length > 0 ? '#dc2626' : '#16a34a'} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                    Giám sát hóa đơn hủy & Thất thoát
                  </h3>
                </div>
                {data.cancelled.length > 0 && (
                  <span className="badge badge-danger">
                    {data.cancelled.length} đơn bị hủy
                  </span>
                )}
              </div>

              {data.cancelled.length === 0 ? (
                <div
                  style={{
                    padding: '2.5rem 1rem',
                    textAlign: 'center',
                    background: '#f0fdf4',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 0.5rem auto' }} />
                  <div style={{ fontWeight: 600, color: '#15803d' }}>
                    Tuyệt vời! Không có hóa đơn nào bị hủy
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#16a34a', marginTop: 2 }}>
                    Tất cả các order trong kỳ đều thanh toán đầy đủ, không ghi nhận thất thoát.
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Mã đơn</th>
                        <th>Bàn</th>
                        <th style={{ textAlign: 'right' }}>Số tiền</th>
                        <th>Lý do hủy</th>
                        <th>Thời gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cancelled.map((c) => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600, color: 'var(--color-danger)' }}>
                            {c.invoice_number}
                          </td>
                          <td>{c.table_name}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrency(c.total)}
                          </td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                            {c.cancel_reason}
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {c.cancelled_at ? formatDateTime(c.cancelled_at) : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Modal: Xuất Báo Cáo Doanh Thu (Ngày, Tháng, Quý, Năm) ── */}
      <Modal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Xuất báo cáo doanh thu kinh doanh"
        wide
      >
        <div>
          {/* Report Type Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            {[
              { type: 'daily', label: 'Theo ngày' },
              { type: 'monthly', label: 'Theo tháng' },
              { type: 'quarterly', label: 'Theo quý' },
              { type: 'yearly', label: 'Theo năm' },
              { type: 'product', label: 'Theo mặt hàng' },
            ].map((t) => (
              <button
                key={t.type}
                onClick={() => setReportType(t.type as ReportPeriodType)}
                className={`btn btn-sm ${
                  reportType === t.type ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Time pickers for Report */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              marginBottom: '1rem',
              background: 'var(--color-surface)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {(reportType === 'daily' || reportType === 'product') && (
              <div style={{ minWidth: 120 }}>
                <label className="input-label">Tháng</label>
                <select
                  className="select"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(Number(e.target.value))}
                >
                  {reportType === 'product' && <option value={0}>Cả năm</option>}
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ minWidth: 110 }}>
              <label className="input-label">Năm</label>
              <select
                className="select"
                value={reportYear}
                onChange={(e) => setReportYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>Năm {y}</option>
                ))}
              </select>
            </div>

            {reportType === 'product' && (
              <div style={{ flex: '1 1 200px' }}>
                <label className="input-label">Tìm theo tên món / nhóm</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ví dụ: Trà sữa trân châu, Trà đào, Matcha..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  style={{ padding: '0.45rem 0.75rem' }}
                />
              </div>
            )}

            <button className="btn btn-primary" onClick={loadReportData} disabled={loadingReport}>
              {loadingReport ? 'Đang tải...' : 'Xem số liệu'}
            </button>
          </div>

          {/* Table Preview */}
          <div
            style={{
              maxHeight: '360px',
              overflowY: 'auto',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
            }}
          >
            {loadingReport ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <LoadingSpinner size={28} />
              </div>
            ) : reportType === 'product' ? (
              /* Bảng Báo Cáo Theo Mặt Hàng */
              (() => {
                const filtered = productReportRows.filter(
                  (p) =>
                    !productSearch ||
                    p.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
                    p.category_name.toLowerCase().includes(productSearch.toLowerCase())
                )

                if (filtered.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      Không tìm thấy mặt hàng nào trong kỳ đã chọn
                    </div>
                  )
                }

                const totalQty = filtered.reduce((s, r) => s + r.quantity, 0)
                const totalRev = filtered.reduce((s, r) => s + r.total_revenue, 0)

                return (
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 44, textAlign: 'center' }}>STT</th>
                        <th>Tên mặt hàng</th>
                        <th>Nhóm hàng</th>
                        <th style={{ textAlign: 'right' }}>Đơn giá</th>
                        <th style={{ textAlign: 'right' }}>Số lượng đã bán</th>
                        <th style={{ textAlign: 'right' }}>Doanh thu</th>
                        <th style={{ textAlign: 'right' }}>Tỷ trọng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item, idx) => (
                        <tr key={item.product_name}>
                          <td style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                            {idx + 1}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {item.product_name}
                          </td>
                          <td>
                            <span className="badge" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                              {item.category_name}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {item.quantity} ly
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-coffee-600)' }}>
                            {formatCurrency(item.total_revenue)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="badge badge-coffee" style={{ minWidth: 42, textAlign: 'center' }}>
                              {item.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {/* Summary Row */}
                      <tr style={{ fontWeight: 700, background: '#fef3c7', color: 'var(--color-coffee-700)' }}>
                        <td colSpan={2} style={{ textAlign: 'left' }}>
                          TỔNG CỘNG: {filtered.length} MẶT HÀNG
                        </td>
                        <td>-</td>
                        <td style={{ textAlign: 'right' }}>-</td>
                        <td style={{ textAlign: 'right' }}>{totalQty} ly</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-coffee-700)' }}>
                          {formatCurrency(totalRev)}
                        </td>
                        <td style={{ textAlign: 'right' }}>100%</td>
                      </tr>
                    </tbody>
                  </table>
                )
              })()
            ) : reportRows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                Không có dữ liệu trong khoảng thời gian này
              </div>
            ) : (
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Kỳ báo cáo</th>
                    <th style={{ textAlign: 'right' }}>Số đơn</th>
                    <th style={{ textAlign: 'right' }}>Tiền trước giảm</th>
                    <th style={{ textAlign: 'right' }}>Giảm giá</th>
                    <th style={{ textAlign: 'right' }}>Doanh thu thuần</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá TB</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row) => (
                    <tr key={row.period_label}>
                      <td style={{ fontWeight: 500 }}>{row.period_label}</td>
                      <td style={{ textAlign: 'right' }}>{row.order_count}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.gross_revenue)}</td>
                      <td style={{ textAlign: 'right', color: '#b45309' }}>
                        {row.discount > 0 ? `-${formatCurrency(row.discount)}` : '0 đ'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-coffee-600)' }}>
                        {formatCurrency(row.net_revenue)}
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.avg_order_value)}</td>
                    </tr>
                  ))}
                  {/* Summary row */}
                  <tr style={{ fontWeight: 700, background: '#fef3c7', color: 'var(--color-coffee-700)' }}>
                    <td>TỔNG CỘNG</td>
                    <td style={{ textAlign: 'right' }}>{reportRows.reduce((s, r) => s + r.order_count, 0)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(reportRows.reduce((s, r) => s + r.gross_revenue, 0))}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(reportRows.reduce((s, r) => s + r.discount, 0))}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-coffee-700)' }}>
                      {formatCurrency(reportRows.reduce((s, r) => s + r.net_revenue, 0))}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatCurrency(
                        reportRows.reduce((s, r) => s + r.order_count, 0) > 0
                          ? Math.round(
                              reportRows.reduce((s, r) => s + r.net_revenue, 0) /
                                reportRows.reduce((s, r) => s + r.order_count, 0)
                            )
                          : 0
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Export Actions Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setExportModalOpen(false)}>
              Đóng
            </button>
            <button className="btn btn-secondary" onClick={handlePrintReport} disabled={reportRows.length === 0}>
              <Printer size={16} />
              In / Xuất PDF
            </button>
            <button className="btn btn-primary" onClick={handleExportCsv} disabled={reportRows.length === 0}>
              <Download size={16} />
              Tải Excel (.CSV UTF-8)
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Xác nhận In Phiếu Chốt Ca / Chốt Két ───────── */}
      <Modal
        open={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        title="Chốt két & Bàn giao ca làm việc"
      >
        {data && (
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Bạn đang thực hiện tổng kết doanh thu cho kỳ <strong>{data.currentRange.label}</strong> để kiểm đếm két và bàn giao.
            </p>

            <div
              style={{
                background: 'var(--color-surface)',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Doanh thu thuần:</span>
                <strong style={{ color: 'var(--color-coffee-600)', fontSize: '1rem' }}>
                  {formatCurrency(data.summary.net_revenue)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tiền mặt thực tế trong két:</span>
                <strong style={{ color: '#16a34a' }}>
                  {formatCurrency(data.payments.cash_amount)} ({data.payments.cash_orders} đơn)
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tiền chuyển khoản / QR:</span>
                <strong style={{ color: '#2563eb' }}>
                  {formatCurrency(data.payments.bank_amount)} ({data.payments.bank_orders} đơn)
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Số hóa đơn hoàn tất:</span>
                <strong>{data.summary.total_orders} đơn</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Số hóa đơn bị hủy:</span>
                <strong style={{ color: data.cancelled.length > 0 ? '#dc2626' : '#64748b' }}>
                  {data.cancelled.length} đơn
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShiftModalOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handlePrintShift}>
                <Printer size={16} />
                In phiếu chốt ca (Khổ 80mm)
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
