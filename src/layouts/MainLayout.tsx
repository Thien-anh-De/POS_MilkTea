import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  Coffee,
  LayoutDashboard,
  ShoppingCart,
  Grid3X3,
  Package,
  Receipt,
  BarChart3,
  Users,
  LogOut,
  ChevronRight,
  Printer,
  Menu,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { UserRole } from '@/types'

const navItems: { to: string; icon: typeof ShoppingCart; label: string; roles: UserRole[] }[] = [
  { to: '/overview', icon: LayoutDashboard, label: 'Tổng quan', roles: ['OWNER', 'MANAGER'] },
  { to: '/pos', icon: ShoppingCart, label: 'Bán hàng', roles: ['OWNER', 'MANAGER', 'CASHIER'] },
  { to: '/tables', icon: Grid3X3, label: 'Quản lý bàn', roles: ['OWNER', 'MANAGER'] },
  { to: '/products', icon: Package, label: 'Quản lý món', roles: ['OWNER', 'MANAGER'] },
  { to: '/invoices', icon: Receipt, label: 'Hóa đơn', roles: ['OWNER', 'MANAGER', 'CASHIER'] },
  { to: '/reports', icon: BarChart3, label: 'Doanh thu', roles: ['OWNER', 'MANAGER'] },
  { to: '/users', icon: Users, label: 'Nhân viên', roles: ['OWNER', 'MANAGER'] },
  { to: '/printer', icon: Printer, label: 'Máy in hóa đơn', roles: ['OWNER', 'MANAGER', 'CASHIER'] },
]

export function MainLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const roleLabel = {
    OWNER: 'Chủ quán',
    MANAGER: 'Quản lý',
    CASHIER: 'Thu ngân',
  }

  // Find current active page title for mobile header
  const currentNav = navItems.find((item) => item.to === location.pathname)
  const pageTitle = currentNav?.label || 'Molliee'

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile Header (Shown on screens <= 768px) */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-coffee-500), var(--color-coffee-700))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Coffee size={18} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-coffee-800)', lineHeight: 1.2 }}>
              Molliee
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              {pageTitle}
            </div>
          </div>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          style={{ padding: '0.5rem' }}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, var(--color-coffee-500), var(--color-coffee-700))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Coffee size={22} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-coffee-300)' }}>
                Molliee
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                Point of Sale
              </div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            style={{ padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Links */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {navItems
            .filter((item) => profile && item.roles.includes(profile.role))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <item.icon size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                <ChevronRight size={14} style={{ opacity: 0.3 }} />
              </NavLink>
            ))}
        </div>

        {/* User Info + Logout */}
        <div
          style={{
            marginTop: 'auto',
            padding: '1rem',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {profile?.name ?? 'User'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {profile ? roleLabel[profile.role] : ''}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut} style={{ width: '100%' }}>
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main
        className="main-content"
        style={{
          flex: 1,
          padding: '1.5rem 2rem',
          overflowY: 'auto',
          maxHeight: '100vh',
        }}
      >
        {children}
      </main>
    </div>
  )
}
