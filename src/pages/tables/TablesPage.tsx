import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/useToast'
import { tableService } from '@/services/tableService'
import { ToastContainer, Modal, EmptyState, LoadingSpinner, ConfirmDialog } from '@/components/ui'
import type { CoffeeTable } from '@/types'
import { Grid3X3, Plus, Edit2, ToggleLeft, ToggleRight } from 'lucide-react'

export default function TablesPage() {
  const { toasts, success, error: toastError, removeToast } = useToast()
  const [tables, setTables] = useState<CoffeeTable[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<CoffeeTable | null>(null)
  const [formName, setFormName] = useState('')
  const [confirmToggle, setConfirmToggle] = useState<CoffeeTable | null>(null)

  const loadData = useCallback(async () => {
    try {
      const t = await tableService.getAll()
      setTables(t)
    } catch {
      toastError('Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [toastError])

  useEffect(() => { loadData() }, [loadData])

  const openAdd = () => {
    setEditing(null)
    setFormName('')
    setShowModal(true)
  }

  const openEdit = (t: CoffeeTable) => {
    setEditing(t)
    setFormName(t.name)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toastError('Vui lòng nhập tên bàn')
      return
    }
    try {
      if (editing) {
        await tableService.update(editing.id, { name: formName.trim() })
        success('Đã cập nhật bàn')
      } else {
        await tableService.create(formName.trim(), tables.length + 1)
        success('Đã thêm bàn mới')
      }
      setShowModal(false)
      loadData()
    } catch {
      toastError('Lỗi khi lưu bàn')
    }
  }

  const handleToggle = async () => {
    if (!confirmToggle) return
    try {
      await tableService.update(confirmToggle.id, { active: !confirmToggle.active })
      success(confirmToggle.active ? 'Đã tắt bàn' : 'Đã bật bàn')
      setConfirmToggle(null)
      loadData()
    } catch {
      toastError('Lỗi')
    }
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Quản lý bàn</h1>
          <p className="page-subtitle">{tables.length} bàn</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} />
          Thêm bàn
        </button>
      </div>

      {tables.length === 0 ? (
        <EmptyState
          icon={<Grid3X3 size={48} />}
          title="Chưa có bàn nào"
          description="Thêm bàn để sử dụng trong POS"
          action={
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={16} />
              Thêm bàn đầu tiên
            </button>
          }
        />
      ) : (
        <div
          className="stagger-children"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          {tables.map((table) => (
            <div
              key={table.id}
              className={`glass-card ${
                !table.active
                  ? 'table-disabled'
                  : table.status === 'AVAILABLE'
                  ? 'table-available'
                  : table.status === 'OCCUPIED'
                  ? 'table-occupied'
                  : ''
              }`}
              style={{ padding: '1.25rem', border: '2px solid' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{table.name}</div>
                <span
                  className={`badge ${
                    !table.active
                      ? 'badge-info'
                      : table.status === 'AVAILABLE'
                      ? 'badge-success'
                      : table.status === 'OCCUPIED'
                      ? 'badge-warning'
                      : 'badge-info'
                  }`}
                >
                  {!table.active ? 'Đã tắt' : table.status === 'AVAILABLE' ? 'Trống' : table.status === 'OCCUPIED' ? 'Đang dùng' : table.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(table)}>
                  <Edit2 size={14} />
                  <span>Sửa</span>
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmToggle(table)}>
                  {table.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  <span>{table.active ? 'Tắt' : 'Bật'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Sửa bàn' : 'Thêm bàn mới'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="input-label">Tên bàn</label>
            <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ví dụ: Bàn 01" autoFocus />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Cập nhật' : 'Thêm'}</button>
          </div>
        </div>
      </Modal>

      {/* Toggle Confirm */}
      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.active ? 'Tắt bàn' : 'Bật bàn'}
        message={`Bạn có muốn ${confirmToggle?.active ? 'tắt' : 'bật'} "${confirmToggle?.name}" không?`}
        onConfirm={handleToggle}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  )
}
