import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { dataStore } from './lib/dataStore'
import AppShell from './components/AppShell'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import SetupPage from './pages/SetupPage'
import DashboardPage from './pages/DashboardPage'
import ServicesPage from './pages/ServicesPage'
import StaffPage from './pages/StaffPage'
import SettingsPage from './pages/SettingsPage'
import SchedulePage from './pages/SchedulePage'
import BookingsPage from './pages/BookingsPage'
import BookingPublicPage from './pages/BookingPublicPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const [business, setBusiness] = useState(undefined)

  useEffect(() => {
    if (!user) return
    const fetchBusiness = async () => {
      const biz = await dataStore.getBusiness(user.id)
      setBusiness(biz ?? null)
    }
    fetchBusiness()
  }, [user])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (business === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  if (!business && !window.location.pathname.startsWith('/setup') && !window.location.pathname.startsWith('/verify')) {
    return <Navigate to="/setup" replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  const [business, setBusiness] = useState(undefined)

  useEffect(() => {
    if (!user) {
      setBusiness(null)
      return
    }
    const fetchBusiness = async () => {
      const biz = await dataStore.getBusiness(user.id)
      setBusiness(biz)
    }
    fetchBusiness()
  }, [user])

  if (loading || (user && business === undefined)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  if (user) {
    return <Navigate to={business ? '/dashboard' : '/setup'} replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/book/:businessId" element={<BookingPublicPage />} />

      {/* Verification (accessible without full session for Supabase OTP) */}
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/setup" element={<ProtectedRoute><SetupPage /></ProtectedRoute>} />

      {/* Protected routes with AppShell */}
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/bookings" element={<BookingsPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
