import { useEffect, useState } from 'react'
import { Copy, Check, Bell, Clock, Star, Send } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { syncedSet } from '../lib/cloudSync'

const API_BASE = 'https://api.solis-os.com'
const CURRENCIES = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'CAD', label: 'CAD (C$)' },
  { code: 'AUD', label: 'AUD (A$)' },
  { code: 'INR', label: 'INR (₹)' },
]

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const [business, setBusiness] = useState(null)
  const [saved, setSaved] = useState(false)
  const [whatsappCopied, setWhatsappCopied] = useState(false)

  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderHours, setReminderHours] = useState(24)
  const [followupEnabled, setFollowupEnabled] = useState(false)
  const [followupHours, setFollowupHours] = useState(2)
  const [reviewRequest, setReviewRequest] = useState(false)
  const [reminderSaved, setReminderSaved] = useState(false)

  // Business fields
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('salon')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [timezone, setTimezone] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [whatsappNumber, setWhatsappNumber] = useState('')

  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        setName(biz.name || '')
        setIndustry(biz.industry || 'salon')
        setPhone(biz.phone || '')
        setEmail(biz.email || '')
        setAddress(biz.address || '')
        setCity(biz.city || '')
        setCountry(biz.country || '')
        setTimezone(biz.timezone || '')
        setCurrency(biz.currency || 'USD')
        try {
          const waResp = await fetch(`${API_BASE}/api/whatsapp/${biz.id}`)
          if (waResp.ok) {
            const waData = await waResp.json()
            setWhatsappNumber(waData.whatsapp_number || '')
          }
        } catch {}
        const reminders = localStorage.getItem(`reminders_${biz.id}`)
        if (reminders) {
          const rc = JSON.parse(reminders)
          setReminderEnabled(rc.reminder_enabled || false)
          setReminderHours(rc.reminder_hours || 24)
          setFollowupEnabled(rc.followup_enabled || false)
          setFollowupHours(rc.followup_hours || 2)
          setReviewRequest(rc.review_request || false)
        }
      }
    }
    loadData()
  }, [user])

  const handleSave = async () => {
    if (!business) return
    await dataStore.updateBusiness(business.id, {
      name, industry, phone, email,
      address, city, country, timezone, currency,
    })
    try {
      await fetch(`${API_BASE}/api/whatsapp/${business.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_number: whatsappNumber }),
      })
    } catch {}
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleSignOut = () => {
    signOut()
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your business profile and account</p>
      </div>

      {/* Business Profile */}
      <div className="card">
        <div className="card-title">
          <span>Business Profile</span>
          {saved && (
            <span className="badge badge-green">Saved</span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Business Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Industry</label>
            <select
              className="form-select"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              <option value="salon">Salon Beauty & Hair</option>
              <option value="barber">Barber Shop</option>
              <option value="garage">Garage Mechanic</option>
              <option value="clinic">Clinic</option>
              <option value="real_estate">Real Estate Agent</option>
              <option value="lessons">Private Lessons</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Business Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Address</label>
            <input
              type="text"
              className="form-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input
              type="text"
              className="form-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Country</label>
            <input
              type="text"
              className="form-input"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Timezone</label>
            <input
              type="text"
              className="form-input"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select
              className="form-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>

      {/* WhatsApp AI Bot - moved to its own page */}

      {/* Automated Reminders */}
      <div className="card">
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} style={{ color: 'var(--amber)' }} />
            <span>Automated Reminders</span>
          </div>
          {reminderSaved && <span className="badge badge-green">Saved</span>}
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
          Configure automatic WhatsApp messages for appointment reminders, follow-ups, and review requests.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Clock size={20} style={{ color: 'var(--accent-bright)' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>Appointment Reminder</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Send reminder before appointment</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <select className="form-select" style={{ width: '120px', padding: '8px 12px' }}
                value={reminderHours} onChange={e => setReminderHours(parseInt(e.target.value))}>
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="4">4 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
              </select>
              <button className={`schedule-toggle ${reminderEnabled ? 'active' : ''}`}
                onClick={() => setReminderEnabled(!reminderEnabled)} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Send size={20} style={{ color: 'var(--green)' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>Follow-up Message</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Thank customer after appointment</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <select className="form-select" style={{ width: '120px', padding: '8px 12px' }}
                value={followupHours} onChange={e => setFollowupHours(parseInt(e.target.value))}>
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="4">4 hours</option>
                <option value="24">24 hours</option>
              </select>
              <button className={`schedule-toggle ${followupEnabled ? 'active' : ''}`}
                onClick={() => setFollowupEnabled(!followupEnabled)} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Star size={20} style={{ color: 'var(--amber)' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>Review Request</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ask for a review after completed appointment</div>
              </div>
            </div>
            <button className={`schedule-toggle ${reviewRequest ? 'active' : ''}`}
              onClick={() => setReviewRequest(!reviewRequest)} />
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <button className="btn btn-primary btn-sm" onClick={() => {
            if (!business) return
            const config = { reminder_enabled: reminderEnabled, reminder_hours: reminderHours, followup_enabled: followupEnabled, followup_hours: followupHours, review_request: reviewRequest }
            localStorage.setItem(`reminders_${business.id}`, JSON.stringify(config))
            syncedSet(business.id, 'reminders', config)
            setReminderSaved(true)
            setTimeout(() => setReminderSaved(false), 3000)
          }}>
            Save Reminder Settings
          </button>
        </div>
      </div>

      {/* Account Info */}
      <div className="card">
        <div className="card-title">Account</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div className="form-label">Name</div>
            <div style={{ fontSize: '14px' }}>{user?.full_name || '--'}</div>
          </div>
          <div>
            <div className="form-label">Email</div>
            <div style={{ fontSize: '14px' }}>{user?.email || '--'}</div>
          </div>
          <div style={{ marginTop: '8px' }}>
            <button className="btn btn-danger btn-sm" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
