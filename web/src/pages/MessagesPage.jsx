import { useEffect, useState } from 'react'
import {
  MessageSquare,
  Bell,
  CalendarCheck,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Filter,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'

function timeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr + 'T12:00:00')
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`
}

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function generateNotifications(bookings, customers) {
  const notifications = []
  const today = todayStr()

  bookings.forEach(b => {
    if (b.status === 'confirmed' && b.date === today) {
      notifications.push({
        id: `upcoming-${b.id}`,
        type: 'upcoming',
        icon: Clock,
        color: 'var(--accent-bright)',
        bgColor: 'rgba(59,130,246,0.1)',
        title: 'Upcoming Appointment',
        message: `${b.customer_name} has a ${b.service_name} appointment at ${b.time} today.`,
        date: b.date,
        read: false,
      })
    }

    if (b.status === 'confirmed' && b.date > today) {
      notifications.push({
        id: `new-booking-${b.id}`,
        type: 'new_booking',
        icon: CalendarCheck,
        color: 'var(--green)',
        bgColor: 'rgba(34,197,94,0.1)',
        title: 'New Booking',
        message: `${b.customer_name} booked ${b.service_name} for ${b.date} at ${b.time}.`,
        date: b.date,
        read: false,
      })
    }

    if (b.status === 'completed') {
      notifications.push({
        id: `completed-${b.id}`,
        type: 'completed',
        icon: CheckCircle2,
        color: 'var(--teal)',
        bgColor: 'rgba(45,212,191,0.1)',
        title: 'Appointment Completed',
        message: `${b.service_name} with ${b.customer_name} on ${b.date} was completed.`,
        date: b.date,
        read: true,
      })
    }

    if (b.status === 'cancelled') {
      notifications.push({
        id: `cancelled-${b.id}`,
        type: 'cancelled',
        icon: XCircle,
        color: 'var(--rose)',
        bgColor: 'rgba(244,63,94,0.1)',
        title: 'Booking Cancelled',
        message: `${b.customer_name} cancelled their ${b.service_name} appointment on ${b.date}.`,
        date: b.date,
        read: true,
      })
    }
  })

  if (customers.length > 0) {
    const recent = [...customers].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 3)
    recent.forEach(c => {
      notifications.push({
        id: `customer-${c.id}`,
        type: 'new_customer',
        icon: UserPlus,
        color: 'var(--purple)',
        bgColor: 'rgba(167,139,250,0.1)',
        title: 'New Customer',
        message: `${c.name} was added to your customer list.`,
        date: c.created_at ? c.created_at.split('T')[0] : today,
        read: true,
      })
    })
  }

  notifications.sort((a, b) => b.date.localeCompare(a.date))
  return notifications
}

export default function MessagesPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [filter, setFilter] = useState('all')
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('solis_dismissed') || '[]') } catch { return [] }
  })

  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        const bookings = await dataStore.getBookings(biz.id)
        const customers = await dataStore.getCustomers(biz.id)
        setNotifications(generateNotifications(bookings, customers))
      }
    }
    loadData()
  }, [user])

  const dismiss = (id) => {
    const updated = [...dismissed, id]
    setDismissed(updated)
    localStorage.setItem('solis_dismissed', JSON.stringify(updated))
  }

  const clearAll = () => {
    const allIds = visible.map(n => n.id)
    const updated = [...dismissed, ...allIds]
    setDismissed(updated)
    localStorage.setItem('solis_dismissed', JSON.stringify(updated))
  }

  const active = notifications.filter(n => !dismissed.includes(n.id))
  const visible = filter === 'all'
    ? active
    : active.filter(n => n.type === filter)

  const unreadCount = active.filter(n => !n.read).length

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'new_booking', label: 'Bookings' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Messages & Notifications</h1>
        <p className="page-subtitle">Stay updated on your business activity</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon"><Bell size={22} /></div>
          <div className="stat-card-label">Active Notifications</div>
          <div className="stat-card-value">{active.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><MessageSquare size={22} /></div>
          <div className="stat-card-label">Unread</div>
          <div className="stat-card-value">{unreadCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><CalendarCheck size={22} /></div>
          <div className="stat-card-label">Today's Events</div>
          <div className="stat-card-value">{active.filter(n => n.date === todayStr()).length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <span>Notifications</span>
          </div>
          {visible.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={clearAll}>
              Clear All
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button
              key={f.key}
              className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f.key)}
              style={{ width: 'auto' }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Bell size={48} strokeWidth={1.5} /></div>
            <div className="empty-state-title">
              {active.length === 0 ? 'No notifications' : 'No matching notifications'}
            </div>
            <div className="empty-state-text">
              {active.length === 0
                ? 'When customers book appointments or activity happens, notifications will appear here.'
                : 'Try a different filter to see other notifications.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {visible.map(n => {
              const IconComponent = n.icon
              return (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '16px',
                    background: n.read ? 'transparent' : 'rgba(59,130,246,0.03)',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${n.read ? 'var(--border)' : 'rgba(59,130,246,0.1)'}`,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: n.bgColor, color: n.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <IconComponent size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{n.title}</span>
                      {!n.read && (
                        <span style={{
                          width: '7px', height: '7px', borderRadius: '50%',
                          background: 'var(--accent)', flexShrink: 0
                        }} />
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      {timeAgo(n.date)}
                    </div>
                  </div>
                  <button
                    className="btn-icon"
                    onClick={() => dismiss(n.id)}
                    title="Dismiss"
                    style={{ flexShrink: 0 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
