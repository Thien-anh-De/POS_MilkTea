import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { userService } from '@/services/userService'
import { ToastContainer, Modal, EmptyState, LoadingSpinner, ConfirmDialog } from '@/components/ui'
import type { Profile, UserRole } from '@/types'
import { Users, Plus, Edit2, UserCheck, UserX, Shield, Trash2 } from 'lucide-react'

export default function UsersPage() {
  const { hasRole, profile: currentUser } = useAuth()
  const { toasts, success, error: toastError, removeToast } = useToast()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<Profile | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState<UserRole>('CASHIER')

  const loadData = useCallback(async () => {
    try {
      const data = await userService.getAll()
      setUsers(data)
    } catch {
      toastError('Không thể tải danh sách')
    } finally {
      setLoading(false)
    }
  }, [toastError])

  useEffect(() => { loadData() }, [loadData])

  const [submitting, setSubmitting] = useState(false)

  const handleAdd = async () => {
    const email = formEmail.trim().toLowerCase()
    const name = formName.trim()

    if (!email || !formPassword || !name) {
      toastError('Vui lòng điền đầy đủ thông tin')
      return
    }

    if (formPassword.length < 6) {
      toastError('Mật khẩu phải có tối thiểu 6 ký tự')
      return
    }

    setSubmitting(true)
    try {
      await userService.createUser(email, formPassword, name, formRole)
      success('Đã thêm nhân viên thành công')
      setShowAdd(false)
      setFormEmail('')
      setFormPassword('')
      setFormName('')
      setFormRole('CASHIER')
      loadData()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Lỗi khi thêm nhân viên')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditRole = async () => {
    if (!editingUser) return
    try {
      await userService.update(editingUser.id, { role: formRole, name: formName.trim() })
      success('Đã cập nhật')
      setShowEdit(false)
      loadData()
    } catch {
      toastError('Lỗi')
    }
  }

  const handleToggle = async () => {
    if (!confirmToggle) return
    try {
      await userService.toggleStatus(confirmToggle.id, confirmToggle.status)
      success(confirmToggle.status === 'active' ? 'Đã khóa tài khoản' : 'Đã mở khóa')
      setConfirmToggle(null)
      loadData()
    } catch {
      toastError('Lỗi')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await userService.deleteUser(confirmDelete.id)
      success(`Đã xóa nhân viên "${confirmDelete.name}" thành công`)
      setConfirmDelete(null)
      loadData()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Lỗi khi xóa nhân viên')
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (u: Profile) => {
    setEditingUser(u)
    setFormName(u.name)
    setFormRole(u.role)
    setShowEdit(true)
  }

  const roleLabel: Record<UserRole, string> = {
    OWNER: 'Chủ quán',
    MANAGER: 'Quản lý',
    CASHIER: 'Thu ngân',
  }

  const roleBadge: Record<UserRole, string> = {
    OWNER: 'badge-coffee',
    MANAGER: 'badge-info',
    CASHIER: 'badge-success',
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
          <h1 className="page-title">Nhân viên</h1>
          <p className="page-subtitle">{users.length} tài khoản</p>
        </div>
        {hasRole('OWNER', 'MANAGER') && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            Thêm nhân viên
          </button>
        )}
      </div>

      {users.length === 0 ? (
        <EmptyState icon={<Users size={48} />} title="Chưa có nhân viên" />
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--color-coffee-600), var(--color-coffee-800))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'white',
                          flexShrink: 0,
                        }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      {u.name}
                      {u.id === currentUser?.id && (
                        <span className="badge badge-coffee" style={{ fontSize: '0.625rem' }}>Bạn</span>
                      )}
                    </div>
                  </td>
                  <td>{u.email ?? '—'}</td>
                  <td>
                    <span className={`badge ${roleBadge[u.role]}`}>
                      <Shield size={10} style={{ marginRight: 4 }} />
                      {roleLabel[u.role]}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {u.id !== currentUser?.id && hasRole('OWNER', 'MANAGER') && (
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)} title="Sửa thông tin">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmToggle(u)} title={u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}>
                          {u.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                        {hasRole('OWNER') && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setConfirmDelete(u)}
                            style={{ color: 'var(--color-danger)' }}
                            title="Xóa nhân viên"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Thêm nhân viên">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="input-label">Tên</label>
            <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <label className="input-label">Email đăng nhập</label>
            <input className="input" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="anv@molliee.vn" />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Dùng email nội bộ để đăng nhập (vd: nv1@molliee.vn)
            </span>
          </div>
          <div>
            <label className="input-label">Mật khẩu</label>
            <input className="input" type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" />
          </div>
          <div>
            <label className="input-label">Vai trò</label>
            <select className="select" value={formRole} onChange={(e) => setFormRole(e.target.value as UserRole)}>
              <option value="CASHIER">Thu ngân</option>
              <option value="MANAGER">Quản lý</option>
              {hasRole('OWNER') && <option value="OWNER">Chủ quán</option>}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)} disabled={submitting}>Hủy</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={submitting}>
              {submitting ? 'Đang thêm...' : 'Thêm'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Sửa — ${editingUser?.name ?? ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="input-label">Tên</label>
            <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Vai trò</label>
            <select className="select" value={formRole} onChange={(e) => setFormRole(e.target.value as UserRole)}>
              <option value="CASHIER">Thu ngân</option>
              <option value="MANAGER">Quản lý</option>
              {hasRole('OWNER') && <option value="OWNER">Chủ quán</option>}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={handleEditRole}>Cập nhật</button>
          </div>
        </div>
      </Modal>

      {/* Toggle Confirm */}
      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
        message={`Bạn có muốn ${confirmToggle?.status === 'active' ? 'khóa' : 'mở khóa'} tài khoản "${confirmToggle?.name}" không?`}
        danger={confirmToggle?.status === 'active'}
        onConfirm={handleToggle}
        onCancel={() => setConfirmToggle(null)}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Xóa nhân viên"
        message={`Bạn có chắc chắn muốn xóa tài khoản nhân viên "${confirmDelete?.name}"? Thao tác này sẽ xóa tài khoản vĩnh viễn.`}
        confirmText={deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
