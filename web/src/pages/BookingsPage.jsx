import { useEffect, useState } from 'react'
import { CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
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

export default function BookingsPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [bookings, setBookings] = useState([])

  const loadData = async () => {
    if (!user) return
    const biz = await dataStore.getBusiness(user.id)
    if (biz) {
      setBusiness(biz)
      const dayBookings = await dataStore.getBookingsByDate(biz.id, selectedDate)
      setBookings(dayBookings.sort((a, b) => (a.time || '').localeCompare(b.time || '')))
    }
  }

  useEffect(() => { loadData() }, [user, selectedDate])

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
      <div className="page-header">
        <h1 className="page-title">Bookings</h1>
        <p className="page-subtitle">Manage your appointments</p>
      </div>

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
            <div className="booking-card-time">{booking.time}</div>
            <div className="booking-card-info">
              <div className="booking-card-service">{booking.service_name}</div>
              <div className="booking-card-customer">
                {booking.customer_name}
                {booking.customer_phone ? ` · ${booking.customer_phone}` : ''}
              </div>
            </div>
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
