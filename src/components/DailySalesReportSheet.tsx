import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Calendar,
  Printer,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  RotateCw,
  Plus,
  Minus,
  ChevronDown,
  Coins,
  CreditCard,
  X,
  CupSoda,
} from 'lucide-react'
import { reportService } from '@/services/reportService'
import { formatCurrency } from '@/utils/helpers'
import { exportReportToCsv } from '@/utils/exportReport'
import { LoadingSpinner } from '@/components/ui'

interface DailySalesReportSheetProps {
  initialDate?: string
  isModal?: boolean
  onClose?: () => void
}

export default function DailySalesReportSheet({
  initialDate,
  isModal = false,
  onClose,
}: DailySalesReportSheetProps) {
  // Format today as YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const [dateStr, setDateStr] = useState(initialDate || getTodayStr())
  const [cashierFilter, setCashierFilter] = useState('ALL')
  const [paperSize, setPaperSize] = useState<'A4' | 'K80'>('A4')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [expandedHours, setExpandedHours] = useState<Record<string, boolean>>({})
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({})

  // Format date display dd/mm/yyyy
  const formattedDate = useMemo(() => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
    return dateStr
  }, [dateStr])

  // Load report data
  const loadReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await reportService.getDailySalesSheet(dateStr, cashierFilter)
      setData(res)
      // Auto expand all hour groups by default for immediate full visibility
      const exp: Record<string, boolean> = {}
      res.hour_groups.forEach((g: any) => {
        exp[g.hour_str] = true
      })
      setExpandedHours(exp)
    } catch (err) {
      console.error('Failed to load daily report', err)
    } finally {
      setLoading(false)
    }
  }, [dateStr, cashierFilter])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  // Toggle hour expansion
  const toggleHour = (hour: string) => {
    setExpandedHours((prev) => ({ ...prev, [hour]: !prev[hour] }))
  }

  // Toggle expand all
  const toggleAllHours = () => {
    if (!data) return
    const allExpanded = data.hour_groups.every((g: any) => expandedHours[g.hour_str])
    const newExp: Record<string, boolean> = {}
    data.hour_groups.forEach((g: any) => {
      newExp[g.hour_str] = !allExpanded
    })
    setExpandedHours(newExp)
  }

  // Print function
  const handlePrint = () => {
    window.print()
  }

  // Export CSV
  const handleExportCsv = () => {
    if (!data) return
    const headers = [
      'Mã chứng từ',
      'Thời gian',
      'Phòng/Bàn',
      'SLSP',
      'Doanh thu',
      'Thu khác',
      'Thuế',
      'Phí trả hàng',
      'Thanh toán',
      'Hình thức',
      'Thu ngân',
    ]

    const rows: (string | number)[][] = []
    data.all_orders.forEach((o: any) => {
      const d = new Date(o.paid_at)
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      rows.push([
        o.invoice_number,
        timeStr,
        o.table_name,
        o.item_count,
        o.total,
        0,
        0,
        0,
        o.total,
        o.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản',
        o.cashier_name,
      ])
    })

    const summaryRow = [
      `Hóa đơn: ${data.total_orders}`,
      '',
      '',
      data.total_items,
      data.total_revenue,
      0,
      0,
      0,
      data.total_payment,
      '',
      '',
    ]

    exportReportToCsv(
      `BaoCaoCuoiNgay_${dateStr}`,
      'BÁO CÁO CUỐI NGÀY VỀ BÁN HÀNG',
      `Ngày bán: ${formattedDate} - Chi nhánh: Molliee Milk Tea`,
      headers,
      rows,
      summaryRow
    )
  }

  return (
    <div
      className={`report-sheet-wrapper ${
        isFullscreen ? 'report-sheet-fullscreen' : ''
      }`}
      style={{
        width: '100%',
        maxWidth: isFullscreen ? '100vw' : '100%',
        margin: '0 auto',
        padding: isFullscreen ? '1.5rem 2rem' : '0',
        boxSizing: 'border-box',
      }}
    >
      {/* ── TOOLBAR (Standard POS report toolbar as in the photo) ── */}
      <div
        className="no-print"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Left tools: Date, Paper, Cashier */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          {/* Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Calendar size={16} color="var(--color-coffee-500)" />
            <input
              type="date"
              className="input input-sm"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              style={{ width: '135px', fontWeight: 600 }}
            />
          </div>

          {/* Quick Date Buttons */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              className={`btn btn-sm ${dateStr === getTodayStr() ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDateStr(getTodayStr())}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            >
              Hôm nay
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const d = new Date()
                d.setDate(d.getDate() - 1)
                const y = d.getFullYear()
                const m = String(d.getMonth() + 1).padStart(2, '0')
                const day = String(d.getDate()).padStart(2, '0')
                setDateStr(`${y}-${m}-${day}`)
              }}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            >
              Hôm qua
            </button>
          </div>

          {/* Paper Size Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <select
              className="select"
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as 'A4' | 'K80')}
              style={{ width: '110px', height: '32px', padding: '0.25rem 1.75rem 0.25rem 0.5rem', fontSize: '0.8rem' }}
            >
              <option value="A4">Khổ A4</option>
              <option value="K80">Khổ 80mm</option>
            </select>
          </div>

          {/* Cashier Filter */}
          {data?.cashiers && data.cashiers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <select
                className="select"
                value={cashierFilter}
                onChange={(e) => setCashierFilter(e.target.value)}
                style={{ minWidth: '140px', height: '32px', padding: '0.25rem 1.75rem 0.25rem 0.5rem', fontSize: '0.8rem' }}
              >
                <option value="ALL">Tất cả người tạo</option>
                {data.cashiers.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right action icons (Undo, Redo, Refresh, Expand, Print, Excel, Fullscreen) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {/* Refresh */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={loadReport}
            title="Làm mới dữ liệu"
            style={{ padding: '0.4rem' }}
          >
            <RotateCw size={16} />
          </button>

          {/* Expand/Collapse All */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={toggleAllHours}
            title="Mở rộng / Thu gọn các khung giờ"
            style={{ fontSize: '0.75rem', gap: '0.25rem' }}
          >
            <ChevronDown size={14} />
            Mở/Đóng giờ
          </button>

          {/* Export Excel */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportCsv}
            title="Xuất file Excel (.csv UTF-8)"
            style={{ fontSize: '0.75rem', gap: '0.35rem', color: '#15803d' }}
          >
            <FileSpreadsheet size={15} />
            Xuất Excel
          </button>

          {/* Print A4 */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handlePrint}
            title="In báo cáo A4"
            style={{ fontSize: '0.75rem', gap: '0.35rem' }}
          >
            <Printer size={15} />
            In báo cáo
          </button>

          {/* Fullscreen / Fit Width Toggle (Directly solves "phóng to ra để không cần kéo thanh trượt") */}
          <button
            className={`btn btn-sm ${isFullscreen ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Phóng to toàn màn hình (vừa khít không cần cuộn ngang)'}
            style={{ fontSize: '0.75rem', gap: '0.35rem' }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            {isFullscreen ? 'Thu nhỏ' : 'Phóng to'}
          </button>

          {/* Close button if in modal */}
          {isModal && onClose && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              title="Đóng báo cáo"
              style={{ padding: '0.4rem', marginLeft: '0.25rem' }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ── THE PRINTABLE A4 REPORT SHEET (Styled identically to the uploaded photo) ── */}
      <div
        className="report-sheet-printable"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: isFullscreen ? '0' : 'var(--radius-xl)',
          padding: '2rem',
          boxShadow: isFullscreen ? 'none' : '0 10px 25px rgba(0, 0, 0, 0.05)',
          minHeight: '600px',
          width: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden', // Ensures NO horizontal scrollbar!
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', gap: '1rem' }}>
            <LoadingSpinner size={36} />
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Đang tổng hợp số liệu bán hàng...</span>
          </div>
        ) : !data || data.total_orders === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#faf5ff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <CupSoda size={32} color="var(--color-coffee-500)" />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--color-text-primary)' }}>
              Không có đơn hàng nào trong ngày {formattedDate}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', maxWidth: 400, margin: '0 auto' }}>
              Vui lòng chọn ngày khác trên thanh công cụ hoặc bấm "Làm mới" để tải lại dữ liệu mới nhất.
            </p>
          </div>
        ) : (
          <div>
            {/* Header: Date of generation, Title, Subtitles */}
            <div style={{ position: 'relative', marginBottom: '1.75rem', textAlign: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                Ngày lập: <strong>{data.report_generated_at}</strong>
              </div>

              <div style={{ paddingTop: '0.5rem' }}>
                <h1
                  style={{
                    fontSize: '1.625rem',
                    fontWeight: 800,
                    margin: '0 0 0.35rem',
                    color: '#0f172a',
                    letterSpacing: '-0.025em',
                  }}
                >
                  Báo cáo cuối ngày về bán hàng
                </h1>
                <div style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 600 }}>
                  Ngày bán: <span style={{ color: 'var(--color-coffee-600)' }}>{formattedDate}</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                  Chi nhánh: <strong>{data.branch_name}</strong>
                </div>
              </div>
            </div>

            {/* ── THE REPORT TABLE (Full-width, auto-scaled, zero horizontal scrolling) ── */}
            <div
              style={{
                width: '100%',
                overflowX: 'hidden',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid #cbd5e1',
                marginBottom: '1.5rem',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  tableLayout: 'fixed', // Fixed layout guarantees no horizontal overflow!
                  fontSize: '0.8125rem',
                }}
              >
                {/* Columns proportion definition */}
                <colgroup>
                  <col style={{ width: '22%' }} /> {/* Mã chứng từ / Khung giờ */}
                  <col style={{ width: '10%' }} /> {/* Thời gian */}
                  <col style={{ width: '11%' }} /> {/* Phòng/Bàn */}
                  <col style={{ width: '7%' }} />  {/* SLSP */}
                  <col style={{ width: '13%' }} /> {/* Doanh thu */}
                  <col style={{ width: '7%' }} />  {/* Thu khác */}
                  <col style={{ width: '7%' }} />  {/* Thuế */}
                  <col style={{ width: '8%' }} />  {/* Phí trả hàng */}
                  <col style={{ width: '15%' }} /> {/* Thanh toán */}
                </colgroup>

                <thead>
                  <tr
                    style={{
                      background: 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)',
                      color: '#1e3a8a',
                      fontWeight: 700,
                      borderBottom: '1px solid #93c5fd',
                    }}
                  >
                    <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left' }}>Mã chứng từ</th>
                    <th style={{ padding: '0.625rem 0.5rem', textAlign: 'center' }}>Thời gian</th>
                    <th style={{ padding: '0.625rem 0.5rem', textAlign: 'left' }}>Phòng/Bàn</th>
                    <th style={{ padding: '0.625rem 0.5rem', textAlign: 'center' }}>SLSP</th>
                    <th style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>Doanh thu</th>
                    <th style={{ padding: '0.625rem 0.5rem', textAlign: 'center' }}>Thu khác</th>
                    <th style={{ padding: '0.625rem 0.5rem', textAlign: 'center' }}>Thuế</th>
                    <th style={{ padding: '0.625rem 0.5rem', textAlign: 'center' }}>Phí trả hàng</th>
                    <th style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>Thanh toán</th>
                  </tr>
                </thead>

                <tbody>
                  {/* ── SUMMARY ROW (Highlighted in light yellow, exactly like the user's photo) ── */}
                  <tr
                    style={{
                      background: 'linear-gradient(180deg, #fef08a 0%, #fde047 100%)',
                      fontWeight: 800,
                      color: '#713f12',
                      borderBottom: '2px solid #eab308',
                      fontSize: '0.85rem',
                    }}
                  >
                    <td style={{ padding: '0.75rem 0.75rem' }}>
                      Hóa đơn: {data.total_orders}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>-</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>-</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                      {data.total_items}
                    </td>
                    <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontSize: '0.925rem' }}>
                      {formatCurrency(data.total_revenue)}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>0</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>0</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>0</td>
                    <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontSize: '0.925rem' }}>
                      {formatCurrency(data.total_payment)}
                    </td>
                  </tr>

                  {/* ── HOUR GROUPS WITH DRILL-DOWN [+] / [-] (Exactly matching the photo) ── */}
                  {data.hour_groups.map((group: any) => {
                    const isExpanded = !!expandedHours[group.hour_str]

                    return (
                      <tbody key={group.hour_str} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        {/* Group Header Row */}
                        <tr
                          onClick={() => toggleHour(group.hour_str)}
                          style={{
                            background: isExpanded ? '#f8fafc' : '#ffffff',
                            cursor: 'pointer',
                            fontWeight: 700,
                            borderTop: '1px solid #e2e8f0',
                            transition: 'background 0.15s ease',
                          }}
                          className="hover:bg-slate-50"
                        >
                          <td style={{ padding: '0.625rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 18,
                                height: 18,
                                background: isExpanded ? 'var(--color-coffee-600)' : '#0f172a',
                                color: '#ffffff',
                                borderRadius: 3,
                                fontSize: '0.7rem',
                                fontWeight: 800,
                              }}
                            >
                              {isExpanded ? <Minus size={12} /> : <Plus size={12} />}
                            </span>
                            <span>
                              {formattedDate} {group.hour_str}
                            </span>
                          </td>
                          <td style={{ padding: '0.625rem 0.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            {group.orders.length} đơn
                          </td>
                          <td style={{ padding: '0.625rem 0.5rem', color: 'var(--color-text-muted)' }}>
                            -
                          </td>
                          <td style={{ padding: '0.625rem 0.5rem', textAlign: 'center', fontWeight: 700 }}>
                            {group.total_qty}
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontWeight: 700 }}>
                            {formatCurrency(group.total_revenue)}
                          </td>
                          <td style={{ padding: '0.625rem 0.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>0</td>
                          <td style={{ padding: '0.625rem 0.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>0</td>
                          <td style={{ padding: '0.625rem 0.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>0</td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-coffee-700)' }}>
                            {formatCurrency(group.total_payment)}
                          </td>
                        </tr>

                        {/* Detailed Orders inside this hour (shown when [+] is clicked) */}
                        {isExpanded &&
                          group.orders.map((ord: any) => {
                            const d = new Date(ord.paid_at)
                            const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                            const isOrderExpanded = !!expandedOrders[ord.id]

                            return (
                              <>
                                <tr
                                  key={ord.id}
                                  onClick={() => setExpandedOrders((p) => ({ ...p, [ord.id]: !p[ord.id] }))}
                                  style={{
                                    background: isOrderExpanded ? '#fef2f2' : '#ffffff',
                                    fontSize: '0.785rem',
                                    cursor: 'pointer',
                                    borderTop: '1px dashed #f1f5f9',
                                  }}
                                  className="hover:bg-amber-50/50"
                                >
                                  <td style={{ padding: '0.5rem 0.75rem 0.5rem 2.25rem', color: '#2563eb', fontWeight: 600 }}>
                                    {ord.invoice_number}
                                  </td>
                                  <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                    {timeStr}
                                  </td>
                                  <td style={{ padding: '0.5rem 0.5rem', fontWeight: 600 }}>
                                    {ord.table_name}
                                  </td>
                                  <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center', color: 'var(--color-text-primary)' }}>
                                    {ord.item_count}
                                  </td>
                                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>
                                    {formatCurrency(ord.total)}
                                  </td>
                                  <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center', color: '#94a3b8' }}>0</td>
                                  <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center', color: '#94a3b8' }}>0</td>
                                  <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center', color: '#94a3b8' }}>0</td>
                                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                                      <span>{formatCurrency(ord.total)}</span>
                                      <span
                                        style={{
                                          fontSize: '0.675rem',
                                          padding: '1px 4px',
                                          borderRadius: 3,
                                          background: ord.payment_method === 'CASH' ? '#dbeafe' : '#f3e8ff',
                                          color: ord.payment_method === 'CASH' ? '#1d4ed8' : '#7e22ce',
                                          fontWeight: 700,
                                        }}
                                      >
                                        {ord.payment_method === 'CASH' ? 'TM' : 'CK'}
                                      </span>
                                    </div>
                                  </td>
                                </tr>

                                {/* Expanded item list for this specific order */}
                                {isOrderExpanded && ord.items && ord.items.length > 0 && (
                                  <tr key={`${ord.id}-items`} style={{ background: '#f8fafc' }}>
                                    <td colSpan={9} style={{ padding: '0.5rem 1rem 0.75rem 3rem' }}>
                                      <div
                                        style={{
                                          background: '#ffffff',
                                          border: '1px solid #e2e8f0',
                                          borderRadius: 'var(--radius-md)',
                                          padding: '0.5rem 0.75rem',
                                        }}
                                      >
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-coffee-600)', marginBottom: '0.35rem' }}>
                                          Chi tiết các món trong đơn ({ord.cashier_name ? `Thu ngân: ${ord.cashier_name}` : ''}):
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                          {ord.items.map((it: any) => (
                                            <div
                                              key={it.id}
                                              style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '0.75rem',
                                                color: '#334155',
                                              }}
                                            >
                                              <div>
                                                <strong>{it.quantity}x</strong> {it.product_name}
                                                {it.note && (
                                                  <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.35rem' }}>
                                                    ({it.note})
                                                  </span>
                                                )}
                                              </div>
                                              <div style={{ fontWeight: 600 }}>
                                                {formatCurrency(it.subtotal)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            )
                          })}
                      </tbody>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ── SUMMARY PAYMENT BREAKDOWN & SIGNATURE FOOTER ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              {/* Payment Summary Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem 1.25rem',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.625rem', color: '#0f172a' }}>
                  Tổng hợp hình thức thanh toán
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#0369a1' }}>
                      <Coins size={15} /> Tiền mặt ({data.cash_orders} đơn):
                    </span>
                    <strong style={{ color: '#0369a1' }}>{formatCurrency(data.cash_amount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#6d28d9' }}>
                      <CreditCard size={15} /> Chuyển khoản QR ({data.bank_orders} đơn):
                    </span>
                    <strong style={{ color: '#6d28d9' }}>{formatCurrency(data.bank_amount)}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '0.5rem',
                      borderTop: '1px dashed #cbd5e1',
                      fontSize: '0.9rem',
                    }}
                  >
                    <span>Tổng thực thu cuối ngày:</span>
                    <strong style={{ color: 'var(--color-coffee-600)', fontSize: '1.1rem' }}>
                      {formatCurrency(data.total_payment)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Signatures for formal paper accounting */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  textAlign: 'center',
                  padding: '1rem 0',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                    Người lập biểu
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginBottom: '3.5rem' }}>
                    (Ký, ghi rõ họ tên)
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569' }}>
                    {data.cashiers?.[0] || 'Thu ngân'}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                    Chủ quán / Quản lý duyệt
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginBottom: '3.5rem' }}>
                    (Ký, đóng dấu nếu có)
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569' }}>
                    Molliee Tea Management
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
