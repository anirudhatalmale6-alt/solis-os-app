import { useEffect, useState, useMemo } from 'react'
import { Clock, UserPlus, X, Plus, Bell, BellRing, CheckCircle2, XCircle, Crown, ArrowUpCircle, ChevronDown, ChevronUp, ListOrdered, Timer, Trash2, CalendarCheck } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { syncedSet } from '../lib/cloudSync'

function uid() {
  try { return crypto.randomUUID() } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatDuration(ms) {
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`
}

const DEFAULT_SETTINGS = {
  max_size: 20,
  auto_expire_hours: 48,
  auto_notify: false,
  notification_template: 'Hi {name}, a slot has opened up for {service} on {date}. Please contact us to confirm your booking.',
}

const PRIORITY_ORDER = { vip: 0, high: 1, normal: 2 }

export default function WaitlistPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [entries, setEntries] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    service_id: '',
    staff_id: '',
    preferred_date: '',
    notes: '',
    priority: 'normal',
  })

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        setServices(await dataStore.getServices(biz.id))
        setStaff(await dataStore.getStaff(biz.id))
        const storedEntries = localStorage.getItem(`waitlist_${biz.id}`)
        if (storedEntries) setEntries(JSON.parse(storedEntries))
        const storedSettings = localStorage.getItem(`waitlist_settings_${biz.id}`)
        if (storedSettings) setSettings(JSON.parse(storedSettings))
      }
    }
    load()
  }, [user])

  useEffect(() => {
    if (!business) return
    const now = Date.now()
    const expireMs = settings.auto_expire_hours * 3600000
    let changed = false
    const updated = entries.map(e => {
      if (e.status === 'waiting' || e.status === 'notified') {
        if (now - new Date(e.created_at).getTime() > expireMs) {
          changed = true
          return { ...e, status: 'expired' }
        }
      }
      return e
    })
    if (changed) saveEntries(updated)
  }, [entries, settings.auto_expire_hours, business])

  const saveEntries = (updated) => {
    setEntries(updated)
    if (business) {
      localStorage.setItem(`waitlist_${business.id}`, JSON.stringify(updated))
      syncedSet(business.id, 'waitlist', updated)
    }
  }

  const saveSettings = (updated) => {
    setSettings(updated)
    if (business) {
      localStorage.setItem(`waitlist_settings_${business.id}`, JSON.stringify(updated))
      syncedSet(business.id, 'waitlist_settings', updated)
    }
  }

  const activeEntries = useMemo(() => {
    return entries
      .filter(e => e.status === 'waiting' || e.status === 'notified')
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 2
        const pb = PRIORITY_ORDER[b.priority] ?? 2
        if (pa !== pb) return pa - pb
        return new Date(a.created_at) - new Date(b.created_at)
      })
  }, [entries])

  const historyEntries = useMemo(() => {
    return entries
      .filter(e => e.status === 'converted' || e.status === 'removed' || e.status === 'expired')
      .sort((a, b) => new Date(b.converted_at || b.created_at) - new Date(a.converted_at || a.created_at))
  }, [entries])

  const stats = useMemo(() => {
    const today = new Date().toDateString()
    const waiting = activeEntries.length
    const servedToday = entries.filter(e => e.status === 'converted' && e.converted_at && new Date(e.converted_at).toDateString() === today).length
    const convertedEntries = entries.filter(e => e.status === 'converted')
    const completedEntries = entries.filter(e => e.status === 'converted' || e.status === 'removed' || e.status === 'expired')
    const conversionRate = completedEntries.length > 0 ? Math.round((convertedEntries.length / completedEntries.length) * 100) : 0
    const waitTimes = convertedEntries
      .filter(e => e.converted_at && e.created_at)
      .map(e => new Date(e.converted_at).getTime() - new Date(e.created_at).getTime())
    const avgWait = waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0
    return { waiting, servedToday, avgWait, conversionRate }
  }, [entries, activeEntries])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.customer_name.trim()) return
    if (activeEntries.length >= settings.max_size) return
    const entry = {
      id: uid(),
      customer_name: formData.customer_name.trim(),
      customer_phone: formData.customer_phone.trim(),
      customer_email: formData.customer_email.trim(),
      service_id: formData.service_id,
      staff_id: formData.staff_id,
      preferred_date: formData.preferred_date,
      notes: formData.notes.trim(),
      priority: formData.priority,
      status: 'waiting',
      notified_at: null,
      converted_at: null,
      created_at: new Date().toISOString(),
    }
    saveEntries([...entries, entry])
    setFormData({ customer_name: '', customer_phone: '', customer_email: '', service_id: '', staff_id: '', preferred_date: '', notes: '', priority: 'normal' })
    setShowForm(false)
  }

  const notifyEntry = (id) => {
    saveEntries(entries.map(e => e.id === id ? { ...e, status: 'notified', notified_at: new Date().toISOString() } : e))
  }

  const convertEntry = (id) => {
    saveEntries(entries.map(e => e.id === id ? { ...e, status: 'converted', converted_at: new Date().toISOString() } : e))
  }

  const removeEntry = (id) => {
    saveEntries(entries.map(e => e.id === id ? { ...e, status: 'removed', converted_at: new Date().toISOString() } : e))
  }

  const getServiceName = (id) => {
    const s = services.find(sv => sv.id === id)
    return s ? s.name : '—'
  }

  const getStaffName = (id) => {
    const s = staff.find(st => st.id === id)
    return s ? s.name : '—'
  }

  const priorityBadge = (priority) => {
    if (priority === 'vip') return (
      <span className="badge" style={{ background: 'var(--purple)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Crown size={12} /> VIP
      </span>
    )
    if (priority === 'high') return (
      <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <ArrowUpCircle size={12} /> High
      </span>
    )
    return <span className="badge" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>Normal</span>
  }

  const statusBadge = (status) => {
    if (status === 'converted') return <span className="badge badge-green">Converted</span>
    if (status === 'removed') return <span className="badge badge-rose">Removed</span>
    if (status === 'expired') return <span className="badge" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>Expired</span>
    return null
  }

  if (!business) return null

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ListOrdered size={28} style={{ color: 'var(--accent)' }} />
            Waitlist
          </h1>
          <p className="page-subtitle">Manage customers waiting for available appointment slots</p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          disabled={activeEntries.length >= settings.max_size}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add to Waitlist'}
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--accent)' }}>
            <Clock size={22} />
          </div>
          <div className="stat-card-label">Currently Waiting</div>
          <div className="stat-card-value">{stats.waiting}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--green)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-card-label">Served Today</div>
          <div className="stat-card-value">{stats.servedToday}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--amber)' }}>
            <Timer size={22} />
          </div>
          <div className="stat-card-label">Avg Wait Time</div>
          <div className="stat-card-value">{stats.avgWait > 0 ? formatDuration(stats.avgWait) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--purple)' }}>
            <CalendarCheck size={22} />
          </div>
          <div className="stat-card-label">Conversion Rate</div>
          <div className="stat-card-value">{stats.conversionRate}%</div>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <UserPlus size={20} style={{ color: 'var(--accent)' }} />
            Add to Waitlist
          </h2>
          {activeEntries.length >= settings.max_size && (
            <div style={{ padding: '12px 16px', background: 'rgba(var(--rose-rgb, 239,68,68), 0.1)', border: '1px solid var(--rose)', borderRadius: 8, marginBottom: 16, color: 'var(--rose)', fontSize: 14 }}>
              Waitlist is full ({settings.max_size} max). Remove an entry before adding new ones.
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Customer Name *</label>
                <input
                  className="form-input"
                  value={formData.customer_name}
                  onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  className="form-input"
                  value={formData.customer_phone}
                  onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
                  placeholder="Phone number"
                  type="tel"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  value={formData.customer_email}
                  onChange={e => setFormData({ ...formData, customer_email: e.target.value })}
                  placeholder="Email address"
                  type="email"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Requested Service</label>
                <select
                  className="form-select"
                  value={formData.service_id}
                  onChange={e => setFormData({ ...formData, service_id: e.target.value })}
                >
                  <option value="">Select service</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Staff</label>
                <select
                  className="form-select"
                  value={formData.staff_id}
                  onChange={e => setFormData({ ...formData, staff_id: e.target.value })}
                >
                  <option value="">Any available</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Date</label>
                <input
                  className="form-input"
                  value={formData.preferred_date}
                  onChange={e => setFormData({ ...formData, preferred_date: e.target.value })}
                  type="date"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any special requests or notes..."
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!formData.customer_name.trim() || activeEntries.length >= settings.max_size}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <UserPlus size={16} />
                Add to Waitlist
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Clock size={20} style={{ color: 'var(--accent)' }} />
          Active Waitlist
          <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
            ({activeEntries.length}/{settings.max_size})
          </span>
        </h2>

        {activeEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <ListOrdered size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 15 }}>No one on the waitlist right now</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Add customers when appointment slots are full</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeEntries.map((entry, idx) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text)' }}>{entry.customer_name}</div>
                      {entry.customer_phone && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{entry.customer_phone}</div>}
                      {entry.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.notes}</div>}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{entry.service_id ? getServiceName(entry.service_id) : '—'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{entry.staff_id ? getStaffName(entry.staff_id) : 'Any'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{entry.preferred_date || '—'}</td>
                    <td style={{ padding: '12px' }}>{priorityBadge(entry.priority)}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                          {timeAgo(entry.created_at)}
                        </span>
                        {entry.status === 'notified' && entry.notified_at && (
                          <span style={{ fontSize: 12, color: 'var(--accent-bright)', display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 6 }}>
                            <BellRing size={12} />
                            Notified {timeAgo(entry.notified_at)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        {entry.status !== 'notified' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => notifyEntry(entry.id)}
                            title="Notify customer"
                            style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Bell size={14} style={{ color: 'var(--accent)' }} />
                          </button>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => convertEntry(entry.id)}
                          title="Convert to booking"
                          style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <CheckCircle2 size={14} style={{ color: 'var(--green)' }} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeEntry(entry.id)}
                          title="Remove from waitlist"
                          style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Trash2 size={14} style={{ color: 'var(--rose)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: 0,
            color: 'var(--text)',
          }}
        >
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <XCircle size={20} style={{ color: 'var(--text-muted)' }} />
            Waitlist History
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
              ({historyEntries.length})
            </span>
          </h2>
          {showHistory ? <ChevronUp size={20} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />}
        </button>

        {showHistory && (
          <div style={{ marginTop: 16 }}>
            {historyEntries.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: 14 }}>No history yet</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wait Time</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyEntries.map(entry => {
                      const waitMs = entry.converted_at && entry.created_at
                        ? new Date(entry.converted_at).getTime() - new Date(entry.created_at).getTime()
                        : 0
                      return (
                        <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 500, color: 'var(--text)' }}>{entry.customer_name}</div>
                            {entry.customer_phone && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{entry.customer_phone}</div>}
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{entry.service_id ? getServiceName(entry.service_id) : '—'}</td>
                          <td style={{ padding: '12px' }}>{priorityBadge(entry.priority)}</td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{waitMs > 0 ? formatDuration(waitMs) : '—'}</td>
                          <td style={{ padding: '12px' }}>{statusBadge(entry.status)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ArrowUpCircle size={20} style={{ color: 'var(--text-muted)' }} />
          Waitlist Settings
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Max Waitlist Size</label>
            <input
              className="form-input"
              type="number"
              min={1}
              max={100}
              value={settings.max_size}
              onChange={e => saveSettings({ ...settings, max_size: parseInt(e.target.value) || 20 })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Auto-Expire After (hours)</label>
            <input
              className="form-input"
              type="number"
              min={1}
              max={720}
              value={settings.auto_expire_hours}
              onChange={e => saveSettings({ ...settings, auto_expire_hours: parseInt(e.target.value) || 48 })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Auto-Notify When Slot Opens</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <button
                className={settings.auto_notify ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                onClick={() => saveSettings({ ...settings, auto_notify: !settings.auto_notify })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80, justifyContent: 'center' }}
              >
                {settings.auto_notify ? <BellRing size={14} /> : <Bell size={14} />}
                {settings.auto_notify ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label">Notification Message Template</label>
          <textarea
            className="form-input"
            value={settings.notification_template}
            onChange={e => saveSettings({ ...settings, notification_template: e.target.value })}
            rows={3}
            style={{ resize: 'vertical', fontSize: 13, lineHeight: 1.5 }}
            placeholder="Use {name}, {service}, {date} as placeholders..."
          />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Available placeholders: {'{name}'}, {'{service}'}, {'{date}'}
          </div>
        </div>
      </div>
    </div>
  )
}
