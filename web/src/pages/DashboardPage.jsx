import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { store } from '../lib/store'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function getInsights(business, services, staff, todayBookings) {
  const insights = []

  if (services.length === 0) {
    insights.push({ icon: '💡', text: 'Add your first service to start taking bookings.' })
  } else {
    const avgPrice = services.reduce((sum, s) => sum + (s.price || 0), 0) / services.length
    insights.push({
      icon: '📊',
      text: `Your average service price is $${avgPrice.toFixed(0)}. Consider adding premium options to increase revenue.`,
    })
  }

  if (staff.length === 0) {
    insights.push({ icon: '👥', text: 'Add team members so clients can book with their preferred staff.' })
  } else if (staff.length < 3) {
    insights.push({
      icon: '📈',
      text: `You have ${staff.length} team member${staff.length > 1 ? 's' : ''}. Growing your team could help handle more bookings.`,
    })
  } else {
    insights.push({
      icon: '✨',
      text: `Great team size! With ${staff.length} members, you can handle parallel appointments.`,
    })
  }

  if (services.length > 0) {
    const mostExpensive = services.reduce((a, b) => (a.price > b.price ? a : b))
    insights.push({
      icon: '⭐',
      text: `"${mostExpensive.name}" is your highest-priced service at $${mostExpensive.price}. Promote it to boost revenue.`,
    })
  }

  if (todayBookings.length === 0 && services.length > 0) {
    insights.push({
      icon: '🔗',
      text: 'Share your booking link with customers to start receiving online appointments.',
    })
  } else if (todayBookings.length > 0) {
    const confirmed = todayBookings.filter(b => b.status === 'confirmed').length
    if (confirmed > 0) {
      insights.push({
        icon: '📅',
        text: `You have ${confirmed} confirmed booking${confirmed > 1 ? 's' : ''} today. Keep your schedule updated!`,
      })
    }
  }

  return insights
}

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [todayBookings, setTodayBookings] = useState([])
  const [upcomingCount, setUpcomingCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const biz = store.getBusiness(user.id)
    if (biz) {
      setBusiness(biz)
      setServices(store.getServices(biz.id))
      setStaff(store.getStaff(biz.id))
      const today = todayStr()
      const allBookings = store.getBookings(biz.id)
      setTodayBookings(allBookings.filter(b => b.date === today))
      setUpcomingCount(allBookings.filter(b => b.date >= today && b.status === 'confirmed').length)
    }
  }, [user])

  const firstName = user?.full_name?.split(' ')[0] || 'there'
  const insights = getInsights(business, services, staff, todayBookings)

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{getGreeting()}, {firstName}</h1>
        <p className="page-subtitle">Here's what's happening with your business today</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon">🛠</div>
          <div className="stat-card-label">Services</div>
          <div className="stat-card-value">{services.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">👥</div>
          <div className="stat-card-label">Staff</div>
          <div className="stat-card-value">{staff.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">📅</div>
          <div className="stat-card-label">Today's Bookings</div>
          <div className="stat-card-value">{todayBookings.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">📈</div>
          <div className="stat-card-label">Upcoming</div>
          <div className="stat-card-value">{upcomingCount}</div>
        </div>
      </div>

      <div className="ai-card">
        <div className="ai-card-header">
          <div className="ai-dot" />
          <div className="ai-card-title">AI Insights</div>
        </div>
        {insights.map((insight, i) => (
          <div key={i} className="ai-insight">
            <span>{insight.icon}</span>
            <span>{insight.text}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Quick Actions</div>
        <div className="quick-actions">
          <Link to="/services" className="quick-action">
            <span className="quick-action-icon">➕</span>
            <span className="quick-action-label">Add Service</span>
          </Link>
          <Link to="/staff" className="quick-action">
            <span className="quick-action-icon">🧑‍💼</span>
            <span className="quick-action-label">Add Staff</span>
          </Link>
          <Link to="/settings" className="quick-action">
            <span className="quick-action-icon">✏️</span>
            <span className="quick-action-label">Edit Business</span>
          </Link>
          <Link to="/schedule" className="quick-action">
            <span className="quick-action-icon">🔗</span>
            <span className="quick-action-label">Share Booking Link</span>
          </Link>
        </div>
      </div>
    </>
  )
}
