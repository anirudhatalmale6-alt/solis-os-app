import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
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
import AnalyticsPage from './pages/AnalyticsPage'
import InvoicesPage from './pages/InvoicesPage'
import ReviewsPage from './pages/ReviewsPage'
import PromosPage from './pages/PromosPage'
import LoyaltyPage from './pages/LoyaltyPage'
import LocationsPage from './pages/LocationsPage'
import WorkspacePage from './pages/WorkspacePage'
import WaitlistPage from './pages/WaitlistPage'
import GiftCardsPage from './pages/GiftCardsPage'
import FormsPage from './pages/FormsPage'
import ExpensesPage from './pages/ExpensesPage'
import ReportsPage from './pages/ReportsPage'
import CampaignsPage from './pages/CampaignsPage'
import BillingPage from './pages/BillingPage'
import WhatsAppChatsPage from './pages/WhatsAppChatsPage'
import SignupsPage from './pages/SignupsPage'
import LeadsPage from './pages/LeadsPage'
import PartnersPage from './pages/PartnersPage'
import PaymentsPage from './pages/PaymentsPage'
import WhatsAppAssistantPage from './pages/WhatsAppAssistantPage'
import CustomerExplorePage from './pages/CustomerExplorePage'

// Owner accounts that can see the admin-only pages (Signups, Website Leads,
// Partners). Must match ADMIN_EMAILS in the API's partners.js.
const ADMIN_EMAILS = ['bbay.net@gmail.com', 'power.media1984@gmail.com', 'joseph.geagea31@gmail.com']

// A partner link arrives as ?ref=CODE on any entry URL. Remember it straight
// away so it still applies after a redirect to /login or /setup.
try {
  const incomingRef = new URLSearchParams(window.location.search).get('ref')
  if (incomingRef) localStorage.setItem('solis_referral_code', incomingRef.toUpperCase())
} catch {}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user || !ADMIN_EMAILS.includes((user.email || '').toLowerCase())) return <Navigate to="/dashboard" replace />
  return children
}

function ProtectedRoute({ children }) {
  const { user, loading, signOut } = useAuth()
  const [business, setBusiness] = useState(undefined)
  const [retries, setRetries] = useState(0)
  const [lastError, setLastError] = useState(null)

  const role = localStorage.getItem('solis_user_role')

  useEffect(() => {
    if (!user) return
    if (role === 'customer') {
      setBusiness('_customer_')
      return
    }
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
  }, [user, retries, role])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (role === 'customer') {
    return <Navigate to="/explore" replace />
  }

  if (business === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
        Loading... {retries > 0 ? `(retry ${retries}/3)` : ''}
      </div>
    )
  }

  if (!business && !window.location.pathname.startsWith('/setup') && !window.location.pathname.startsWith('/verify')) {
    const handleSignOut = async () => {
      localStorage.removeItem('solis_user_role')
      await signOut()
      window.location.href = '/login'
    }
    const handleSwitchToCustomer = () => {
      localStorage.setItem('solis_user_role', 'customer')
      window.location.href = '/explore'
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '20px', padding: '32px', textAlign: 'center', background: 'var(--bg-primary, #fff)' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-secondary, #f3f4f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
          🏢
        </div>
        <div style={{ maxWidth: '360px' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary, #111)' }}>
            {lastError ? 'Unable to load your business' : 'No business found'}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: 'var(--text-secondary, #6b7280)' }}>
            {lastError
              ? 'Something went wrong while loading your account. Please try again or continue to set up a new business.'
              : 'It looks like you haven\'t set up a business yet. Continue to get started in just a few steps.'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '260px' }}>
          <button
            onClick={() => { setBusiness(undefined); setRetries(0); }}
            style={{
              padding: '10px 20px', cursor: 'pointer', borderRadius: '8px',
              border: '1px solid var(--border-primary, #d1d5db)', background: 'var(--bg-primary, #fff)',
              color: 'var(--text-primary, #111)', fontSize: '14px', fontWeight: 500
            }}
          >
            Retry
          </button>
          <button
            onClick={() => window.location.href = '/setup'}
            style={{
              padding: '10px 20px', cursor: 'pointer', borderRadius: '8px',
              border: 'none', background: 'var(--accent, #6366f1)',
              color: '#fff', fontSize: '14px', fontWeight: 500
            }}
          >
            Continue to Setup
          </button>
          <button
            onClick={handleSwitchToCustomer}
            style={{
              padding: '10px 20px', cursor: 'pointer', borderRadius: '8px',
              border: '1px solid var(--border-primary, #d1d5db)', background: 'var(--bg-primary, #fff)',
              color: 'var(--text-primary, #111)', fontSize: '14px', fontWeight: 500
            }}
          >
            Browse as Customer Instead
          </button>
          <button
            onClick={handleSignOut}
            style={{
              padding: '10px 20px', cursor: 'pointer', borderRadius: '8px',
              border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)',
              color: '#ef4444', fontSize: '14px', fontWeight: 500
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return children
}

function CustomerRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  if (user) {
    const role = localStorage.getItem('solis_user_role')
    if (role === 'customer') return <Navigate to="/explore" replace />
    return <Navigate to="/dashboard" replace />
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

      {/* Customer routes */}
      <Route path="/explore" element={<CustomerRoute><CustomerExplorePage /></CustomerRoute>} />

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
        <Route path="/whatsapp-assistant" element={<WhatsAppAssistantPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/whatsapp-chats" element={<WhatsAppChatsPage />} />
        <Route path="/signups" element={<AdminRoute><SignupsPage /></AdminRoute>} />
        <Route path="/leads" element={<AdminRoute><LeadsPage /></AdminRoute>} />
        <Route path="/partners" element={<AdminRoute><PartnersPage /></AdminRoute>} />
        <Route path="/payments" element={<AdminRoute><PaymentsPage /></AdminRoute>} />
        <Route path="/booking-link" element={<BookingLinkPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/promos" element={<PromosPage />} />
        <Route path="/loyalty" element={<LoyaltyPage />} />
        <Route path="/locations" element={<LocationsPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/waitlist" element={<WaitlistPage />} />
        <Route path="/gift-cards" element={<GiftCardsPage />} />
        <Route path="/forms" element={<FormsPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/billing" element={<BillingPage />} />
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
