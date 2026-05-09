import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { store } from '../lib/store'

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

  useEffect(() => {
    if (!user) return
    const biz = store.getBusiness(user.id)
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
    }
  }, [user])

  const handleSave = () => {
    if (!business) return
    store.updateBusiness(business.id, {
      name, industry, phone, email,
      address, city, country, timezone, currency,
    })
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
              <option value="salon">Salon & Beauty</option>
              <option value="garage">Auto Garage</option>
              <option value="clinic">Clinic & Health</option>
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
