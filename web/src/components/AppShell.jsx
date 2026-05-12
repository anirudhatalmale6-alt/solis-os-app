import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { fullSync } from '../lib/cloudSync'
import {
  LayoutDashboard,
  CalendarCheck,
  Clock,
  UserRound,
  MessageSquare,
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

const SETTINGS_ITEM = { to: '/settings', icon: Settings, label: 'Settings' }
const BILLING_ITEM = { to: '/billing', icon: CreditCard, label: 'Billing' }

export default function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [industry, setIndustry] = useState('other')

  useEffect(() => {
    if (!user) return
    dataStore.getBusiness(user.id).then(biz => {
      if (biz?.industry) setIndustry(biz.industry)
      if (biz?.id) fullSync(biz.id).catch(() => {})
    })
  }, [user])

  const ServiceIcon = industryServiceIcon[industry] || Briefcase

  const NAV_SECTIONS = [
    {
      label: 'Main',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/messages', icon: MessageSquare, label: 'AI WhatsApp' },
        { to: '/bookings', icon: CalendarCheck, label: 'Bookings' },
        { to: '/schedule', icon: Clock, label: 'Schedule' },
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
        <Outlet />
      </main>
    </div>
  )
}
