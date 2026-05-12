import { useEffect, useState } from 'react'
import {
  DollarSign, TrendingUp, CalendarCheck, Users,
  BarChart3, Clock, Star, ArrowUp, ArrowDown,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function monthStr(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

function getMonthLabel(ym) {
  const [y, m] = ym.split('-')
  const d = new Date(parseInt(y), parseInt(m) - 1)
  return d.toLocaleDateString('en-US', { month: 'short' })
}

function getDayOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function getHour(timeStr) {
  if (!timeStr) return 0
  return parseInt(timeStr.split(':')[0])
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [bookings, setBookings] = useState([])
  const [services, setServices] = useState([])
  const [customers, setCustomers] = useState([])
  const [staff, setStaff] = useState([])
  const [period, setPeriod] = useState('all')

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        const [b, s, c, st] = await Promise.all([
          dataStore.getBookings(biz.id),
          dataStore.getServices(biz.id),
          dataStore.getCustomers(biz.id),
          dataStore.getStaff(biz.id),
        ])
        setBookings(b)
        setServices(s)
        setCustomers(c)
        setStaff(st)
      }
    }
    load()
  }, [user])

  const today = todayStr()
  const thisMonth = monthStr(0)
  const lastMonth = monthStr(-1)

  const filtered = period === 'today'
    ? bookings.filter(b => b.date === today)
    : period === 'month'
      ? bookings.filter(b => b.date?.startsWith(thisMonth))
      : bookings

  const completed = filtered.filter(b => b.status === 'completed')
  const confirmed = filtered.filter(b => b.status === 'confirmed')
  const cancelled = filtered.filter(b => b.status === 'cancelled')

  const svcPrice = (b) => {
    if (b.price) return b.price
    const svc = services.find(s => s.id === b.service_id)
    return svc?.price || 0
  }

  const totalRevenue = completed.reduce((sum, b) => sum + svcPrice(b), 0)
  const avgBookingValue = completed.length > 0 ? totalRevenue / completed.length : 0

  const lastMonthBookings = bookings.filter(b => b.date?.startsWith(lastMonth))
  const lastMonthCompleted = lastMonthBookings.filter(b => b.status === 'completed')
  const lastMonthRevenue = lastMonthCompleted.reduce((sum, b) => sum + svcPrice(b), 0)

  const revenueChange = lastMonthRevenue > 0
    ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(0)
    : null

  const bookingChange = lastMonthBookings.length > 0
    ? ((filtered.length - lastMonthBookings.length) / lastMonthBookings.length * 100).toFixed(0)
    : null

  // Service popularity
  const svcCount = {}
  const svcRevenue = {}
  filtered.forEach(b => {
    const sid = b.service_id
    const name = b.service_name || services.find(s => s.id === sid)?.name || 'Unknown'
    svcCount[name] = (svcCount[name] || 0) + 1
    if (b.status === 'completed') {
      svcRevenue[name] = (svcRevenue[name] || 0) + svcPrice(b)
    }
  })
  const topServices = Object.entries(svcCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxSvcCount = topServices.length > 0 ? topServices[0][1] : 1

  // Busiest days
  const dayCount = {}
  filtered.forEach(b => {
    if (!b.date) return
    const day = getDayOfWeek(b.date)
    dayCount[day] = (dayCount[day] || 0) + 1
  })
  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const maxDayCount = Math.max(...dayOrder.map(d => dayCount[d] || 0), 1)

  // Busiest hours
  const hourCount = {}
  filtered.forEach(b => {
    const h = getHour(b.time)
    const label = h < 12 ? `${h || 12}AM` : `${h === 12 ? 12 : h - 12}PM`
    hourCount[label] = (hourCount[label] || 0) + 1
  })
  const topHours = Object.entries(hourCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  const maxHourCount = topHours.length > 0 ? topHours[0][1] : 1

  // Monthly trend (last 6 months)
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const ym = monthStr(-i)
    const mb = bookings.filter(b => b.date?.startsWith(ym))
    const mc = mb.filter(b => b.status === 'completed')
    monthlyData.push({
      label: getMonthLabel(ym),
      bookings: mb.length,
      revenue: mc.reduce((sum, b) => sum + svcPrice(b), 0),
    })
  }
  const maxMonthlyBookings = Math.max(...monthlyData.map(m => m.bookings), 1)
  const maxMonthlyRevenue = Math.max(...monthlyData.map(m => m.revenue), 1)

  // Completion rate
  const totalNonPending = completed.length + cancelled.length
  const completionRate = totalNonPending > 0 ? (completed.length / totalNonPending * 100).toFixed(0) : 100

  // Currency
  const curr = business?.currency || 'USD'
  const sym = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', INR: '₹' }[curr] || '$'

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Track your business performance and growth</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['today', 'month', 'all'].map(p => (
            <button
              key={p}
              className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod(p)}
              style={{ textTransform: 'capitalize' }}
            >
              {p === 'month' ? 'This Month' : p === 'all' ? 'All Time' : 'Today'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(34,197,94,0.1)' }}><DollarSign size={22} style={{ color: 'var(--green)' }} /></div>
          <div className="stat-card-label">Revenue</div>
          <div className="stat-card-value">
            {sym}{totalRevenue.toLocaleString()}
            {revenueChange !== null && period !== 'today' && (
              <span style={{ fontSize: '13px', marginLeft: '8px', color: revenueChange >= 0 ? 'var(--green)' : 'var(--rose)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                {revenueChange >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                {Math.abs(revenueChange)}%
              </span>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,0.1)' }}><CalendarCheck size={22} style={{ color: 'var(--accent-bright)' }} /></div>
          <div className="stat-card-label">Total Bookings</div>
          <div className="stat-card-value">
            {filtered.length}
            {bookingChange !== null && period !== 'today' && (
              <span style={{ fontSize: '13px', marginLeft: '8px', color: bookingChange >= 0 ? 'var(--green)' : 'var(--rose)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                {bookingChange >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                {Math.abs(bookingChange)}%
              </span>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(167,139,250,0.1)' }}><TrendingUp size={22} style={{ color: 'var(--purple)' }} /></div>
          <div className="stat-card-label">Avg Booking Value</div>
          <div className="stat-card-value">{sym}{avgBookingValue.toFixed(0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(45,212,191,0.1)' }}><Users size={22} style={{ color: 'var(--teal)' }} /></div>
          <div className="stat-card-label">Customers</div>
          <div className="stat-card-value">{customers.length}</div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-title">Monthly Trend</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '180px', padding: '16px 0 0' }}>
          {monthlyData.map((m, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.bookings}</div>
              <div style={{
                width: '100%', maxWidth: '48px', borderRadius: '6px 6px 0 0',
                background: i === monthlyData.length - 1 ? 'linear-gradient(to top, var(--accent), rgba(99,102,241,0.6))' : 'rgba(59,130,246,0.15)',
                height: `${Math.max((m.bookings / maxMonthlyBookings) * 140, 4)}px`,
                transition: 'height 0.6s cubic-bezier(0.16,1,0.3,1)',
              }} />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Top Services */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title"><span>Top Services</span></div>
          {topServices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>No booking data yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topServices.map(([name, count], i) => (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{name}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {count} booking{count !== 1 ? 's' : ''}
                      {svcRevenue[name] ? ` · ${sym}${svcRevenue[name].toLocaleString()}` : ''}
                    </span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-raised)' }}>
                    <div style={{
                      height: '100%', borderRadius: '3px',
                      width: `${(count / maxSvcCount) * 100}%`,
                      background: i === 0 ? 'linear-gradient(90deg, var(--accent), #6366f1)' : 'rgba(59,130,246,0.3)',
                      transition: 'width 0.6s',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Busiest Days */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title"><span>Busiest Days</span></div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '160px', padding: '0' }}>
            {dayOrder.map(day => {
              const count = dayCount[day] || 0
              const isMax = count === maxDayCount && count > 0
              return (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                  {count > 0 && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{count}</div>}
                  <div style={{
                    width: '100%', borderRadius: '6px 6px 0 0',
                    background: isMax ? 'linear-gradient(to top, var(--accent), rgba(99,102,241,0.6))' : 'rgba(59,130,246,0.15)',
                    height: count > 0 ? `${Math.max((count / maxDayCount) * 120, 4)}px` : '4px',
                  }} />
                  <div style={{ fontSize: '11px', color: isMax ? 'var(--accent-bright)' : 'var(--text-muted)', fontWeight: isMax ? 600 : 400 }}>{day}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Peak Hours */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title"><span>Peak Hours</span></div>
          {topHours.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>No booking data yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topHours.map(([hour, count]) => (
                <div key={hour}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{hour}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{count} booking{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-raised)' }}>
                    <div style={{
                      height: '100%', borderRadius: '3px', width: `${(count / maxHourCount) * 100}%`,
                      background: 'linear-gradient(90deg, var(--amber), #ef4444)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Booking Status */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title"><span>Booking Status</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)' }} />
              <span style={{ flex: 1, fontSize: '13px' }}>Completed</span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{completed.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-bright)' }} />
              <span style={{ flex: 1, fontSize: '13px' }}>Confirmed</span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{confirmed.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--rose)' }} />
              <span style={{ flex: 1, fontSize: '13px' }}>Cancelled</span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{cancelled.length}</span>
            </div>
            <div style={{ marginTop: '8px', padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-raised)', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{completionRate}%</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Completion Rate</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
