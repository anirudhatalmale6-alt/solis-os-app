import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

export default function SchedulePage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        setSchedule(await dataStore.getSchedule(biz.id))
      }
    }
    loadData()
  }, [user])

  const handleToggle = (day) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }))
    setSaved(false)
  }

  const handleTimeChange = (day, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!business) return
    await dataStore.setSchedule(business.id, schedule)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const bookingUrl = business ? `${window.location.origin}/book/${business.id}` : ''

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      // Fallback for non-HTTPS
      const input = document.querySelector('.booking-link-box input')
      if (input) {
        input.select()
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    })
  }

  if (!schedule) return null

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Schedule</h1>
        <p className="page-subtitle">Set your working hours</p>
      </div>

      <div className="card">
        <div className="card-title">Working Hours</div>

        {DAYS.map(day => (
          <div key={day} className="schedule-row">
            <div className="schedule-day">{DAY_LABELS[day]}</div>
            <button
              type="button"
              className={`schedule-toggle ${schedule[day].enabled ? 'active' : ''}`}
              onClick={() => handleToggle(day)}
              aria-label={`Toggle ${DAY_LABELS[day]}`}
            />
            {schedule[day].enabled ? (
              <div className="schedule-times">
                <input
                  type="time"
                  value={schedule[day].open}
                  onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>to</span>
                <input
                  type="time"
                  value={schedule[day].close}
                  onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                />
              </div>
            ) : (
              <div className="schedule-closed">Closed</div>
            )}
          </div>
        ))}

        <div style={{ marginTop: '24px' }}>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Schedule
          </button>
          {saved && (
            <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--green)' }}>
              Schedule saved successfully!
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Public Booking Link</div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Share this link with customers so they can book appointments online.
        </p>
        <div className="booking-link-box">
          <input type="text" value={bookingUrl} readOnly />
          <button className="btn btn-primary btn-sm" onClick={handleCopyLink}>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </>
  )
}
