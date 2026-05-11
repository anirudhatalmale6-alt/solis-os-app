import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { dataStore } from '../lib/dataStore'

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

const API_BASE = 'https://chatbot.veltrixtv.com'

export default function BookingPublicPage() {
  const { businessId } = useParams()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [schedule, setSchedule] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')

  // Multi-step state
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [booked, setBooked] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)

  // Async-loaded day data
  const [dayBookings, setDayBookings] = useState([])
  const [timeSlots, setTimeSlots] = useState([])

  const dates = getNext14Days()

  useEffect(() => {
    const loadInitial = async () => {
      const biz = await dataStore.getBusinessById(businessId)
      if (!biz) {
        setNotFound(true)
        return
      }
      setBusiness(biz)
      const allServices = await dataStore.getServices(biz.id)
      setServices(allServices.filter(s => s.is_active !== false))
      setSchedule(await dataStore.getSchedule(biz.id))
      try {
        const waResp = await fetch(`${API_BASE}/api/whatsapp/${biz.id}`)
        if (waResp.ok) {
          const waData = await waResp.json()
          if (waData.whatsapp_number) setWhatsappNumber(waData.whatsapp_number)
        }
      } catch {}
    }
    loadInitial()
  }, [businessId])

  // Load day bookings and time slots when date/service/schedule change
  useEffect(() => {
    if (!selectedDate || !selectedService || !schedule) {
      setTimeSlots([])
      setDayBookings([])
      return
    }
    const loadDayData = async () => {
      const d = new Date(selectedDate + 'T00:00:00')
      const dayKey = DAYS_OF_WEEK[d.getDay()]
      const daySchedule = schedule[dayKey]
      if (daySchedule && daySchedule.enabled) {
        const slots = generateTimeSlots(daySchedule.open, daySchedule.close, selectedService.duration || 30)
        const bookings = await dataStore.getBookingsByDate(business.id, selectedDate)
        setTimeSlots(slots)
        setDayBookings(bookings)
      } else {
        setTimeSlots([])
        setDayBookings([])
      }
    }
    loadDayData()
  }, [selectedDate, selectedService, schedule, business])

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

  const stepLabels = ['Service', 'Date & Time', 'Details', 'Confirm']
  const businessInitial = business.name ? business.name.charAt(0).toUpperCase() : '?'

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

  const handleConfirm = async () => {
    setBookingLoading(true)
    setBookingError('')
    try {
      const result = await dataStore.addBooking({
        business_id: business.id,
        service_id: selectedService.id,
        service_name: selectedService.name,
        customer_name: customerName,
        customer_phone: customerPhone,
        date: selectedDate,
        time: selectedTime,
        duration: selectedService.duration || 30,
        notes: '',
        status: 'confirmed',
      })
      if (result.error) {
        setBookingError(result.error.message || 'Something went wrong. Please try again.')
        return
      }
      setBooked(true)
    } catch (err) {
      setBookingError('Something went wrong. Please try again.')
    } finally {
      setBookingLoading(false)
    }
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
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '24px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>
            {businessInitial}
          </div>
          <h1>Book with {business.name}</h1>
          <p>{business.industry ? business.industry.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : ''}</p>
          {business.address && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>{business.address}{business.city ? `, ${business.city}` : ''}</p>
          )}
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi! I'd like to book an appointment at ${business.name}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                marginTop: '10px', padding: '8px 16px', borderRadius: '20px',
                background: '#25D366', color: '#fff', fontSize: '13px', fontWeight: 500,
                textDecoration: 'none', transition: 'opacity 0.2s'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              Chat on WhatsApp
            </a>
          )}
        </div>

        {!booked && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '24px' }}>
            {stepLabels.map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 600,
                  background: step > i + 1 ? 'var(--accent)' : step === i + 1 ? 'var(--accent)' : 'var(--bg-card)',
                  color: step >= i + 1 ? '#fff' : 'var(--text-muted)',
                  border: step >= i + 1 ? 'none' : '1px solid var(--border)',
                  transition: 'all 0.2s'
                }}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                {i < 3 && <div style={{ width: '20px', height: '2px', background: step > i + 1 ? 'var(--accent)' : 'var(--border)', transition: 'all 0.2s' }} />}
              </div>
            ))}
          </div>
        )}

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
            {bookingError && (
              <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '13px' }}>
                {bookingError}
              </div>
            )}
            <button className="btn btn-primary" style={{ marginTop: '20px', opacity: bookingLoading ? 0.7 : 1 }} onClick={handleConfirm} disabled={bookingLoading}>
              {bookingLoading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '32px', paddingBottom: '20px' }}>
        <a href="https://solis-os.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none', opacity: 0.7 }}>
          Powered by Solis OS
        </a>
      </div>
    </div>
  )
}
