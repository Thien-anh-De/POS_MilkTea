import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { orderService } from '@/services/orderService'
import { ToastContainer, EmptyState, LoadingSpinner, Modal, ConfirmDialog } from '@/components/ui'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import type { Order } from '@/types'
import { Receipt, Search, Calendar, Eye, XCircle, Filter, Printer } from 'lucide-react'
import { printReceipt, type PrintableOrder } from '@/utils/printer'

export default function InvoicesPage() {
  const { user, hasRole } = useAuth()
  const { toasts, success, error: toastError, removeToast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Cancel
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const loadOrders = useCallback(async () => {
    try {
      const data = await orderService.getAll({
        status: statusFilter || undefined,
        from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        to: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
        search: search || undefined,
      })
      setOrders(data)
    } catch {
      toastError('Không thể tải hóa đơn')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, dateFrom, dateTo, search, toastError])

  useEffect(() => { loadOrders() }, [loadOrders])

  const handleCancel = async () => {
    if (!cancelOrder || !user || !cancelReason.trim()) {
      toastError('Vui lòng nhập lý do hủy')
      return
    }
    try {
      await orderService.cancel(cancelOrder.id, user.id, cancelReason.trim())
      success('Đã hủy hóa đơn')
      setCancelOrder(null)
      setCancelReason('')
      loadOrders()
    } catch {
      toastError('Lỗi khi hủy hóa đơn')
    }
  }

  const handlePrintOrder = (order: Order) => {
    const printable: PrintableOrder = {
      invoice_number: order.invoice_number,
      table_name: order.table?.name ?? 'Mang về',
      cashier_name: order.cashier?.name ?? 'Thu ngân',
      created_at: order.created_at,
      items: (order.items ?? []).map((i) => ({
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
        note: i.note,
      })),
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      payment_method: order.payment?.method ?? (order.status === 'PAID' ? 'CASH' : undefined),
    }
    printReceipt(printable, undefined, order.status !== 'PAID')
    success(`Đã gửi lệnh in hóa đơn ${order.invoice_number}`)
  }

  const statusLabel: Record<string, string> = {
    OPEN: 'Đang mở',
    PAID: 'Đã thanh toán',
    CANCELLED: 'Đã hủy',
  }

  const statusBadge: Record<string, string> = {
    OPEN: 'badge-warning',
    PAID: 'badge-success',
    CANCELLED: 'badge-danger',
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <LoadingSpinner size={32} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header">
        <h1 className="page-title">Hóa đơn</h1>
        <p className="page-subtitle">{orders.length} hóa đơn</p>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="input-label"><Search size={12} style={{ display: 'inline', marginRight: 4 }} />Tìm mã HĐ</label>
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="INV-..." />
          </div>
          <div style={{ flex: '0 1 160px' }}>
            <label className="input-label"><Filter size={12} style={{ display: 'inline', marginRight: 4 }} />Trạng thái</label>
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="OPEN">Đang mở</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
          <div style={{ flex: '0 1 160px' }}>
            <label className="input-label"><Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />Từ ngày</label>
            <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div style={{ flex: '0 1 160px' }}>
            <label className="input-label">Đến ngày</label>
            <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Table */}
      {orders.length === 0 ? (
        <EmptyState icon={<Receipt size={48} />} title="Không có hóa đơn" description="Thay đổi bộ lọc hoặc tạo order mới" />
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã hóa đơn</th>
                <th>Bàn</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
                <th>Thu ngân</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{order.invoice_number}</td>
                  <td>{order.table?.name ?? '—'}</td>
                  <td style={{ color: 'var(--color-coffee-400)', fontWeight: 500 }}>{formatCurrency(order.total)}</td>
                  <td>
                    <span className={`badge ${statusBadge[order.status]}`}>{statusLabel[order.status]}</span>
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>{formatDateTime(order.created_at)}</td>
                  <td>{order.cashier?.name ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handlePrintOrder(order)} title="In hóa đơn">
                        <Printer size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedOrder(order)} title="Xem chi tiết">
                        <Eye size={14} />
                      </button>
                      {order.status === 'PAID' && hasRole('OWNER', 'MANAGER') && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => setCancelOrder(order)} title="Hủy hóa đơn">
                          <XCircle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Hóa đơn ${selectedOrder?.invoice_number ?? ''}`} wide>
        {selectedOrder && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <div className="input-label">Bàn</div>
                <div style={{ fontSize: '0.875rem' }}>{selectedOrder.table?.name ?? '—'}</div>
              </div>
              <div>
                <div className="input-label">Thu ngân</div>
                <div style={{ fontSize: '0.875rem' }}>{selectedOrder.cashier?.name ?? '—'}</div>
              </div>
              <div>
                <div className="input-label">Trạng thái</div>
                <span className={`badge ${statusBadge[selectedOrder.status]}`}>{statusLabel[selectedOrder.status]}</span>
              </div>
              <div>
                <div className="input-label">Thời gian</div>
                <div style={{ fontSize: '0.875rem' }}>{formatDateTime(selectedOrder.created_at)}</div>
              </div>
            </div>

            <hr className="divider" />

            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Chi tiết đơn</h4>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Món</th>
                  <th style={{ textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ textAlign: 'center' }}>SL</th>
                  <th style={{ textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {(selectedOrder.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>
                      <div>{item.product_name}</div>
                      {item.note && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-coffee-300)', marginTop: '0.125rem' }}>
                          {item.note}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <hr className="divider" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Tạm tính</span>
                <span>{formatCurrency(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', color: 'var(--color-danger)' }}>
                  <span>Giảm giá</span>
                  <span>-{formatCurrency(selectedOrder.discount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: '2rem', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-coffee-300)' }}>
                <span>Tổng cộng</span>
                <span>{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>

            {selectedOrder.cancel_reason && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(248, 113, 113, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-danger)', marginBottom: '0.25rem' }}>Lý do hủy</div>
                <div style={{ fontSize: '0.875rem' }}>{selectedOrder.cancel_reason}</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>
                Đóng
              </button>
              <button className="btn btn-primary" onClick={() => handlePrintOrder(selectedOrder)}>
                <Printer size={16} />
                In hóa đơn
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirm */}
      <ConfirmDialog
        open={!!cancelOrder}
        title="Hủy hóa đơn"
        message={`Bạn có chắc muốn hủy hóa đơn ${cancelOrder?.invoice_number ?? ''}? Hành động này không thể hoàn tác.`}
        confirmText="Hủy hóa đơn"
        danger
        onConfirm={handleCancel}
        onCancel={() => { setCancelOrder(null); setCancelReason('') }}
      >
        <div style={{ marginTop: '0.75rem' }}>
          <label className="input-label">Lý do hủy *</label>
          <input
            className="input"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Nhập lý do hủy hóa đơn..."
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
