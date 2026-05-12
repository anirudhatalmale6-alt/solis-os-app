import { useEffect, useState } from 'react'
import { Tag, Plus, X, Copy, Check, Percent, CalendarCheck, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { syncedSet } from '../lib/cloudSync'

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default function PromosPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [promos, setPromos] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [copied, setCopied] = useState(null)

  // Form
  const [code, setCode] = useState(generateCode())
  const [discountType, setDiscountType] = useState('percent')
  const [discountValue, setDiscountValue] = useState(10)
  const [description, setDescription] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [minBookingValue, setMinBookingValue] = useState('')

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        const stored = localStorage.getItem(`promos_${biz.id}`)
        if (stored) setPromos(JSON.parse(stored))
      }
    }
    load()
  }, [user])

  const savePromos = (updated) => {
    setPromos(updated)
    if (business) {
      localStorage.setItem(`promos_${business.id}`, JSON.stringify(updated))
      syncedSet(business.id, 'promos', updated)
    }
  }

  const curr = business?.currency || 'USD'
  const sym = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', INR: '₹' }[curr] || '$'

  const handleCreate = () => {
    if (!code.trim()) return
    const promo = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      code: code.toUpperCase().trim(),
      discount_type: discountType,
      discount_value: discountValue,
      description,
      expiry_date: expiryDate || null,
      max_uses: maxUses ? parseInt(maxUses) : null,
      min_booking_value: minBookingValue ? parseFloat(minBookingValue) : null,
      uses: 0,
      active: true,
      created_at: todayStr(),
    }
    savePromos([promo, ...promos])
    setShowCreate(false)
    resetForm()
  }

  const resetForm = () => {
    setCode(generateCode())
    setDiscountType('percent')
    setDiscountValue(10)
    setDescription('')
    setExpiryDate('')
    setMaxUses('')
    setMinBookingValue('')
  }

  const toggleActive = (id) => {
    savePromos(promos.map(p => p.id === id ? { ...p, active: !p.active } : p))
  }

  const deletePromo = (id) => {
    savePromos(promos.filter(p => p.id !== id))
  }

  const copyCode = (promoCode) => {
    navigator.clipboard.writeText(promoCode)
    setCopied(promoCode)
    setTimeout(() => setCopied(null), 2000)
  }

  const today = todayStr()
  const activePromos = promos.filter(p => p.active && (!p.expiry_date || p.expiry_date >= today))
  const expiredPromos = promos.filter(p => !p.active || (p.expiry_date && p.expiry_date < today))

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Promo Codes</h1>
          <p className="page-subtitle">Create discount codes to attract and reward customers</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowCreate(true); resetForm() }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> New Promo
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(34,197,94,0.1)' }}><Tag size={22} style={{ color: 'var(--green)' }} /></div>
          <div className="stat-card-label">Active Promos</div>
          <div className="stat-card-value">{activePromos.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,0.1)' }}><CalendarCheck size={22} style={{ color: 'var(--accent-bright)' }} /></div>
          <div className="stat-card-label">Total Uses</div>
          <div className="stat-card-value">{promos.reduce((s, p) => s + p.uses, 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.1)' }}><Percent size={22} style={{ color: 'var(--amber)' }} /></div>
          <div className="stat-card-label">Avg Discount</div>
          <div className="stat-card-value">
            {promos.length > 0
              ? (promos.filter(p => p.discount_type === 'percent').reduce((s, p) => s + p.discount_value, 0) / Math.max(promos.filter(p => p.discount_type === 'percent').length, 1)).toFixed(0) + '%'
              : '0%'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(167,139,250,0.1)' }}><Tag size={22} style={{ color: 'var(--purple)' }} /></div>
          <div className="stat-card-label">Total Promos</div>
          <div className="stat-card-value">{promos.length}</div>
        </div>
      </div>

      {/* Create */}
      {showCreate && (
        <div className="card" style={{ marginBottom: '20px', border: '1px solid var(--accent)', boxShadow: '0 0 20px rgba(59,130,246,0.1)' }}>
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>New Promo Code</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}><X size={18} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Promo Code</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="text" className="form-input" value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{ fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 700 }} />
                <button className="btn btn-ghost btn-sm" onClick={() => setCode(generateCode())} title="Generate new code" style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>Random</button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Discount Type</label>
              <select className="form-select" value={discountType} onChange={e => setDiscountType(e.target.value)}>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount ({sym})</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Discount Value</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {discountType === 'fixed' && <span style={{ color: 'var(--text-muted)' }}>{sym}</span>}
                <input type="number" className="form-input" min="0" value={discountValue} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)} />
                {discountType === 'percent' && <Percent size={14} style={{ color: 'var(--text-muted)' }} />}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input type="text" className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Summer special offer" />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input type="date" className="form-input" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Max Uses</label>
              <input type="number" className="form-input" min="1" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Unlimited" />
            </div>
            <div className="form-group">
              <label className="form-label">Min Booking ({sym})</label>
              <input type="number" className="form-input" min="0" value={minBookingValue} onChange={e => setMinBookingValue(e.target.value)} placeholder="No minimum" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={!code.trim()}>
              Create Promo Code
            </button>
          </div>
        </div>
      )}

      {/* Active promos */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-title">Active Promo Codes</div>
        {activePromos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No active promo codes. Create one to get started.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {activePromos.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px',
                background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
              }}>
                <div style={{
                  fontFamily: 'monospace', fontSize: '18px', fontWeight: 700, letterSpacing: '3px',
                  color: 'var(--accent-bright)', minWidth: '140px',
                }}>
                  {p.code}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="badge badge-green" style={{ fontSize: '12px' }}>
                      {p.discount_type === 'percent' ? `${p.discount_value}% OFF` : `${sym}${p.discount_value} OFF`}
                    </span>
                    {p.description && <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{p.description}</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                    <span>{p.uses} use{p.uses !== 1 ? 's' : ''}{p.max_uses ? ` / ${p.max_uses}` : ''}</span>
                    {p.expiry_date && <span>Expires {formatDate(p.expiry_date)}</span>}
                    {p.min_booking_value && <span>Min {sym}{p.min_booking_value}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => copyCode(p.code)} title="Copy code">
                    {copied === p.code ? <Check size={14} style={{ color: 'var(--green)' }} /> : <Copy size={14} />}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(p.id)} title="Deactivate">
                    <ToggleRight size={16} style={{ color: 'var(--green)' }} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => deletePromo(p.id)} title="Delete" style={{ color: 'var(--rose)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expired / Inactive */}
      {expiredPromos.length > 0 && (
        <div className="card">
          <div className="card-title">Expired / Inactive</div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {expiredPromos.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px',
                background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', opacity: 0.5,
              }}>
                <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, letterSpacing: '2px', color: 'var(--text-muted)', minWidth: '140px' }}>
                  {p.code}
                </div>
                <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-muted)' }}>
                  {p.discount_type === 'percent' ? `${p.discount_value}%` : `${sym}${p.discount_value}`} off · {p.uses} uses
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(p.id)} title="Reactivate">
                    <ToggleLeft size={16} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => deletePromo(p.id)} style={{ color: 'var(--rose)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
