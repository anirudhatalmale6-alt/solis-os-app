import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Wrench,
  Users,
  CalendarCheck,
  TrendingUp,
  Plus,
  UserPlus,
  Pencil,
  Link2,
  Lightbulb,
  BarChart3,
  Sparkles,
  Star,
  Zap,
  Clock,
  UserRound,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Scissors,
  Stethoscope,
  Briefcase,
  Home,
  Dumbbell,
  Flower2,
  UtensilsCrossed,
  SmilePlus,
} from 'lucide-react'

const industryServiceIcon = {
  salon: Scissors,
  clinic: Stethoscope,
  garage: Wrench,
  real_estate: Home,
  fitness: Dumbbell,
  spa: Flower2,
  restaurant: UtensilsCrossed,
  dental: SmilePlus,
  other: Briefcase,
}
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'

const insightIconMap = { Lightbulb, BarChart3, Users, TrendingUp, Sparkles, Star, Link2, CalendarCheck }

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function getInsights(business, services, staff, todayBookings) {
  const insights = []

  if (services.length === 0) {
    insights.push({ iconName: 'Lightbulb', text: 'Add your first service to start taking bookings.' })
  } else {
    const avgPrice = services.reduce((sum, s) => sum + (s.price || 0), 0) / services.length
    insights.push({ iconName: 'BarChart3', text: `Your average service price is $${avgPrice.toFixed(0)}. Consider adding premium options to increase revenue.` })
  }

  if (staff.length === 0) {
    insights.push({ iconName: 'Users', text: 'Add team members so clients can book with their preferred staff.' })
  } else if (staff.length < 3) {
    insights.push({ iconName: 'TrendingUp', text: `You have ${staff.length} team member${staff.length > 1 ? 's' : ''}. Growing your team could help handle more bookings.` })
  } else {
    insights.push({ iconName: 'Sparkles', text: `Great team size! With ${staff.length} members, you can handle parallel appointments.` })
  }

  if (services.length > 0) {
    const mostExpensive = services.reduce((a, b) => (a.price > b.price ? a : b))
    insights.push({ iconName: 'Star', text: `"${mostExpensive.name}" is your highest-priced service at $${mostExpensive.price}. Promote it to boost revenue.` })
  }

  if (todayBookings.length === 0 && services.length > 0) {
    insights.push({ iconName: 'Link2', text: 'Share your booking link with customers to start receiving online appointments.' })
  } else if (todayBookings.length > 0) {
    const confirmed = todayBookings.filter(b => b.status === 'confirmed').length
    if (confirmed > 0) {
      insights.push({ iconName: 'CalendarCheck', text: `You have ${confirmed} confirmed booking${confirmed > 1 ? 's' : ''} today. Keep your schedule updated!` })
    }
  }

  return insights
}

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatTime12(time24) {
  if (!time24) return ''
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [customers, setCustomers] = useState([])
  const [todayBookings, setTodayBookings] = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [upcomingCount, setUpcomingCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        setServices(await dataStore.getServices(biz.id))
        setStaff(await dataStore.getStaff(biz.id))
        setCustomers(await dataStore.getCustomers(biz.id))
        const today = todayStr()
        const bookings = await dataStore.getBookings(biz.id)
        setAllBookings(bookings)
        setTodayBookings(bookings.filter(b => b.date === today))
        setUpcomingCount(bookings.filter(b => b.date >= today && b.status === 'confirmed').length)
      }
    }
    loadData()
  }, [user])

  const firstName = user?.full_name?.split(' ')[0] || 'there'
  const svcName = (b) => b.service_name || (services.find(s => s.id === b.service_id)?.name) || 'Service'
  const insights = getInsights(business, services, staff, todayBookings)

  const recentActivity = allBookings
    .sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')))
    .slice(0, 5)

  const statusIcon = (status) => {
    if (status === 'completed') return <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
    if (status === 'cancelled') return <XCircle size={16} style={{ color: 'var(--rose)' }} />
    if (status === 'confirmed') return <Clock size={16} style={{ color: 'var(--accent-bright)' }} />
    return <Clock size={16} style={{ color: 'var(--text-muted)' }} />
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{getGreeting()}, {firstName}</h1>
        <p className="page-subtitle">Here's what's happening with your business today</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon">{(() => { const I = industryServiceIcon[business?.industry] || Briefcase; return <I size={22} /> })()}</div>
          <div className="stat-card-label">Services</div>
          <div className="stat-card-value">{services.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><Users size={22} /></div>
          <div className="stat-card-label">Staff</div>
          <div className="stat-card-value">{staff.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><CalendarCheck size={22} /></div>
          <div className="stat-card-label">Today's Bookings</div>
          <div className="stat-card-value">{todayBookings.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><TrendingUp size={22} /></div>
          <div className="stat-card-label">Upcoming</div>
          <div className="stat-card-value">{upcomingCount}</div>
        </div>
      </div>

      <div className="ai-card">
        <div className="ai-card-header">
          <div className="ai-dot"><Zap size={14} /></div>
          <div className="ai-card-title">AI Insights</div>
        </div>
        {insights.map((insight, i) => {
          const IconComponent = insightIconMap[insight.iconName]
          return (
            <div key={i} className="ai-insight">
              <span>{IconComponent ? <IconComponent size={18} /> : null}</span>
              <span>{insight.text}</span>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Today's Schedule */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">
            <span>Today's Schedule</span>
            <Link to="/bookings" style={{ fontSize: '13px', color: 'var(--accent-bright)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {todayBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No appointments scheduled for today
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {todayBookings.slice(0, 4).map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: 'var(--accent-bright)', minWidth: '60px' }}>
                    {formatTime12(b.time)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{svcName(b)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{b.customer_name}</div>
                  </div>
                  {statusIcon(b.status)}
                </div>
              ))}
              {todayBookings.length > 4 && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '4px' }}>
                  +{todayBookings.length - 4} more
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">
            <span>Recent Activity</span>
            <Link to="/messages" style={{ fontSize: '13px', color: 'var(--accent-bright)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No recent activity
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentActivity.map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px', borderBottom: '1px solid var(--border)'
                }}>
                  {statusIcon(b.status)}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px' }}>
                      <span style={{ fontWeight: 500 }}>{b.customer_name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {b.status === 'confirmed' ? ' booked ' : b.status === 'completed' ? ' completed ' : ' cancelled '}
                      </span>
                      <span style={{ fontWeight: 500 }}>{svcName(b)}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{b.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customer Overview */}
      <div className="card">
        <div className="card-title">
          <span>Customer Overview</span>
          <Link to="/customers" style={{ fontSize: '13px', color: 'var(--accent-bright)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: customers.length > 0 ? '16px' : 0 }}>
          <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700 }}>{customers.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Customers</div>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700 }}>{allBookings.filter(b => b.status === 'completed').length}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Completed Bookings</div>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700 }}>
              ${services.length > 0 ? (services.reduce((s, svc) => s + (svc.price || 0), 0) / services.length).toFixed(0) : 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Avg Service Price</div>
          </div>
        </div>
        {customers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
            Add customers from the Customers page to see your overview here.
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Quick Actions</div>
        <div className="quick-actions">
          <Link to="/services" className="quick-action">
            <span className="quick-action-icon"><Plus size={22} /></span>
            <span className="quick-action-label">Add Service</span>
          </Link>
          <Link to="/staff" className="quick-action">
            <span className="quick-action-icon"><UserPlus size={22} /></span>
            <span className="quick-action-label">Add Staff</span>
          </Link>
          <Link to="/customers" className="quick-action">
            <span className="quick-action-icon"><UserRound size={22} /></span>
            <span className="quick-action-label">Customers</span>
          </Link>
          <Link to="/settings" className="quick-action">
            <span className="quick-action-icon"><Pencil size={22} /></span>
            <span className="quick-action-label">Settings</span>
          </Link>
        </div>
      </div>
    </>
  )
}
