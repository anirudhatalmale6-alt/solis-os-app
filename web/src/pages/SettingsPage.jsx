import { useEffect, useState } from 'react'
import { MessageCircle, Copy, Check } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'

const API_BASE = 'https://chatbot.veltrixtv.com'

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

      {/* WhatsApp Integration */}
      <div className="card">
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageCircle size={18} style={{ color: '#25D366' }} />
            <span>WhatsApp Integration</span>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
          Add your WhatsApp Business number to let customers contact you directly and book appointments via WhatsApp.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">WhatsApp Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="+1 555 123 4567"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
            />
          </div>
          {whatsappNumber && business && (
            <div style={{ marginBottom: '4px' }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  const cleanNum = whatsappNumber.replace(/[^0-9]/g, '')
                  const bookingUrl = `${window.location.origin}/book/${business.id}`
                  const msg = `Hi! I'd like to book an appointment. Booking page: ${bookingUrl}`
                  const link = `https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`
                  navigator.clipboard.writeText(link)
                  setWhatsappCopied(true)
                  setTimeout(() => setWhatsappCopied(false), 2000)
                }}
              >
                {whatsappCopied ? <Check size={14} /> : <Copy size={14} />}
                {whatsappCopied ? 'Copied!' : 'Copy Chat Link'}
              </button>
            </div>
          )}
        </div>
        {whatsappNumber && (
          <div style={{
            marginTop: '16px', padding: '14px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)',
            fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6'
          }}>
            Your WhatsApp link will appear on your public booking page. Customers can tap it to message you directly on WhatsApp for bookings, questions, or support.
          </div>
        )}
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
