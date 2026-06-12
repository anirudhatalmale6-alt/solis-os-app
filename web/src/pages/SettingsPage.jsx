import { useEffect, useState } from 'react'
import { Copy, Check, Bell, Clock, Star, Send, X, AlertTriangle, CheckCircle2, Mail, Eye, EyeOff } from 'lucide-react'
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
  const [cancelModal, setCancelModal] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  // Email config
  const [emailProvider, setEmailProvider] = useState('gmail')
  const [smtpEmail, setSmtpEmail] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [showPassword, setShowPassword] = useState(false)
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)
  const [emailTesting, setEmailTesting] = useState(false)
  const [emailTestResult, setEmailTestResult] = useState(null)

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
  const [slug, setSlug] = useState('')

  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        setName(biz.name || '')
        setSlug(biz.slug || '')
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
          const ecResp = await fetch(`${API_BASE}/api/email-config/${biz.id}`)
          if (ecResp.ok) {
            const ec = await ecResp.json()
            if (ec.configured) {
              setEmailProvider(ec.provider || 'gmail')
              setSmtpEmail(ec.email || '')
              setSmtpHost(ec.smtp_host || '')
              setSmtpPort(ec.smtp_port || '587')
              setEmailConfigured(true)
              setSmtpPassword('')
            }
          }
        } catch {}
        try {
          const rmResp = await fetch(`${API_BASE}/api/reminders/config/${biz.id}`)
          if (rmResp.ok) {
            const rc = await rmResp.json()
            setReminderEnabled(rc.reminder_enabled || false)
            setReminderHours(rc.reminder_hours || 24)
            setFollowupEnabled(rc.followup_enabled || false)
            setFollowupHours(rc.followup_hours || 2)
            setReviewRequest(rc.review_request || false)
          }
        } catch {}
      }
    }
    loadData()
  }, [user])

  const formatSlug = (val) => val.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

  const handleSave = async () => {
    if (!business) return
    const cleanSlug = formatSlug(slug)
    if (!cleanSlug) return
    setSlug(cleanSlug)
    const result = await dataStore.updateBusiness(business.id, {
      name, slug: cleanSlug, industry, phone, email,
      address, city, country, timezone, currency,
    })
    if (result?.error?.message?.includes('slug')) {
      setSaved(false)
      alert('That URL is already taken. Please choose a different one.')
      return
    }
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
            <label className="form-label">Booking URL</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'var(--input-bg)', padding: '10px 10px', borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)', border: '1px solid var(--border)', borderRight: 'none', whiteSpace: 'nowrap' }}>
                app.solis-os.com/book/
              </span>
              <input
                type="text"
                className="form-input"
                style={{ borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', flex: 1 }}
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="your-business-name"
              />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Only lowercase letters, numbers, and dashes
            </div>
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

      {/* Invoice Email Settings */}
      <div className="card">
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={18} style={{ color: 'var(--accent-bright)' }} />
            <span>Invoice Email Settings</span>
          </div>
          {emailSaved && <span className="badge badge-green">Saved</span>}
          {emailConfigured && !emailSaved && <span className="badge" style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>Connected</span>}
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
          Send invoices from your own email address instead of solis.os.support@gmail.com. This looks more professional and avoids daily sending limits.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Email Provider</label>
            <select
              className="form-select"
              value={emailProvider}
              onChange={(e) => setEmailProvider(e.target.value)}
            >
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook / Hotmail</option>
              <option value="yahoo">Yahoo Mail</option>
              <option value="custom">Custom SMTP (Business Email)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={smtpEmail}
              onChange={(e) => setSmtpEmail(e.target.value)}
              placeholder={emailProvider === 'gmail' ? 'your@gmail.com' : emailProvider === 'outlook' ? 'your@outlook.com' : emailProvider === 'yahoo' ? 'your@yahoo.com' : 'sales@yourbusiness.com'}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{emailProvider === 'custom' ? 'SMTP Password' : 'App Password'}</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingRight: '40px' }}
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder={emailConfigured ? '(saved - enter new to change)' : 'Paste your app password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {emailProvider === 'custom' && (
            <>
              <div className="form-group">
                <label className="form-label">SMTP Host</label>
                <input
                  type="text"
                  className="form-input"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="mail.yourdomain.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">SMTP Port</label>
                <select
                  className="form-select"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                >
                  <option value="587">587 (TLS - recommended)</option>
                  <option value="465">465 (SSL)</option>
                  <option value="25">25 (No encryption)</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* How to get App Password - collapsible info */}
        {emailProvider !== 'custom' && (
          <details style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: '12px 16px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)', userSelect: 'none' }}>
              How to get an App Password {emailProvider === 'gmail' ? '(Gmail)' : emailProvider === 'outlook' ? '(Outlook)' : '(Yahoo)'}
            </summary>
            <div style={{ marginTop: '12px', lineHeight: '1.8' }}>
              {emailProvider === 'gmail' && (
                <>
                  <div>1. Go to myaccount.google.com</div>
                  <div>2. Click "Security" on the left menu</div>
                  <div>3. Under "How you sign in to Google", make sure 2-Step Verification is ON</div>
                  <div>4. Go back to Security, scroll down and click "App passwords"</div>
                  <div>5. Enter a name like "Solis OS" and click Create</div>
                  <div>6. Copy the 16-character password and paste it above</div>
                  <div style={{ marginTop: '8px', color: 'var(--amber)', fontWeight: 500 }}>Important: Use the generated app password, NOT your regular Gmail password.</div>
                </>
              )}
              {emailProvider === 'outlook' && (
                <>
                  <div>1. Go to account.microsoft.com and sign in</div>
                  <div>2. Click "Security" then "Advanced security options"</div>
                  <div>3. Turn on Two-step verification if not already on</div>
                  <div>4. Scroll down to "App passwords" and click "Create a new app password"</div>
                  <div>5. Copy the password and paste it above</div>
                  <div style={{ marginTop: '8px', color: 'var(--amber)', fontWeight: 500 }}>Note: You must have a Microsoft 365 or Outlook.com account with 2FA enabled.</div>
                </>
              )}
              {emailProvider === 'yahoo' && (
                <>
                  <div>1. Go to login.yahoo.com and sign in</div>
                  <div>2. Go to Account Security</div>
                  <div>3. Turn on Two-step verification</div>
                  <div>4. Click "Generate app password"</div>
                  <div>5. Select "Other App", name it "Solis OS"</div>
                  <div>6. Copy the password and paste it above</div>
                </>
              )}
            </div>
          </details>
        )}

        {emailProvider === 'custom' && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: '12px 16px', lineHeight: '1.7' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>For business emails (sales@yourbusiness.com)</div>
            <div>Your hosting provider (GoDaddy, cPanel, Namecheap, etc.) will have the SMTP settings in your email management panel. Look for "Email Settings" or "SMTP Configuration". The password is usually the same one you use to log into your email.</div>
          </div>
        )}

        {emailTestResult && (
          <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 500, background: emailTestResult.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', color: emailTestResult.success ? '#16a34a' : '#ef4444', border: `1px solid ${emailTestResult.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
            {emailTestResult.success ? 'Test email sent successfully! Check your inbox.' : emailTestResult.error}
          </div>
        )}

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-sm"
            disabled={emailSaving || !smtpEmail}
            onClick={async () => {
              if (!business) return
              if (!smtpEmail) return
              if (!emailConfigured && !smtpPassword) { alert('Please enter your app password.'); return }
              setEmailSaving(true)
              setEmailTestResult(null)
              try {
                const payload = { provider: emailProvider, email: smtpEmail }
                if (smtpPassword) payload.password = smtpPassword
                else if (emailConfigured) payload.password = '__KEEP__'
                if (emailProvider === 'custom') {
                  payload.smtp_host = smtpHost
                  payload.smtp_port = smtpPort
                }
                const resp = await fetch(`${API_BASE}/api/email-config/${business.id}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                })
                const data = await resp.json()
                if (data.success) {
                  setEmailConfigured(true)
                  setEmailSaved(true)
                  setTimeout(() => setEmailSaved(false), 3000)
                } else {
                  alert(data.error || 'Failed to save')
                }
              } catch { alert('Failed to save email settings') }
              setEmailSaving(false)
            }}
          >
            {emailSaving ? 'Saving...' : 'Save Email Settings'}
          </button>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            disabled={emailTesting || !emailConfigured}
            onClick={async () => {
              if (!business) return
              setEmailTesting(true)
              setEmailTestResult(null)
              try {
                const resp = await fetch(`${API_BASE}/api/email-config/${business.id}/test`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ test_to: smtpEmail }),
                })
                const data = await resp.json()
                setEmailTestResult(data.success ? { success: true } : { error: data.error || 'Test failed' })
              } catch { setEmailTestResult({ error: 'Connection error. Try again.' }) }
              setEmailTesting(false)
            }}
          >
            {emailTesting ? 'Sending...' : 'Send Test Email'}
          </button>
          {emailConfigured && (
            <button
              className="btn btn-sm"
              style={{ color: '#ef4444', background: 'none', border: '1px solid rgba(239,68,68,0.3)' }}
              onClick={async () => {
                if (!business || !confirm('Remove your email settings? Invoices will be sent from the default Solis OS email.')) return
                try {
                  await fetch(`${API_BASE}/api/email-config/${business.id}`, { method: 'DELETE' })
                  setEmailConfigured(false)
                  setSmtpEmail('')
                  setSmtpPassword('')
                  setSmtpHost('')
                  setSmtpPort('587')
                  setEmailProvider('gmail')
                  setEmailTestResult(null)
                } catch {}
              }}
            >
              Remove
            </button>
          )}
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
          Automatic WhatsApp messages for appointment reminders, follow-ups, and review requests.
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
          <button className="btn btn-primary btn-sm" onClick={async () => {
            if (!business) return
            try {
              await fetch(`${API_BASE}/api/reminders/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId: business.id, reminder_enabled: reminderEnabled, reminder_hours: reminderHours, followup_enabled: followupEnabled, followup_hours: followupHours, review_request: reviewRequest }),
              })
              setReminderSaved(true)
              setTimeout(() => setReminderSaved(false), 3000)
            } catch {}
          }}>
            Save Reminder Settings
          </button>
        </div>
      </div>

      {/* Subscription */}
      <div className="card">
        <div className="card-title">Subscription</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Manage your Solis OS Dashboard subscription from the <a href="/billing" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Billing page</a>.
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a href="/billing" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              Manage Billing
            </a>
            <button className="btn btn-danger btn-sm" onClick={() => setCancelModal('confirm')}>
              Cancel Subscription
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {cancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => !cancelLoading && setCancelModal(null)}>
          <div style={{ background: 'var(--bg-primary, #fff)', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            {!cancelLoading && cancelModal !== 'done' && cancelModal !== 'error' && (
              <button onClick={() => setCancelModal(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}><X size={20} /></button>
            )}

            {cancelModal === 'confirm' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <AlertTriangle size={28} style={{ color: '#ef4444' }} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>Cancel Subscription?</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 24px' }}>
                  Are you sure? You will keep full access until the end of your current billing period. No further charges will be made.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setCancelModal(null)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border, #e5e7eb)', background: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>Keep Subscription</button>
                  <button onClick={async () => {
                    setCancelLoading(true)
                    try {
                      const resp = await fetch(`${API_BASE}/api/dashboard/cancel-subscription`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user?.email }) })
                      const data = await resp.json()
                      if (resp.ok) { setCancelModal(data.access_until ? new Date(data.access_until).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' }) : 'done') }
                      else { setCancelModal('error') }
                    } catch { setCancelModal('error') }
                    setCancelLoading(false)
                  }} disabled={cancelLoading} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: cancelLoading ? 0.6 : 1 }}>
                    {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
                  </button>
                </div>
              </div>
            )}

            {cancelModal === 'error' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <X size={28} style={{ color: '#ef4444' }} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Something Went Wrong</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 20px' }}>Could not cancel your subscription. Please try again or contact support at Solis.os.support@gmail.com</p>
                <button onClick={() => setCancelModal(null)} className="btn btn-primary btn-sm" style={{ width: '100%' }}>Close</button>
              </div>
            )}

            {cancelModal !== 'confirm' && cancelModal !== 'error' && cancelModal !== 'done' && !cancelLoading && cancelModal && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CheckCircle2 size={28} style={{ color: '#16a34a' }} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>Subscription Cancelled</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 8px' }}>
                  Your subscription has been cancelled successfully.
                </p>
                <div style={{ background: 'var(--bg, #f7f8fc)', borderRadius: '10px', padding: '16px', margin: '16px 0' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>You have full access until</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>{cancelModal}</div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 20px' }}>No further charges will be made to your card. We hope to see you again!</p>
                <button onClick={() => setCancelModal(null)} className="btn btn-primary btn-sm" style={{ width: '100%' }}>Got It</button>
              </div>
            )}
          </div>
        </div>
      )}

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
