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
import CustomersPage from './pages/CustomersPage'
import MessagesPage from './pages/MessagesPage'
import BookingLinkPage from './pages/BookingLinkPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const [business, setBusiness] = useState(undefined)
  const [retries, setRetries] = useState(0)
  const [lastError, setLastError] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const fetchBusiness = async () => {
      try {
        setLastError(null)
        const biz = await dataStore.getBusiness(user.id)
        if (!cancelled) setBusiness(biz ?? null)
      } catch (err) {
        if (!cancelled) {
          setLastError(err.message || 'Unknown error')
          if (retries < 3) {
            setTimeout(() => setRetries(r => r + 1), 1500)
          } else {
            setBusiness(null)
          }
        }
      }
    }
    fetchBusiness()
    return () => { cancelled = true }
  }, [user, retries])

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
        Loading... {retries > 0 ? `(retry ${retries}/3)` : ''}
      </div>
    )
  }

  if (!business && !window.location.pathname.startsWith('/setup') && !window.location.pathname.startsWith('/verify')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', padding: '20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Debug: user={user?.id?.slice(0,8)}... email={user?.email} biz=null err={lastError || 'none'} retries={retries}
        </p>
        <button onClick={() => { setBusiness(undefined); setRetries(0); }} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Retry
        </button>
        <button onClick={() => window.location.href = '/setup'} style={{ padding: '8px 16px', cursor: 'pointer', marginTop: '8px' }}>
          Continue to Setup
        </button>
      </div>
    )
  }

  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  const [business, setBusiness] = useState(undefined)
  const [retries, setRetries] = useState(0)

  useEffect(() => {
    if (!user) {
      setBusiness(null)
      return
    }
    let cancelled = false
    const fetchBusiness = async () => {
      try {
        const biz = await dataStore.getBusiness(user.id)
        if (!cancelled) setBusiness(biz ?? null)
      } catch {
        if (!cancelled && retries < 2) {
          setTimeout(() => setRetries(r => r + 1), 1000)
        } else if (!cancelled) {
          setBusiness(null)
        }
      }
    }
    fetchBusiness()
    return () => { cancelled = true }
  }, [user, retries])

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
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/booking-link" element={<BookingLinkPage />} />
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
