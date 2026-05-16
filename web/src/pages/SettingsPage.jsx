import { useEffect, useState } from 'react'
import { MessageCircle, Copy, Check, Bell, Clock, Star, Send, Wifi, WifiOff, Loader2, QrCode } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { syncedSet } from '../lib/cloudSync'

const API_BASE = 'https://api.solis-os.com'
const WA_API = import.meta.env.VITE_WHATSAPP_API_URL || 'https://wa.solis-os.com'

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

  // WhatsApp AI Bot
  const [waStatus, setWaStatus] = useState('disconnected')
  const [waQR, setWaQR] = useState(null)
  const [waPhone, setWaPhone] = useState(null)
  const [waConnecting, setWaConnecting] = useState(false)
  const waPollingRef = useState(null)

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
        try {
          const waResp2 = await fetch(`${WA_API}/api/whatsapp/status/${biz.id}`)
          if (waResp2.ok) {
            const waData2 = await waResp2.json()
            setWaStatus(waData2.status || 'disconnected')
            if (waData2.phone) setWaPhone(waData2.phone)
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

      {/* WhatsApp AI Bot */}
      <div className="card">
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageCircle size={18} style={{ color: '#25D366' }} />
            <span>AI WhatsApp Assistant</span>
          </div>
          <span className={`badge ${waStatus === 'connected' ? 'badge-green' : waStatus === 'connecting' || waStatus === 'waiting_scan' ? 'badge-amber' : 'badge-red'}`}>
            {waStatus === 'connected' ? 'Connected' : waStatus === 'waiting_scan' ? 'Scan QR' : waStatus === 'connecting' || waStatus === 'reconnecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
          Connect your WhatsApp Business number to get a 24/7 AI receptionist. It handles customer messages, confirms bookings, answers questions about your services and prices — automatically.
        </p>

        {waStatus === 'connected' && (
          <div style={{
            padding: '16px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Wifi size={18} style={{ color: '#25D366' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#25D366' }}>WhatsApp Connected</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {waPhone && <>Connected as <b>+{waPhone}</b>. </>}
              Your AI assistant is active and handling customer messages automatically.
            </div>
          </div>
        )}

        {waStatus === 'waiting_scan' && waQR && (
          <div style={{
            padding: '24px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg)', border: '1px solid var(--border)',
            textAlign: 'center', marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              <QrCode size={18} style={{ color: 'var(--accent-bright)' }} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Scan with WhatsApp</span>
            </div>
            <img src={waQR} alt="QR Code" style={{
              width: '220px', height: '220px', margin: '0 auto', borderRadius: '12px',
              background: '#fff', padding: '8px',
            }} />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: '1.6' }}>
              Open WhatsApp on your phone &gt; Settings &gt; Linked Devices &gt; Link a Device
            </div>
          </div>
        )}

        {(waStatus === 'connecting' || waStatus === 'reconnecting') && !waQR && (
          <div style={{
            padding: '24px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg)', border: '1px solid var(--border)',
            textAlign: 'center', marginBottom: '16px',
          }}>
            <Loader2 size={24} style={{ color: 'var(--accent-bright)', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '12px' }}>
              Preparing connection...
            </div>
          </div>
        )}

        {waStatus === 'disconnected' && (
          <div style={{
            padding: '16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg)', border: '1px solid var(--border)',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <WifiOff size={18} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Not connected</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Connect your WhatsApp to activate the AI assistant. Your customers will be able to book appointments and get answers via WhatsApp automatically.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {waStatus !== 'connected' && (
            <button
              className="btn btn-primary btn-sm"
              disabled={waConnecting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#25D366' }}
              onClick={async () => {
                if (!business) return
                setWaConnecting(true)
                setWaQR(null)
                try {
                  await fetch(`${WA_API}/api/whatsapp/connect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ business_id: business.id }),
                  })
                  setWaStatus('connecting')
                  const pollQR = setInterval(async () => {
                    try {
                      const resp = await fetch(`${WA_API}/api/whatsapp/qr/${business.id}`)
                      if (resp.ok) {
                        const data = await resp.json()
                        if (data.qr) {
                          setWaQR(data.qr)
                          setWaStatus('waiting_scan')
                        }
                        if (data.status === 'connected') {
                          clearInterval(pollQR)
                          setWaQR(null)
                          setWaStatus('connected')
                          setWaConnecting(false)
                          const statusResp = await fetch(`${WA_API}/api/whatsapp/status/${business.id}`)
                          if (statusResp.ok) {
                            const sd = await statusResp.json()
                            if (sd.phone) setWaPhone(sd.phone)
                          }
                        }
                      }
                    } catch {}
                  }, 2000)
                  waPollingRef[1](pollQR)
                  setTimeout(() => {
                    clearInterval(pollQR)
                    setWaConnecting(false)
                  }, 120000)
                } catch {
                  setWaConnecting(false)
                }
              }}
            >
              <MessageCircle size={14} />
              {waConnecting ? 'Connecting...' : 'Connect WhatsApp'}
            </button>
          )}
          {waStatus === 'connected' && (
            <button
              className="btn btn-danger btn-sm"
              style={{ opacity: 0.8 }}
              onClick={async () => {
                if (!business || !confirm('Disconnect your WhatsApp AI assistant?')) return
                try {
                  await fetch(`${WA_API}/api/whatsapp/disconnect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ business_id: business.id }),
                  })
                  setWaStatus('disconnected')
                  setWaPhone(null)
                } catch {}
              }}
            >
              Disconnect
            </button>
          )}
        </div>

        <div style={{
          marginTop: '20px', padding: '14px', borderRadius: 'var(--radius-sm)',
          background: 'var(--bg)', border: '1px solid var(--border)',
          fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>What your AI assistant does:</div>
          <div>&#x2705; Greets customers and answers questions about your services</div>
          <div>&#x2705; Shares your prices, opening hours, and location</div>
          <div>&#x2705; Helps customers book appointments</div>
          <div>&#x2705; Works 24/7 in multiple languages</div>
        </div>
      </div>

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
