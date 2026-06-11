import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { fullSync, syncedGet, fetchFromCloud } from '../lib/cloudSync'
import {
  LayoutDashboard,
  CalendarCheck,
  Clock,
  UserRound,
  MessageSquare,
  MessageCircle,
  UserPlus,
  Wrench,
  Scissors,
  Stethoscope,
  Briefcase,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  Link2,
  Home,
  GraduationCap,
  BarChart3,
  FileText,
  Star,
  Tag,
  Crown,
  MapPin,
  Shield,
  ListOrdered,
  Gift,
  ClipboardList,
  Receipt,
  FileBarChart,
  Megaphone,
  CreditCard,
  PhoneIncoming,
  Bot,
  Timer,
} from 'lucide-react'

const industryServiceIcon = {
  salon: Scissors,
  barber: Scissors,
  clinic: Stethoscope,
  garage: Wrench,
  real_estate: Home,
  lessons: GraduationCap,
  other: Briefcase,
}

const ADMIN_EMAIL = 'bbay.net@gmail.com'
const OWNER_EMAILS = ['bbay.net@gmail.com']
const SETTINGS_ITEM = { to: '/settings', icon: Settings, label: 'Settings' }
const BILLING_ITEM = { to: '/billing', icon: CreditCard, label: 'Billing' }

export default function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [industry, setIndustry] = useState('other')
  const [business, setBusiness] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if (!user) return
    dataStore.getBusiness(user.id).then(async biz => {
      if (biz) {
        setBusiness(biz)
        if (biz.industry) setIndustry(biz.industry)
        if (biz.id) fullSync(biz.id).catch(() => {})
      }
    })
    fetch(`https://api.solis-os.com/api/dashboard/subscription-status/${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(data => { setIsSubscribed(!!data.subscribed) })
      .catch(() => { setIsSubscribed(false) })
  }, [user])

  const TRIAL_DAYS = 14
  const trialDaysLeft = (() => {
    if (!business?.created_at) return TRIAL_DAYS
    const created = new Date(business.created_at)
    const now = new Date()
    const elapsed = Math.floor((now - created) / (1000 * 60 * 60 * 24))
    return Math.max(0, TRIAL_DAYS - elapsed)
  })()

  const ServiceIcon = industryServiceIcon[industry] || Briefcase

  const NAV_SECTIONS = [
    {
      label: 'Main',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/whatsapp-assistant', icon: Bot, label: 'AI WhatsApp Assistant' },
        { to: '/messages', icon: MessageSquare, label: 'AI WhatsApp' },
        { to: '/whatsapp-chats', icon: MessageCircle, label: 'WhatsApp Chats' },
        { to: '/bookings', icon: CalendarCheck, label: 'Bookings' },
        { to: '/schedule', icon: Clock, label: 'Schedule' },
        ...(user?.email === ADMIN_EMAIL ? [
          { to: '/signups', icon: UserPlus, label: 'Signups' },
          { to: '/leads', icon: PhoneIncoming, label: 'Website Leads' },
        ] : []),
        { to: '/analytics', icon: BarChart3, label: 'Analytics' },
        { to: '/reports', icon: FileBarChart, label: 'Reports' },
      ],
    },
    {
      label: 'Management',
      items: [
        { to: '/services', icon: ServiceIcon, label: 'Services' },
        { to: '/staff', icon: Users, label: 'Staff' },
        { to: '/customers', icon: UserRound, label: 'Customers' },
        { to: '/invoices', icon: FileText, label: 'Invoices' },
        { to: '/expenses', icon: Receipt, label: 'Expenses' },
        { to: '/locations', icon: MapPin, label: 'Locations' },
        { to: '/workspace', icon: Shield, label: 'Workspace' },
        { to: '/waitlist', icon: ListOrdered, label: 'Waitlist' },
        { to: '/forms', icon: ClipboardList, label: 'Forms' },
      ],
    },
    {
      label: 'Marketing',
      items: [
        { to: '/campaigns', icon: Megaphone, label: 'Campaigns' },
        { to: '/reviews', icon: Star, label: 'Reviews' },
        { to: '/promos', icon: Tag, label: 'Promo Codes' },
        { to: '/loyalty', icon: Crown, label: 'Loyalty Program' },
        { to: '/gift-cards', icon: Gift, label: 'Gift Cards' },
      ],
    },
    {
      label: 'Share',
      items: [
        { to: '/booking-link', icon: Link2, label: 'Booking Link' },
      ],
    },
  ]

  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const handleSignOut = () => {
    signOut()
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  const renderNavItem = (item) => {
    const IconComponent = item.icon
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        onClick={closeSidebar}
      >
        <span className="nav-link-icon"><IconComponent size={20} /></span>
        {item.label}
      </NavLink>
    )
  }

  return (
    <div className="app-shell">
      {/* Mobile header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px' }}>
          <img src="/logo-full.png" alt="Solis OS" style={{ height: '44px', width: 'auto' }} />
        </div>
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="sidebar-close" onClick={closeSidebar} aria-label="Close menu">
          <X size={24} />
        </button>

        <div className="sidebar-logo">
          <img src="/logo-full.png" alt="Solis OS" style={{ height: '44px', width: 'auto' }} />
        </div>

        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section, idx) => (
            <div key={section.label} className="nav-section">
              {idx > 0 && <div className="nav-divider" />}
              <div className="nav-section-label">{section.label}</div>
              {section.items.map(renderNavItem)}
            </div>
          ))}

          <div className="nav-divider" />
          {renderNavItem(BILLING_ITEM)}
          {renderNavItem(SETTINGS_ITEM)}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user" onClick={handleSignOut} title="Sign out">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.full_name || 'User'}</div>
              <div className="sidebar-user-email">{user?.email || ''}</div>
            </div>
            <LogOut size={18} className="sidebar-signout-icon" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {!isSubscribed && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '10px 20px', marginBottom: '16px', borderRadius: '10px',
            background: trialDaysLeft <= 3
              ? 'rgba(239,68,68,0.08)'
              : trialDaysLeft <= 7
                ? 'rgba(245,158,11,0.08)'
                : 'rgba(34,197,94,0.08)',
            border: `1px solid ${trialDaysLeft <= 3 ? 'rgba(239,68,68,0.2)' : trialDaysLeft <= 7 ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}`,
          }}>
            <Timer size={16} style={{
              color: trialDaysLeft <= 3 ? '#ef4444' : trialDaysLeft <= 7 ? '#f59e0b' : '#16a34a',
            }} />
            <span style={{
              fontSize: '13px', fontWeight: 600,
              color: trialDaysLeft <= 3 ? '#ef4444' : trialDaysLeft <= 7 ? '#f59e0b' : '#16a34a',
            }}>
              {trialDaysLeft > 0
                ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left on your free trial`
                : 'Your free trial has ended'}
            </span>
            {trialDaysLeft <= 3 && (
              <NavLink to="/billing" style={{
                fontSize: '12px', fontWeight: 600, color: '#fff',
                background: trialDaysLeft === 0 ? '#ef4444' : '#f59e0b',
                padding: '4px 12px', borderRadius: '6px', textDecoration: 'none',
                marginLeft: '8px',
              }}>
                {trialDaysLeft === 0 ? 'Subscribe Now' : 'Upgrade'}
              </NavLink>
            )}
          </div>
        )}
        {trialDaysLeft === 0 && !isSubscribed && !OWNER_EMAILS.includes(user?.email) && !['/billing', '/settings'].includes(location.pathname) ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 'calc(100vh - 200px)', padding: '32px',
          }}>
            <div style={{
              maxWidth: '460px', width: '100%', background: 'var(--bg-primary, #fff)',
              borderRadius: '20px', padding: '48px 36px', textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid var(--border, #e5e7eb)',
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Crown size={32} style={{ color: '#d97706' }} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>
                Free Trial Ended
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary, #6b7280)', lineHeight: 1.6, margin: '0 0 24px' }}>
                Your 14-day free trial has expired. Subscribe to Solis OS to continue using all features. Your data is safe and waiting for you.
              </p>
              <NavLink to="/billing" style={{
                display: 'block', width: '100%', padding: '14px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff',
                fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-display)',
                textDecoration: 'none', textAlign: 'center', marginBottom: '12px',
              }}>
                Subscribe Now — $39/month
              </NavLink>
              <button onClick={() => { signOut(); navigate('/login') }} style={{
                width: '100%', padding: '12px', borderRadius: '10px', background: 'none',
                border: '1px solid var(--border, #e5e7eb)', color: 'var(--text-secondary, #6b7280)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}>
                Log Out
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', margin: '16px 0 0' }}>
                Your data is safe and will be available after subscribing.
              </p>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  )
}
