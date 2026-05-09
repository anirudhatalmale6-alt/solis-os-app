import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/bookings', icon: '📅', label: 'Bookings', disabled: true, badge: 'Coming Soon' },
  { to: '/customers', icon: '👤', label: 'Customers', disabled: true, badge: 'Coming Soon' },
  { to: '/messages', icon: '💬', label: 'Messages', disabled: true, badge: 'Coming Soon' },
  { to: '/services', icon: '🛠', label: 'Services' },
  { to: '/staff', icon: '👥', label: 'Staff' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const handleSignOut = () => {
    signOut()
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="app-shell">
      {/* Mobile header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px' }}>
          <div className="sidebar-logo-icon">S</div>
          Solis OS
        </div>
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? '✕' : '☰'}
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
          ✕
        </button>

        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">S</div>
          Solis OS
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            item.disabled ? (
              <div key={item.to} className="nav-link disabled">
                <span className="nav-link-icon">{item.icon}</span>
                {item.label}
                {item.badge && <span className="nav-link-badge">{item.badge}</span>}
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="nav-link-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user" onClick={handleSignOut} title="Sign out">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.full_name || 'User'}</div>
              <div className="sidebar-user-email">{user?.email || ''}</div>
            </div>
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
