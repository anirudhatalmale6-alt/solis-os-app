import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'

const INDUSTRY_TEMPLATES = {
  salon: [
    { name: 'Haircut', price: 35, duration: 45 },
    { name: 'Hair Coloring', price: 85, duration: 120 },
    { name: 'Beard Trim', price: 20, duration: 30 },
    { name: 'Styling', price: 55, duration: 90 },
    { name: 'Manicure', price: 30, duration: 45 },
  ],
  garage: [
    { name: 'Oil Change', price: 45, duration: 45 },
    { name: 'Tire Rotation', price: 30, duration: 30 },
    { name: 'Brake Inspection', price: 60, duration: 60 },
    { name: 'Full Service', price: 120, duration: 180 },
    { name: 'Diagnostic', price: 80, duration: 60 },
  ],
  clinic: [
    { name: 'General Checkup', price: 75, duration: 30 },
    { name: 'Follow-up', price: 45, duration: 20 },
    { name: 'Vaccination', price: 35, duration: 15 },
    { name: 'Lab Work', price: 90, duration: 45 },
    { name: 'Consultation', price: 100, duration: 60 },
  ],
}

const CURRENCIES = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'CAD', label: 'CAD (C$)' },
  { code: 'AUD', label: 'AUD (A$)' },
  { code: 'INR', label: 'INR (₹)' },
]

export default function SetupPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 - Business info
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('salon')
  const [phone, setPhone] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')

  // Step 2 - Location
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [timezone, setTimezone] = useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'UTC' }
  })
  const [currency, setCurrency] = useState('USD')

  // Step 3 - Services
  const [services, setServices] = useState([])
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')
  const [newServiceDuration, setNewServiceDuration] = useState('')

  // Step 4 - Staff
  const [staffList, setStaffList] = useState([])
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffRole, setNewStaffRole] = useState('')
  const [newStaffEmail, setNewStaffEmail] = useState('')

  const [error, setError] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [countryCode, setCountryCode] = useState('')
  const [detectedLat, setDetectedLat] = useState(null)
  const [detectedLon, setDetectedLon] = useState(null)
  const addressTimeout = useRef(null)

  useEffect(() => {
    autoDetectLocation()
  }, [])

  const autoDetectLocation = async () => {
    setLocationLoading(true)
    try {
      const res = await fetch('https://ipapi.co/json/')
      if (res.ok) {
        const data = await res.json()
        if (data.city && !city) setCity(data.city)
        if (data.country_name && !country) setCountry(data.country_name)
        if (data.country_code) setCountryCode(data.country_code.toLowerCase())
        if (data.latitude) setDetectedLat(data.latitude)
        if (data.longitude) setDetectedLon(data.longitude)
        if (data.timezone && timezone === 'UTC') setTimezone(data.timezone)
        const currMap = { USD: 'USD', EUR: 'EUR', GBP: 'GBP', CAD: 'CAD', AUD: 'AUD', INR: 'INR' }
        if (data.currency && currMap[data.currency]) setCurrency(data.currency)
      }
    } catch {}
    setLocationLoading(false)
  }

  const searchAddress = (query) => {
    setAddress(query)
    if (addressTimeout.current) clearTimeout(addressTimeout.current)
    if (query.length < 3) { setAddressSuggestions([]); setShowSuggestions(false); return }
    addressTimeout.current = setTimeout(async () => {
      try {
        const countryParam = countryCode ? `&countrycodes=${countryCode}` : ''
        let viewboxParam = ''
        if (detectedLat && detectedLon) {
          const offset = 0.3
          viewboxParam = `&viewbox=${detectedLon - offset},${detectedLat + offset},${detectedLon + offset},${detectedLat - offset}&bounded=0`
        }
        const cityHint = city && !query.toLowerCase().includes(city.toLowerCase()) ? `, ${city}` : ''
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + cityHint)}&limit=5&addressdetails=1${countryParam}${viewboxParam}`)
        if (res.ok) {
          const results = await res.json()
          const userNumMatch = query.trim().match(/^(\d+[\w/.-]*)\s/)
          const userNumber = userNumMatch ? userNumMatch[1] : ''
          setAddressSuggestions(results.map(r => {
            const a = r.address || {}
            const parts = []
            const houseNum = a.house_number || userNumber
            if (a.road) {
              parts.push(houseNum ? `${houseNum} ${a.road}` : a.road)
            } else if (houseNum) {
              parts.push(houseNum)
            }
            if (a.suburb || a.neighbourhood) parts.push(a.suburb || a.neighbourhood)
            if (a.postcode) parts.push(a.postcode)
            const fullAddr = parts.length > 0 ? parts.join(', ') : r.display_name.split(',').slice(0, 3).join(',').trim()
            return {
              display: r.display_name,
              address: fullAddr,
              city: a.city || a.town || a.village || '',
              country: a.country || '',
            }
          }))
          setShowSuggestions(true)
        }
      } catch {}
    }, 400)
  }

  const selectAddress = (suggestion) => {
    setAddress(suggestion.address)
    if (suggestion.city) setCity(suggestion.city)
    if (suggestion.country) setCountry(suggestion.country)
    setShowSuggestions(false)
    setAddressSuggestions([])
  }

  const loadTemplates = () => {
    const templates = INDUSTRY_TEMPLATES[industry] || []
    setServices(templates.map((t, i) => ({ ...t, id: `template-${i}` })))
  }

  const addService = () => {
    if (!newServiceName || !newServicePrice || !newServiceDuration) return
    setServices([...services, {
      id: `custom-${Date.now()}`,
      name: newServiceName,
      price: parseFloat(newServicePrice),
      duration: parseInt(newServiceDuration),
    }])
    setNewServiceName('')
    setNewServicePrice('')
    setNewServiceDuration('')
  }

  const removeService = (id) => {
    setServices(services.filter(s => s.id !== id))
  }

  const addStaffMember = () => {
    if (!newStaffName || !newStaffRole) return
    setStaffList([...staffList, {
      id: `staff-${Date.now()}`,
      name: newStaffName,
      role: newStaffRole,
      email: newStaffEmail,
    }])
    setNewStaffName('')
    setNewStaffRole('')
    setNewStaffEmail('')
  }

  const removeStaff = (id) => {
    setStaffList(staffList.filter(s => s.id !== id))
  }

  const handleNext = () => {
    setError('')
    if (step === 1) {
      if (!businessName) { setError('Business name is required'); return }
      setStep(2)
    } else if (step === 2) {
      setStep(3)
      if (services.length === 0) loadTemplates()
    } else if (step === 3) {
      setStep(4)
    }
  }

  const handleBack = () => {
    setError('')
    setStep(step - 1)
  }

  const handleComplete = async () => {
    setLoading(true)
    setError('')

    // Create business
    const bizResult = await dataStore.createBusiness({
      owner_id: user.id,
      name: businessName,
      industry,
      phone,
      email: businessEmail,
      address,
      city,
      country,
      timezone,
      currency,
    })

    if (bizResult.error) {
      setError(bizResult.error.message)
      setLoading(false)
      return
    }

    const businessId = bizResult.data.id

    // Create services
    for (const svc of services) {
      await dataStore.addService({
        business_id: businessId,
        name: svc.name,
        price: svc.price,
        duration: svc.duration,
      })
    }

    // Create staff
    for (const member of staffList) {
      await dataStore.addStaff({
        business_id: businessId,
        name: member.name,
        role: member.role,
        email: member.email,
      })
    }

    setLoading(false)
    window.location.href = '/dashboard'
  }

  return (
    <div className="setup-page">
      <div className="setup-card">
        <div className="auth-logo">
          <img src="/logo-full.png" alt="Solis OS" style={{ height: '130px', width: 'auto' }} />
        </div>

        <div className="setup-steps">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`setup-step ${s === step ? 'active' : ''} ${s < step ? 'done' : ''}`}
            />
          ))}
        </div>

        <div className="setup-step-label">Step {step} of 4</div>

        {error && <div className="auth-error">{error}</div>}

        {/* Step 1: Business Info */}
        {step === 1 && (
          <>
            <h2 className="auth-title">Your business</h2>
            <p className="auth-subtitle">Tell us about your business</p>
            <div className="form-group">
              <label className="form-label">Business Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Sunrise Salon"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
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
                placeholder="+1 555 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Business Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="hello@yourbusiness.com"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
              />
            </div>
          </>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <>
            <h2 className="auth-title">Location & preferences</h2>
            <p className="auth-subtitle">
              {locationLoading ? 'Detecting your location...' : 'Where are you based?'}
            </p>
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="Start typing your address..."
                value={address}
                onChange={(e) => searchAddress(e.target.value)}
                onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                autoComplete="off"
              />
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="address-suggestions">
                  {addressSuggestions.map((s, i) => (
                    <div key={i} className="address-suggestion" onMouseDown={() => selectAddress(s)}>
                      {s.display.length > 80 ? s.display.slice(0, 80) + '...' : s.display}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                className="form-input"
                placeholder="New York"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Country</label>
              <input
                type="text"
                className="form-input"
                placeholder="United States"
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
          </>
        )}

        {/* Step 3: Services */}
        {step === 3 && (
          <>
            <h2 className="auth-title">Your services</h2>
            <p className="auth-subtitle">
              We pre-loaded templates for your industry. Add, remove, or customize.
            </p>

            <div className="service-list">
              {services.map(svc => (
                <div key={svc.id} className="service-item">
                  <div className="service-item-info">
                    <div className="service-item-name">{svc.name}</div>
                    <div className="service-item-meta">
                      ${svc.price} &middot; {svc.duration} min
                    </div>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeService(svc.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {services.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>
                  No services added yet. Use the form below to add your own.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Service name"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                style={{ flex: '2', minWidth: '120px' }}
              />
              <input
                type="number"
                className="form-input"
                placeholder="Price"
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
                style={{ flex: '1', minWidth: '80px' }}
              />
              <input
                type="number"
                className="form-input"
                placeholder="Min"
                value={newServiceDuration}
                onChange={(e) => setNewServiceDuration(e.target.value)}
                style={{ flex: '1', minWidth: '70px' }}
              />
              <button className="btn btn-secondary btn-sm" onClick={addService}>
                Add
              </button>
            </div>

            {services.length === 0 && industry !== 'other' && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={loadTemplates}
                style={{ marginBottom: '12px' }}
              >
                Load {industry} templates
              </button>
            )}
          </>
        )}

        {/* Step 4: Staff */}
        {step === 4 && (
          <>
            <h2 className="auth-title">Your team</h2>
            <p className="auth-subtitle">
              Add your staff members (you can skip this for now)
            </p>

            <div className="service-list">
              {staffList.map(m => (
                <div key={m.id} className="service-item">
                  <div className="service-item-info">
                    <div className="service-item-name">{m.name}</div>
                    <div className="service-item-meta">
                      {m.role}{m.email ? ` · ${m.email}` : ''}
                    </div>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeStaff(m.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {staffList.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>
                  No team members added yet.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Full name"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                style={{ flex: '1', minWidth: '120px' }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Role"
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value)}
                style={{ flex: '1', minWidth: '100px' }}
              />
              <input
                type="email"
                className="form-input"
                placeholder="Email (optional)"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                style={{ flex: '1', minWidth: '120px' }}
              />
              <button className="btn btn-secondary btn-sm" onClick={addStaffMember}>
                Add
              </button>
            </div>
          </>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          {step > 1 && (
            <button className="btn btn-secondary" onClick={handleBack} style={{ flex: 1 }}>
              Back
            </button>
          )}
          {step < 4 ? (
            <button className="btn btn-primary" onClick={handleNext} style={{ flex: 1 }}>
              Continue
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleComplete}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Setting up...' : 'Launch Dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
