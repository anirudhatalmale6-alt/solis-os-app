import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { store } from '../lib/store'

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function getNext14Days() {
  const days = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push({
      dateStr: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      monthName: d.toLocaleDateString('en-US', { month: 'short' }),
    })
  }
  return days
}

function generateTimeSlots(openTime, closeTime, durationMin) {
  const slots = []
  const [openH, openM] = openTime.split(':').map(Number)
  const [closeH, closeM] = closeTime.split(':').map(Number)
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM

  let current = openMinutes
  while (current + durationMin <= closeMinutes) {
    const h = Math.floor(current / 60)
    const m = current % 60
    slots.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'))
    current += durationMin
  }
  return slots
}

function isSlotTaken(slot, durationMin, existingBookings) {
  const [slotH, slotM] = slot.split(':').map(Number)
  const slotStart = slotH * 60 + slotM
  const slotEnd = slotStart + durationMin

  for (const b of existingBookings) {
    if (b.status === 'cancelled') continue
    const [bH, bM] = (b.time || '00:00').split(':').map(Number)
    const bStart = bH * 60 + bM
    const bEnd = bStart + (b.duration || 30)
    if (slotStart < bEnd && slotEnd > bStart) return true
  }
  return false
}

function formatTime12(time24) {
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function BookingPublicPage() {
  const { businessId } = useParams()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [schedule, setSchedule] = useState(null)
  const [notFound, setNotFound] = useState(false)

  // Multi-step state
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [booked, setBooked] = useState(false)

  const dates = getNext14Days()

  useEffect(() => {
    const biz = store.getBusinessById(businessId)
    if (!biz) {
      setNotFound(true)
      return
    }
    setBusiness(biz)
    setServices(store.getServices(businessId).filter(s => s.is_active !== false))
    setSchedule(store.getSchedule(businessId))
  }, [businessId])

  if (notFound) {
    return (
      <div className="public-booking">
        <div className="public-booking-card">
          <div className="booking-success">
            <div className="booking-success-icon">😕</div>
            <h2>Business not found</h2>
            <p>This booking link doesn't seem to be valid.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!business) return null

  // Get available time slots for selected date
  let timeSlots = []
  let dayBookings = []
  if (selectedDate && selectedService && schedule) {
    const d = new Date(selectedDate + 'T00:00:00')
    const dayKey = DAYS_OF_WEEK[d.getDay()]
    const daySchedule = schedule[dayKey]
    if (daySchedule && daySchedule.enabled) {
      timeSlots = generateTimeSlots(daySchedule.open, daySchedule.close, selectedService.duration || 30)
      dayBookings = store.getBookingsByDate(businessId, selectedDate)
    }
  }

  const handleSelectService = (svc) => {
    setSelectedService(svc)
    setSelectedDate(null)
    setSelectedTime(null)
    setStep(2)
  }

  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr)
    setSelectedTime(null)
  }

  const handleSelectTime = (time) => {
    setSelectedTime(time)
    setStep(3)
  }

  const handleSubmitDetails = (e) => {
    e.preventDefault()
    if (!customerName || !customerPhone) return
    setStep(4)
  }

  const handleConfirm = () => {
    store.addBooking({
      business_id: businessId,
      service_id: selectedService.id,
      service_name: selectedService.name,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      date: selectedDate,
      time: selectedTime,
      duration: selectedService.duration || 30,
      notes: '',
    })
    setBooked(true)
  }

  // Check if a date is available (business is open that day)
  const isDateAvailable = (dateStr) => {
    if (!schedule) return false
    const d = new Date(dateStr + 'T00:00:00')
    const dayKey = DAYS_OF_WEEK[d.getDay()]
    return schedule[dayKey] && schedule[dayKey].enabled
  }

  const formatSelectedDate = () => {
    if (!selectedDate) return ''
    const d = new Date(selectedDate + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  if (booked) {
    return (
      <div className="public-booking">
        <div className="public-booking-card">
          <div className="booking-success">
            <div className="booking-success-icon">✅</div>
            <h2>Booking Confirmed!</h2>
            <p>Your appointment has been booked successfully.</p>
            <div className="booking-summary" style={{ marginTop: '24px', textAlign: 'left' }}>
              <div className="booking-summary-row">
                <span className="label">Service</span>
                <span>{selectedService.name}</span>
              </div>
              <div className="booking-summary-row">
                <span className="label">Date</span>
                <span>{formatSelectedDate()}</span>
              </div>
              <div className="booking-summary-row">
                <span className="label">Time</span>
                <span>{formatTime12(selectedTime)}</span>
              </div>
              <div className="booking-summary-row">
                <span className="label">Duration</span>
                <span>{selectedService.duration || 30} min</span>
              </div>
              <div className="booking-summary-row">
                <span className="label">Price</span>
                <span>${selectedService.price}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="public-booking">
      <div className="public-booking-card">
        <div className="public-booking-header">
          <h1>Book with {business.name}</h1>
          <p>{business.industry ? business.industry.charAt(0).toUpperCase() + business.industry.slice(1) : ''}</p>
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div>
            <div className="card-title" style={{ marginBottom: '16px' }}>Select a Service</div>
            {services.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🛠</div>
                <div className="empty-state-title">No services available</div>
                <div className="empty-state-text">This business hasn't added any services yet.</div>
              </div>
            ) : (
              services.map(svc => (
                <div
                  key={svc.id}
                  className={`service-select-card ${selectedService?.id === svc.id ? 'selected' : ''}`}
                  onClick={() => handleSelectService(svc)}
                >
                  <h3>{svc.name}</h3>
                  <div className="meta">${svc.price} · {svc.duration || 30} min</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Step 2: Select Date & Time */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ paddingLeft: 0 }}>
                &lsaquo; Back
              </button>
            </div>
            <div className="card-title" style={{ marginBottom: '16px' }}>Select Date & Time</div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {selectedService.name} · {selectedService.duration || 30} min
            </p>

            <div className="date-chips">
              {dates.map(d => (
                <div
                  key={d.dateStr}
                  className={`date-chip ${selectedDate === d.dateStr ? 'selected' : ''} ${!isDateAvailable(d.dateStr) ? 'unavailable' : ''}`}
                  onClick={() => isDateAvailable(d.dateStr) && handleSelectDate(d.dateStr)}
                  style={!isDateAvailable(d.dateStr) ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                >
                  <div style={{ fontSize: '11px', color: selectedDate === d.dateStr ? 'var(--accent-bright)' : 'var(--text-muted)' }}>{d.dayName}</div>
                  <div style={{ fontWeight: 600 }}>{d.dayNum}</div>
                  <div style={{ fontSize: '11px', color: selectedDate === d.dateStr ? 'var(--accent-bright)' : 'var(--text-muted)' }}>{d.monthName}</div>
                </div>
              ))}
            </div>

            {selectedDate && (
              <>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px', marginTop: '8px' }}>
                  Available Times
                </div>
                {timeSlots.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No available time slots for this date.</p>
                ) : (
                  <div className="time-slots">
                    {timeSlots.map(slot => {
                      const taken = isSlotTaken(slot, selectedService.duration || 30, dayBookings)
                      return (
                        <div
                          key={slot}
                          className={`time-slot ${selectedTime === slot ? 'selected' : ''} ${taken ? 'unavailable' : ''}`}
                          onClick={() => !taken && handleSelectTime(slot)}
                        >
                          {formatTime12(slot)}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: Your Details */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)} style={{ paddingLeft: 0 }}>
                &lsaquo; Back
              </button>
            </div>
            <div className="card-title" style={{ marginBottom: '16px' }}>Your Details</div>
            <form onSubmit={handleSubmitDetails}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Your full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Your phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email (optional)</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="your@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                Continue
              </button>
            </form>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <button className="btn btn-ghost" onClick={() => setStep(3)} style={{ paddingLeft: 0 }}>
                &lsaquo; Back
              </button>
            </div>
            <div className="card-title" style={{ marginBottom: '16px' }}>Confirm Booking</div>
            <div className="booking-summary">
              <div className="booking-summary-row">
                <span className="label">Service</span>
                <span>{selectedService.name}</span>
              </div>
              <div className="booking-summary-row">
                <span className="label">Date</span>
                <span>{formatSelectedDate()}</span>
              </div>
              <div className="booking-summary-row">
                <span className="label">Time</span>
                <span>{formatTime12(selectedTime)}</span>
              </div>
              <div className="booking-summary-row">
                <span className="label">Duration</span>
                <span>{selectedService.duration || 30} min</span>
              </div>
              <div className="booking-summary-row" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
                <span className="label" style={{ fontWeight: 600, color: 'var(--text)' }}>Price</span>
                <span style={{ fontWeight: 600 }}>${selectedService.price}</span>
              </div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {customerName} · {customerPhone}
              {customerEmail ? ` · ${customerEmail}` : ''}
            </div>
            <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={handleConfirm}>
              Confirm Booking
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
