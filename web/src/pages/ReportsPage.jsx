import { useEffect, useState, useMemo } from 'react'
import {
  FileBarChart, DollarSign, TrendingUp, Users, Clock,
  Download, Calendar, ArrowUpRight, ArrowDownRight,
  Star, Award, UserCheck, Repeat,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'

/* ── helpers ── */

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

function getFullMonthLabel(ym) {
  const [y, m] = ym.split('-')
  const d = new Date(parseInt(y), parseInt(m) - 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function startOfWeek() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return monday.getFullYear() + '-' + String(monday.getMonth() + 1).padStart(2, '0') + '-' + String(monday.getDate()).padStart(2, '0')
}

function monthsAgo(n) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function startOfYear() {
  const d = new Date()
  return d.getFullYear() + '-01-01'
}

/* ── component ── */

export default function ReportsPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [allBookings, setAllBookings] = useState([])
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
        setAllBookings(b)
        setServices(s)
        setCustomers(c)
        setStaff(st)
      }
    }
    load()
  }, [user])

  /* ── currency ── */
  const curr = business?.currency || 'USD'
  const sym = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', INR: '₹' }[curr] || '$'

  /* ── period filter ── */
  const cutoffDate = useMemo(() => {
    if (period === 'week') return startOfWeek()
    if (period === 'month') return monthStr(0) + '-01'
    if (period === '3months') return monthsAgo(3)
    if (period === 'year') return startOfYear()
    return null // all time
  }, [period])

  const bookings = useMemo(() => {
    if (!cutoffDate) return allBookings
    return allBookings.filter(b => b.date >= cutoffDate)
  }, [allBookings, cutoffDate])

  /* ── service price lookup ── */
  const svcPrice = (b) => {
    if (b.price) return b.price
    const svc = services.find(s => s.id === b.service_id)
    return svc?.price || 0
  }

  const svcName = (b) => b.service_name || services.find(s => s.id === b.service_id)?.name || 'Unknown'

  /* ── key metrics ── */
  const completed = bookings.filter(b => b.status === 'completed')
  const totalRevenue = completed.reduce((sum, b) => sum + svcPrice(b), 0)
  const avgPerBooking = completed.length > 0 ? totalRevenue / completed.length : 0

  // New customers: unique customer names that appear for the first time within the period
  const newCustomerCount = useMemo(() => {
    if (!cutoffDate) return customers.length
    const namesBeforePeriod = new Set()
    allBookings.forEach(b => {
      if (b.date < cutoffDate && b.customer_name) namesBeforePeriod.add(b.customer_name.toLowerCase())
    })
    const newNames = new Set()
    bookings.forEach(b => {
      if (b.customer_name) {
        const lower = b.customer_name.toLowerCase()
        if (!namesBeforePeriod.has(lower)) newNames.add(lower)
      }
    })
    return newNames.size
  }, [bookings, allBookings, cutoffDate, customers])

  // Previous period comparison for total revenue
  const prevPeriodRevenue = useMemo(() => {
    if (!cutoffDate || period === 'all') return null
    const today = todayStr()
    const periodLen = new Date(today).getTime() - new Date(cutoffDate).getTime()
    const prevStart = new Date(new Date(cutoffDate).getTime() - periodLen)
    const prevStartStr = prevStart.getFullYear() + '-' + String(prevStart.getMonth() + 1).padStart(2, '0') + '-' + String(prevStart.getDate()).padStart(2, '0')
    const prevCompleted = allBookings.filter(b => b.status === 'completed' && b.date >= prevStartStr && b.date < cutoffDate)
    return prevCompleted.reduce((sum, b) => sum + svcPrice(b), 0)
  }, [allBookings, cutoffDate, period])

  const revenueChangePercent = prevPeriodRevenue !== null && prevPeriodRevenue > 0
    ? ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue * 100).toFixed(0)
    : null

  /* ── revenue chart (last 6 months) ── */
  const monthlyRevenue = useMemo(() => {
    const data = []
    for (let i = 5; i >= 0; i--) {
      const ym = monthStr(-i)
      const mc = allBookings.filter(b => b.status === 'completed' && b.date?.startsWith(ym))
      data.push({
        label: getMonthLabel(ym),
        fullLabel: getFullMonthLabel(ym),
        revenue: mc.reduce((sum, b) => sum + svcPrice(b), 0),
      })
    }
    return data
  }, [allBookings, services])

  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1)

  /* ── top services table ── */
  const topServicesData = useMemo(() => {
    const svcMap = {}
    completed.forEach(b => {
      const name = svcName(b)
      if (!svcMap[name]) svcMap[name] = { name, count: 0, revenue: 0 }
      svcMap[name].count += 1
      svcMap[name].revenue += svcPrice(b)
    })
    const total = Object.values(svcMap).reduce((s, v) => s + v.revenue, 0)
    return Object.values(svcMap)
      .sort((a, b) => b.revenue - a.revenue)
      .map((s, i) => ({ ...s, rank: i + 1, pct: total > 0 ? (s.revenue / total * 100).toFixed(1) : 0 }))
  }, [completed, services])

  /* ── peak hours heatmap ── */
  const peakHoursGrid = useMemo(() => {
    const slots = {
      'Morning (6-9)': { range: [6, 7, 8], count: 0 },
      'Mid-Morning (9-12)': { range: [9, 10, 11], count: 0 },
      'Afternoon (12-3)': { range: [12, 13, 14], count: 0 },
      'Mid-Afternoon (3-6)': { range: [15, 16, 17], count: 0 },
      'Evening (6-9)': { range: [18, 19, 20], count: 0 },
      'Night (9-12)': { range: [21, 22, 23], count: 0 },
    }
    bookings.forEach(b => {
      if (!b.time) return
      const h = parseInt(b.time.split(':')[0])
      for (const key of Object.keys(slots)) {
        if (slots[key].range.includes(h)) {
          slots[key].count += 1
          break
        }
      }
    })
    const maxCount = Math.max(...Object.values(slots).map(s => s.count), 1)
    return Object.entries(slots).map(([label, { count }]) => ({
      label,
      count,
      intensity: count / maxCount,
    }))
  }, [bookings])

  /* ── customer metrics ── */
  const customerMetrics = useMemo(() => {
    const customerBookingCounts = {}
    bookings.forEach(b => {
      if (b.customer_name) {
        const key = b.customer_name.toLowerCase()
        customerBookingCounts[key] = (customerBookingCounts[key] || 0) + 1
      }
    })
    const uniqueCustomers = Object.keys(customerBookingCounts)
    const returning = uniqueCustomers.filter(c => customerBookingCounts[c] > 1).length
    const newOnly = uniqueCustomers.length - returning
    const totalVisits = Object.values(customerBookingCounts).reduce((s, v) => s + v, 0)
    const avgFrequency = uniqueCustomers.length > 0 ? (totalVisits / uniqueCustomers.length).toFixed(1) : '0.0'

    // Top customers by spend (using completed bookings)
    const customerSpend = {}
    completed.forEach(b => {
      if (b.customer_name) {
        const key = b.customer_name
        if (!customerSpend[key]) customerSpend[key] = { name: key, spend: 0, visits: 0 }
        customerSpend[key].spend += svcPrice(b)
        customerSpend[key].visits += 1
      }
    })
    const topCustomers = Object.values(customerSpend)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5)

    return { newOnly, returning, avgFrequency, topCustomers, total: uniqueCustomers.length }
  }, [bookings, completed, services])

  /* ── staff performance ── */
  const staffPerformance = useMemo(() => {
    if (staff.length === 0) return []
    const staffBookings = {}
    staff.forEach(s => {
      staffBookings[s.id] = { name: s.name, role: s.role, bookings: 0, revenue: 0 }
    })
    // If bookings have staff_id, use it; otherwise distribute evenly as a fallback
    let hasStaffData = false
    completed.forEach(b => {
      if (b.staff_id && staffBookings[b.staff_id]) {
        staffBookings[b.staff_id].bookings += 1
        staffBookings[b.staff_id].revenue += svcPrice(b)
        hasStaffData = true
      }
    })
    if (!hasStaffData) return []
    const arr = Object.values(staffBookings).filter(s => s.bookings > 0)
    arr.sort((a, b) => b.bookings - a.bookings)
    return arr
  }, [staff, completed, services])

  const maxStaffBookings = staffPerformance.length > 0 ? staffPerformance[0].bookings : 1

  /* ── export handler ── */
  const handleExport = () => {
    console.log('Export report data:', {
      period,
      totalRevenue,
      completedBookings: completed.length,
      topServices: topServicesData,
      customerMetrics,
      staffPerformance,
    })
  }

  /* ── period options ── */
  const periods = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: '3months', label: 'Last 3 Months' },
    { key: 'year', label: 'This Year' },
    { key: 'all', label: 'All Time' },
  ]

  const hasData = allBookings.length > 0

  return (
    <>
      {/* ─── Header ─── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileBarChart size={28} style={{ color: 'var(--accent-bright)' }} />
            Reports
          </h1>
          <p className="page-subtitle">Comprehensive business performance overview</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* ─── Period Selector ─── */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Calendar size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginRight: '8px', fontWeight: 500 }}>Period:</span>
          {periods.map(p => (
            <button
              key={p.key}
              className={`btn btn-sm ${period === p.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod(p.key)}
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Key Metrics ─── */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <DollarSign size={22} style={{ color: 'var(--green)' }} />
          </div>
          <div className="stat-card-label">Total Revenue</div>
          <div className="stat-card-value">
            {sym}{totalRevenue.toLocaleString()}
            {revenueChangePercent !== null && (
              <span style={{
                fontSize: '13px', marginLeft: '8px',
                color: revenueChangePercent >= 0 ? 'var(--green)' : 'var(--rose)',
                display: 'inline-flex', alignItems: 'center', gap: '2px',
              }}>
                {revenueChangePercent >= 0
                  ? <ArrowUpRight size={14} />
                  : <ArrowDownRight size={14} />
                }
                {Math.abs(revenueChangePercent)}%
              </span>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(167,139,250,0.1)' }}>
            <TrendingUp size={22} style={{ color: 'var(--purple)' }} />
          </div>
          <div className="stat-card-label">Avg Per Booking</div>
          <div className="stat-card-value">{sym}{avgPerBooking.toFixed(0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <Clock size={22} style={{ color: 'var(--accent-bright)' }} />
          </div>
          <div className="stat-card-label">Bookings Completed</div>
          <div className="stat-card-value">{completed.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(45,212,191,0.1)' }}>
            <Users size={22} style={{ color: 'var(--teal)' }} />
          </div>
          <div className="stat-card-label">New Customers</div>
          <div className="stat-card-value">{newCustomerCount}</div>
        </div>
      </div>

      {!hasData ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><FileBarChart size={48} strokeWidth={1.5} /></div>
            <div className="empty-state-title">No report data yet</div>
            <div className="empty-state-text">
              Complete some bookings and your business reports will appear here with revenue charts, service rankings, and customer insights.
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ─── Revenue Chart ─── */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={18} style={{ color: 'var(--green)' }} />
                Revenue (Last 6 Months)
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', height: '220px', padding: '20px 0 0' }}>
              {monthlyRevenue.map((m, i) => {
                const barHeight = maxMonthlyRevenue > 0 ? Math.max((m.revenue / maxMonthlyRevenue) * 180, 4) : 4
                const isCurrentMonth = i === monthlyRevenue.length - 1
                const isMax = m.revenue === maxMonthlyRevenue && m.revenue > 0
                return (
                  <div key={i} style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '6px', height: '100%', justifyContent: 'flex-end', position: 'relative',
                  }}>
                    <div style={{
                      fontSize: '11px', fontWeight: 600, color: isCurrentMonth ? 'var(--green)' : 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                    }}>
                      {sym}{m.revenue.toLocaleString()}
                    </div>
                    <div style={{
                      width: '100%', maxWidth: '56px', borderRadius: '8px 8px 0 0',
                      height: `${barHeight}px`,
                      background: isCurrentMonth
                        ? 'linear-gradient(to top, var(--green), rgba(34,197,94,0.5))'
                        : isMax
                          ? 'linear-gradient(to top, var(--accent), rgba(99,102,241,0.6))'
                          : 'rgba(59,130,246,0.15)',
                      transition: 'height 0.8s cubic-bezier(0.16,1,0.3,1)',
                      position: 'relative',
                      boxShadow: isCurrentMonth ? '0 0 16px rgba(34,197,94,0.2)' : 'none',
                    }} />
                    <div style={{
                      fontSize: '12px', fontWeight: isCurrentMonth ? 600 : 400,
                      color: isCurrentMonth ? 'var(--text)' : 'var(--text-secondary)',
                    }}>
                      {m.label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* ─── Top Services Table ─── */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} style={{ color: 'var(--amber)' }} />
                  Top Services
                </span>
              </div>
              {topServicesData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No completed bookings yet
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '30px' }}>#</th>
                        <th>Service</th>
                        <th style={{ textAlign: 'right' }}>Bookings</th>
                        <th style={{ textAlign: 'right' }}>Revenue</th>
                        <th style={{ textAlign: 'right' }}>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topServicesData.map(s => (
                        <tr key={s.name}>
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: '24px', height: '24px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                              background: s.rank === 1 ? 'rgba(245,158,11,0.15)' : s.rank === 2 ? 'rgba(167,139,250,0.1)' : s.rank === 3 ? 'rgba(45,212,191,0.1)' : 'var(--bg-raised)',
                              color: s.rank === 1 ? 'var(--amber)' : s.rank === 2 ? 'var(--purple)' : s.rank === 3 ? 'var(--teal)' : 'var(--text-muted)',
                            }}>
                              {s.rank}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500 }}>{s.name}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{s.count}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                            {sym}{s.revenue.toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="badge badge-blue" style={{ fontSize: '11px' }}>{s.pct}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ─── Peak Hours Heatmap ─── */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} style={{ color: 'var(--amber)' }} />
                  Peak Hours
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {peakHoursGrid.map(slot => {
                  const alpha = slot.count > 0 ? Math.max(slot.intensity * 0.7, 0.08) : 0.03
                  const borderAlpha = slot.count > 0 ? Math.max(slot.intensity * 0.5, 0.1) : 0.06
                  const isHot = slot.intensity > 0.7 && slot.count > 0
                  return (
                    <div key={slot.label} style={{
                      padding: '16px 14px', borderRadius: 'var(--radius-sm)',
                      background: slot.count > 0
                        ? `rgba(245,158,11,${alpha})`
                        : 'var(--bg-raised)',
                      border: `1px solid rgba(245,158,11,${borderAlpha})`,
                      transition: 'all 0.3s',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      {isHot && (
                        <div style={{
                          position: 'absolute', top: '8px', right: '8px',
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: 'var(--amber)',
                          boxShadow: '0 0 8px var(--amber)',
                        }} />
                      )}
                      <div style={{
                        fontSize: '12px', fontWeight: 500,
                        color: slot.count > 0 ? 'var(--text)' : 'var(--text-muted)',
                        marginBottom: '6px',
                      }}>
                        {slot.label}
                      </div>
                      <div style={{
                        fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-display)',
                        color: isHot ? 'var(--amber)' : slot.count > 0 ? 'var(--text)' : 'var(--text-muted)',
                      }}>
                        {slot.count}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        booking{slot.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ─── Customer Metrics ─── */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: 'var(--teal)' }} />
                Customer Insights
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {/* New vs Returning */}
              <div style={{
                padding: '20px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-raised)', border: '1px solid var(--border)',
                textAlign: 'center',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
                  <UserCheck size={18} style={{ color: 'var(--green)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    New vs Returning
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, color: 'var(--green)' }}>
                      {customerMetrics.newOnly}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>New</div>
                  </div>
                  <div style={{ width: '1px', background: 'var(--border)' }} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, color: 'var(--purple)' }}>
                      {customerMetrics.returning}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Returning</div>
                  </div>
                </div>
                {/* Mini bar */}
                {customerMetrics.total > 0 && (
                  <div style={{
                    marginTop: '14px', height: '6px', borderRadius: '3px',
                    background: 'rgba(167,139,250,0.2)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: '3px',
                      width: `${(customerMetrics.returning / customerMetrics.total) * 100}%`,
                      background: 'linear-gradient(90deg, var(--purple), var(--teal))',
                      transition: 'width 0.6s',
                    }} />
                  </div>
                )}
              </div>

              {/* Avg Visit Frequency */}
              <div style={{
                padding: '20px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-raised)', border: '1px solid var(--border)',
                textAlign: 'center',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
                  <Repeat size={18} style={{ color: 'var(--accent-bright)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Avg Visits
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700 }}>
                  {customerMetrics.avgFrequency}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>visits per customer</div>
              </div>

              {/* Retention Rate */}
              <div style={{
                padding: '20px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-raised)', border: '1px solid var(--border)',
                textAlign: 'center',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
                  <Star size={18} style={{ color: 'var(--amber)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Retention Rate
                  </span>
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700,
                  color: customerMetrics.total > 0 && (customerMetrics.returning / customerMetrics.total) >= 0.3 ? 'var(--green)' : 'var(--text)',
                }}>
                  {customerMetrics.total > 0 ? ((customerMetrics.returning / customerMetrics.total) * 100).toFixed(0) : 0}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>repeat customers</div>
              </div>
            </div>

            {/* Top Customers by Spend */}
            {customerMetrics.topCustomers.length > 0 && (
              <>
                <div style={{
                  fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)',
                  marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <DollarSign size={14} /> Top Customers by Spend
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {customerMetrics.topCustomers.map((c, i) => {
                    const maxSpend = customerMetrics.topCustomers[0]?.spend || 1
                    return (
                      <div key={c.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%',
                              background: i === 0
                                ? 'linear-gradient(135deg, var(--amber), #fbbf24)'
                                : 'linear-gradient(135deg, var(--accent), var(--purple))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0,
                            }}>
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 500 }}>{c.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {c.visits} visit{c.visits !== 1 ? 's' : ''}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-display)', color: i === 0 ? 'var(--amber)' : 'var(--text)' }}>
                              {sym}{c.spend.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div style={{ height: '4px', borderRadius: '2px', background: 'var(--bg)' }}>
                          <div style={{
                            height: '100%', borderRadius: '2px',
                            width: `${(c.spend / maxSpend) * 100}%`,
                            background: i === 0
                              ? 'linear-gradient(90deg, var(--amber), #fbbf24)'
                              : 'linear-gradient(90deg, var(--accent), rgba(99,102,241,0.6))',
                            transition: 'width 0.6s',
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* ─── Staff Performance ─── */}
          {staffPerformance.length > 0 && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} style={{ color: 'var(--purple)' }} />
                  Staff Performance
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {staffPerformance.map((sp, i) => (
                  <div key={sp.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: 700, color: '#fff',
                          boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                        }}>
                          {sp.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500 }}>{sp.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sp.role}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                            {sp.bookings}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>bookings</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--green)' }}>
                            {sym}{sp.revenue.toLocaleString()}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>revenue</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-raised)' }}>
                      <div style={{
                        height: '100%', borderRadius: '3px',
                        width: `${(sp.bookings / maxStaffBookings) * 100}%`,
                        background: i === 0
                          ? 'linear-gradient(90deg, var(--accent), #6366f1)'
                          : 'rgba(59,130,246,0.3)',
                        transition: 'width 0.6s',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
