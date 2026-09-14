import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { MainLayout } from '@/layouts/MainLayout'
import { LoadingSpinner } from '@/components/ui'
import LoginPage from '@/pages/login/LoginPage'
import PosPage from '@/pages/pos/PosPage'
import ProductsPage from '@/pages/products/ProductsPage'
import TablesPage from '@/pages/tables/TablesPage'
import InvoicesPage from '@/pages/invoices/InvoicesPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import OverviewPage from '@/pages/overview/OverviewPage'
import UsersPage from '@/pages/users/UsersPage'
import PrinterPage from '@/pages/printer/PrinterPage'
import type { ReactNode } from 'react'
import type { UserRole } from '@/types'

// ── Protected Route ───────────────────────────────────────────
function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <LoadingSpinner size={40} />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to="/pos" replace />
  }

  return <MainLayout>{children}</MainLayout>
}

// ── App ───────────────────────────────────────────────────────
function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <LoadingSpinner size={40} />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={user ? <Navigate to="/pos" replace /> : <LoginPage />}
      />

      {/* Protected — All roles */}
      <Route
        path="/pos"
        element={
          <ProtectedRoute>
            <PosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute>
            <InvoicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/printer"
        element={
          <ProtectedRoute>
            <PrinterPage />
          </ProtectedRoute>
        }
      />

      {/* Protected — OWNER + MANAGER */}
      <Route
        path="/overview"
        element={
          <ProtectedRoute roles={['OWNER', 'MANAGER']}>
            <OverviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute roles={['OWNER', 'MANAGER']}>
            <ProductsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tables"
        element={
          <ProtectedRoute roles={['OWNER', 'MANAGER']}>
            <TablesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute roles={['OWNER', 'MANAGER']}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute roles={['OWNER', 'MANAGER']}>
            <UsersPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
