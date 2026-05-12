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
  DollarSign,
  Scissors,
  Stethoscope,
  Briefcase,
  Home,
  GraduationCap,
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
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'

const insightIconMap = { Lightbulb, BarChart3, Users, TrendingUp, Sparkles, Star, Link2, CalendarCheck }

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function getInsights(business, services, staff, todayBookings, allBookings, customers) {
  const insights = []
  const sym = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', INR: '₹' }[business?.currency] || '$'

  if (services.length === 0) {
    insights.push({ iconName: 'Lightbulb', text: 'Add your first service to start taking bookings.', type: 'setup' })
    return insights
  }

  const today = todayStr()
  const thisMonth = today.slice(0, 7)
  const lastMonthDate = new Date()
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
  const lastMonth = lastMonthDate.getFullYear() + '-' + String(lastMonthDate.getMonth() + 1).padStart(2, '0')

  const thisMonthBookings = allBookings.filter(b => b.date?.startsWith(thisMonth))
  const lastMonthBookings = allBookings.filter(b => b.date?.startsWith(lastMonth))
  const completedThisMonth = thisMonthBookings.filter(b => b.status === 'completed')
  const completedLastMonth = lastMonthBookings.filter(b => b.status === 'completed')

  const revenueThisMonth = completedThisMonth.reduce((s, b) => {
    const svc = services.find(sv => sv.id === b.service_id)
    return s + (svc?.price || 0)
  }, 0)
  const revenueLastMonth = completedLastMonth.reduce((s, b) => {
    const svc = services.find(sv => sv.id === b.service_id)
    return s + (svc?.price || 0)
  }, 0)

  if (revenueLastMonth > 0) {
    const change = ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(0)
    if (change > 0) {
      insights.push({ iconName: 'TrendingUp', text: `Revenue is up ${change}% this month (${sym}${revenueThisMonth.toLocaleString()} vs ${sym}${revenueLastMonth.toLocaleString()} last month). Keep it up!`, type: 'positive' })
    } else if (change < -10) {
      insights.push({ iconName: 'BarChart3', text: `Revenue is down ${Math.abs(change)}% this month. Consider running a promo code or sharing your booking link to attract more customers.`, type: 'warning' })
    }
  } else if (revenueThisMonth > 0) {
    insights.push({ iconName: 'Sparkles', text: `You've earned ${sym}${revenueThisMonth.toLocaleString()} this month from ${completedThisMonth.length} completed bookings!`, type: 'positive' })
  }

  const cancelled = allBookings.filter(b => b.status === 'cancelled')
  if (cancelled.length > 0 && allBookings.length > 5) {
    const noShowRate = (cancelled.length / allBookings.length * 100).toFixed(0)
    if (noShowRate > 15) {
      insights.push({ iconName: 'CalendarCheck', text: `Your cancellation rate is ${noShowRate}%. Consider enabling appointment reminders or requiring deposits to reduce no-shows.`, type: 'warning' })
    }
  }

  if (allBookings.length >= 5) {
    const hourCounts = {}
    allBookings.forEach(b => {
      if (b.time) {
        const h = parseInt(b.time.split(':')[0])
        hourCounts[h] = (hourCounts[h] || 0) + 1
      }
    })
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]
    if (peakHour) {
      const h = parseInt(peakHour[0])
      const ampm = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 || 12
      insights.push({ iconName: 'Star', text: `Peak booking hour: ${h12}:00 ${ampm} with ${peakHour[1]} bookings. Consider adding more staff during this time.`, type: 'insight' })
    }
  }

  if (customers.length > 0 && allBookings.length > 3) {
    const customerBookings = {}
    allBookings.forEach(b => {
      if (b.customer_name) customerBookings[b.customer_name] = (customerBookings[b.customer_name] || 0) + 1
    })
    const repeats = Object.values(customerBookings).filter(c => c > 1).length
    const retentionRate = (repeats / customers.length * 100).toFixed(0)
    insights.push({ iconName: 'Users', text: `Customer retention: ${retentionRate}% of customers have booked more than once. ${retentionRate < 30 ? 'Enable the Loyalty Program to encourage repeat visits.' : 'Great retention rate!'}`, type: retentionRate >= 30 ? 'positive' : 'insight' })
  }

  if (services.length > 1 && allBookings.length > 3) {
    const svcCounts = {}
    allBookings.forEach(b => {
      const name = b.service_name || services.find(s => s.id === b.service_id)?.name || 'Unknown'
      svcCounts[name] = (svcCounts[name] || 0) + 1
    })
    const sorted = Object.entries(svcCounts).sort((a, b) => b[1] - a[1])
    if (sorted.length > 0) {
      insights.push({ iconName: 'Star', text: `"${sorted[0][0]}" is your most popular service with ${sorted[0][1]} bookings. Feature it on your booking page.`, type: 'insight' })
    }
  }

  if (staff.length === 0) {
    insights.push({ iconName: 'Users', text: 'Add team members so clients can book with their preferred staff.', type: 'setup' })
  }

  if (todayBookings.length === 0 && services.length > 0) {
    insights.push({ iconName: 'Link2', text: 'Share your booking link with customers to start receiving online appointments.', type: 'setup' })
  } else if (todayBookings.length > 0) {
    const confirmed = todayBookings.filter(b => b.status === 'confirmed').length
    if (confirmed > 0) {
      insights.push({ iconName: 'CalendarCheck', text: `You have ${confirmed} confirmed booking${confirmed > 1 ? 's' : ''} today. Stay on top of your schedule!`, type: 'positive' })
    }
  }

  return insights.slice(0, 5)
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
  const insights = getInsights(business, services, staff, todayBookings, allBookings, customers)

  const sym = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', INR: '₹' }[business?.currency] || '$'
  const monthRevenue = allBookings
    .filter(b => b.status === 'completed' && b.date?.startsWith(todayStr().slice(0, 7)))
    .reduce((s, b) => {
      const svc = services.find(sv => sv.id === b.service_id)
      return s + (svc?.price || 0)
    }, 0)

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
          <div className="stat-card-icon" style={{ color: 'var(--green)' }}><DollarSign size={22} /></div>
          <div className="stat-card-label">Revenue This Month</div>
          <div className="stat-card-value">{sym}{monthRevenue.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--accent-bright)' }}><CalendarCheck size={22} /></div>
          <div className="stat-card-label">Today's Bookings</div>
          <div className="stat-card-value">{todayBookings.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--purple)' }}><UserRound size={22} /></div>
          <div className="stat-card-label">Total Customers</div>
          <div className="stat-card-value">{customers.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--amber)' }}><TrendingUp size={22} /></div>
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
          const typeColor = { positive: 'var(--green)', warning: 'var(--amber)', insight: 'var(--accent-bright)', setup: 'var(--text-muted)' }[insight.type] || 'var(--accent-bright)'
          return (
            <div key={i} className="ai-insight">
              <span style={{ color: typeColor }}>{IconComponent ? <IconComponent size={18} /> : null}</span>
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
