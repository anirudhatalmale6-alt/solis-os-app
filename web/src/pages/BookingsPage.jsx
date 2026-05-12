import { useEffect, useState } from 'react'
import { CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Plus, X, Repeat } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatTime12(time24) {
  if (!time24) return ''
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function BookingsPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [bookings, setBookings] = useState([])
  const [serviceMap, setServiceMap] = useState({})
  const [services, setServices] = useState([])
  const [customers, setCustomers] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [newService, setNewService] = useState('')
  const [newCustomer, setNewCustomer] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newDate, setNewDate] = useState(todayStr())
  const [newTime, setNewTime] = useState('10:00')
  const [recurring, setRecurring] = useState('none')
  const [recurringCount, setRecurringCount] = useState(4)

  const loadData = async () => {
    if (!user) return
    const biz = await dataStore.getBusiness(user.id)
    if (biz) {
      setBusiness(biz)
      const [dayBookings, svcs, custs] = await Promise.all([
        dataStore.getBookingsByDate(biz.id, selectedDate),
        dataStore.getServices(biz.id),
        dataStore.getCustomers(biz.id),
      ])
      const sMap = {}
      for (const s of svcs) sMap[s.id] = s.name
      setServiceMap(sMap)
      setServices(svcs)
      setCustomers(custs)
      setBookings(dayBookings.sort((a, b) => (a.time || '').localeCompare(b.time || '')))
    }
  }

  useEffect(() => { loadData() }, [user, selectedDate])

  const handleCreateBooking = async () => {
    if (!business || !newService || !newCustomer || !newDate || !newTime) return
    const svc = services.find(s => s.id === newService)
    const dates = [newDate]
    if (recurring !== 'none') {
      const intervalDays = recurring === 'weekly' ? 7 : recurring === 'biweekly' ? 14 : 30
      for (let i = 1; i < recurringCount; i++) {
        dates.push(shiftDate(newDate, intervalDays * i))
      }
    }
    for (const date of dates) {
      await dataStore.addBooking({
        business_id: business.id,
        service_id: newService,
        service_name: svc?.name || '',
        customer_name: newCustomer,
        customer_phone: newPhone,
        date,
        time: newTime,
        duration: svc?.duration || 30,
        recurring: recurring !== 'none' ? recurring : undefined,
      })
    }
    setShowNew(false)
    setNewService('')
    setNewCustomer('')
    setNewPhone('')
    setNewDate(todayStr())
    setNewTime('10:00')
    setRecurring('none')
    setRecurringCount(4)
    await loadData()
  }

  const handleComplete = async (id) => {
    await dataStore.updateBooking(id, { status: 'completed' })
    await loadData()
  }

  const handleCancel = async (id) => {
    await dataStore.cancelBooking(id)
    await loadData()
  }

  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length
  const totalCount = bookings.length

  const statusBadge = (status) => {
    const map = {
      confirmed: 'badge-green',
      cancelled: 'badge-rose',
      completed: 'badge-blue',
    }
    return map[status] || 'badge-blue'
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Bookings</h1>
          <p className="page-subtitle">Manage your appointments</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowNew(true); setNewDate(selectedDate) }}>
          <Plus size={18} /> New Booking
        </button>
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="modal-title" style={{ margin: 0 }}>New Booking</h3>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="form-group">
              <label className="form-label">Service</label>
              <select className="form-select" value={newService} onChange={e => setNewService(e.target.value)}>
                <option value="">Select a service...</option>
                {services.filter(s => s.is_active !== false).map(s => (
                  <option key={s.id} value={s.id}>{s.name} — ${s.price || 0}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Customer Name</label>
              <input className="form-input" value={newCustomer} onChange={e => setNewCustomer(e.target.value)} placeholder="Customer name"
                list="customer-list" />
              <datalist id="customer-list">
                {customers.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+1 555 123 4567" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Time</label>
                <input className="form-input" type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Repeat size={14} /> Recurring
              </label>
              <select className="form-select" value={recurring} onChange={e => setRecurring(e.target.value)}>
                <option value="none">One-time appointment</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {recurring !== 'none' && (
              <div className="form-group">
                <label className="form-label">Number of appointments</label>
                <select className="form-select" value={recurringCount} onChange={e => setRecurringCount(parseInt(e.target.value))}>
                  {[2, 3, 4, 6, 8, 12].map(n => (
                    <option key={n} value={n}>{n} appointments</option>
                  ))}
                </select>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Will create {recurringCount} bookings {recurring === 'weekly' ? 'every week' : recurring === 'biweekly' ? 'every 2 weeks' : 'every month'}
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateBooking}
                disabled={!newService || !newCustomer}>
                {recurring !== 'none' ? `Create ${recurringCount} Bookings` : 'Create Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon"><CalendarCheck size={22} /></div>
          <div className="stat-card-label">Today's Bookings</div>
          <div className="stat-card-value">{totalCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><CheckCircle2 size={22} /></div>
          <div className="stat-card-label">Confirmed</div>
          <div className="stat-card-value">{confirmedCount}</div>
        </div>
      </div>

      <div className="date-nav">
        <button className="date-nav-btn" onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}>
          <ChevronLeft size={18} />
        </button>
        <div className="date-nav-label">{formatDateLabel(selectedDate)}</div>
        <button className="date-nav-btn" onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}>
          <ChevronRight size={18} />
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><CalendarCheck size={48} strokeWidth={1.5} /></div>
            <div className="empty-state-title">No bookings for this date</div>
            <div className="empty-state-text">
              When customers book appointments, they'll appear here.
            </div>
          </div>
        </div>
      ) : (
        bookings.map(booking => (
          <div key={booking.id} className="booking-card">
            <div className="booking-card-time">{formatTime12(booking.time)}</div>
            <div className="booking-card-info">
              <div className="booking-card-service">{booking.service_name || serviceMap[booking.service_id] || 'Service'}</div>
              <div className="booking-card-customer">
                {booking.customer_name}
                {booking.customer_phone ? ` · ${booking.customer_phone}` : ''}
              </div>
            </div>
            {booking.recurring && (
              <span className="badge" style={{ background: 'rgba(167,139,250,0.1)', color: 'var(--purple)', fontSize: '11px', padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Repeat size={11} /> {booking.recurring}
              </span>
            )}
            <span className={`badge ${statusBadge(booking.status)}`}>
              {booking.status}
            </span>
            {booking.status === 'confirmed' && (
              <div className="booking-card-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => handleComplete(booking.id)}>
                  Complete
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleCancel(booking.id)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </>
  )
}
