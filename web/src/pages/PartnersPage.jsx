import { Fragment, useEffect, useState, useCallback } from 'react'
import {
  Handshake,
  Users,
  Percent,
  DollarSign,
  Plus,
  Copy,
  Check,
  Pencil,
  Trash2,
  RefreshCw,
  Pause,
  Play,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Tag,
  Wallet,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const API_BASE = 'https://api.solis-os.com'
const SITE = 'https://solis-os.com'

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

function monthOptions() {
  const out = []
  const now = new Date()
  for (let i = 0; i < 18; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })
    out.push({ value, label })
  }
  return out
}

function money(amount, currency) {
  return `${currency === 'AUD' ? 'A$' : '$'}${Number(amount || 0).toFixed(2)}`
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const EMPTY_FORM = {
  name: '', company: '', email: '', code: '',
  commission_rate: 20, commission_type: 'recurring',
  promo_type: 'amount', promo_value: 7, promo_months: 3,
}

const PROMO_DURATIONS = [
  { value: 1, label: 'First month only' },
  { value: 3, label: 'First 3 months' },
  { value: 6, label: 'First 6 months' },
  { value: 12, label: 'First 12 months' },
  { value: 0, label: 'Forever' },
]

// What the offer reads like to the customer, and what it leaves you with.
function promoMaths(form, planPrice) {
  const price = Number(planPrice) || 0
  const value = Number(form.promo_value) || 0
  const rate = Number(form.commission_rate) || 0
  const discount = value <= 0 ? 0
    : form.promo_type === 'percent' ? Math.min(price, price * value / 100) : Math.min(price, value)
  const customerPays = Math.max(0, price - discount)
  const commission = customerPays * rate / 100
  return {
    discount: Math.round(discount * 100) / 100,
    customerPays: Math.round(customerPays * 100) / 100,
    commission: Math.round(commission * 100) / 100,
    kept: Math.round((customerPays - commission) * 100) / 100,
    offerText: value <= 0 ? ''
      : `${form.promo_type === 'percent' ? value + '% off' : '$' + value + ' off'}` +
        (Number(form.promo_months) === 0 ? ' for as long as you stay'
          : Number(form.promo_months) === 1 ? ' your first month'
          : ` for your first ${form.promo_months} months`),
  }
}

export default function PartnersPage() {
  const months = monthOptions()
  const [month, setMonth] = useState(months[0].value)
  const [price, setPrice] = useState(39)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [expanded, setExpanded] = useState(null)
  const [copied, setCopied] = useState('')

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignEmail, setAssignEmail] = useState('')
  const [assignCode, setAssignCode] = useState('')
  const [assignMsg, setAssignMsg] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const resp = await fetch(`${API_BASE}/api/admin/partners/report?month=${month}&price=${price}`, {
        headers: await authHeaders(),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setError(data.error || 'Could not load partners')
        setReport(null)
      } else {
        setReport(data)
      }
    } catch {
      setError('Connection error. Please try again.')
    }
    setLoading(false)
    setRefreshing(false)
  }, [month, price])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (p) => {
    setEditingId(p.id)
    setForm({
      name: p.name || '',
      company: p.company || '',
      email: p.email || '',
      code: p.code || '',
      commission_rate: p.commission_rate ?? 0,
      commission_type: p.commission_type || 'recurring',
      promo_type: p.promo_type || 'amount',
      promo_value: p.promo_value ?? 0,
      promo_months: p.promo_months ?? 3,
    })
    setFormError('')
    setShowForm(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim()) { setFormError('Partner name is required'); return }
    setSaving(true)
    try {
      const url = editingId ? `${API_BASE}/api/admin/partners/${editingId}` : `${API_BASE}/api/admin/partners`
      const resp = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          ...form,
          // Leave the code out on create so the server generates one from the company name
          code: form.code.trim() ? form.code.trim() : undefined,
          commission_rate: Number(form.commission_rate) || 0,
          promo_value: Number(form.promo_value) || 0,
          promo_months: Number(form.promo_months) || 0,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setFormError(data.error || 'Could not save the partner')
      } else {
        setShowForm(false)
        setRefreshing(true)
        await load()
      }
    } catch {
      setFormError('Connection error. Please try again.')
    }
    setSaving(false)
  }

  const togglePause = async (p) => {
    await fetch(`${API_BASE}/api/admin/partners/${p.id}`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify({ active: !p.active }),
    })
    setRefreshing(true)
    load()
  }

  const remove = async (p) => {
    if (!confirm(`Delete ${p.company || p.name}? Customers they referred stay in the system, but they will no longer appear on this report.`)) return
    await fetch(`${API_BASE}/api/admin/partners/${p.id}`, { method: 'DELETE', headers: await authHeaders() })
    setRefreshing(true)
    load()
  }

  const copyLink = (code) => {
    const link = `${SITE}/partner/${code}`
    navigator.clipboard?.writeText(link)
    setCopied(code)
    setTimeout(() => setCopied(''), 1800)
  }

  const assign = async (e) => {
    e.preventDefault()
    setAssignMsg('')
    try {
      const resp = await fetch(`${API_BASE}/api/admin/partners/assign`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ email: assignEmail.trim(), code: assignCode.trim() || null }),
      })
      const data = await resp.json()
      if (!resp.ok) { setAssignMsg(data.error || 'Could not assign'); return }
      setAssignMsg(assignCode.trim() ? `Done - ${assignEmail} is now credited to ${assignCode.toUpperCase()}` : `Done - referral removed from ${assignEmail}`)
      setAssignEmail('')
      setAssignCode('')
      setRefreshing(true)
      load()
    } catch {
      setAssignMsg('Connection error. Please try again.')
    }
  }

  const partners = report?.partners || []
  const totals = report?.totals || { partners: 0, referred_total: 0, active_customers: 0, commission: 0, discount_given: 0, net_revenue: 0, kept: 0 }
  const currency = report?.currency || 'AUD'

  const th = {
    textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: 600,
    color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
    letterSpacing: '0.02em',
  }
  const td = { padding: '10px 8px', fontSize: '13px', verticalAlign: 'middle' }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Partners</h1>
        <p className="page-subtitle">Commission-only sales partners, their referrals and what you owe them</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--accent-bright)' }}><Handshake size={22} /></div>
          <div className="stat-card-label">Partners</div>
          <div className="stat-card-value">{totals.partners}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--purple)' }}><UserPlus size={22} /></div>
          <div className="stat-card-label">Referred Signups</div>
          <div className="stat-card-value">{totals.referred_total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: '#ef4444' }}><Tag size={22} /></div>
          <div className="stat-card-label">Discounts Given</div>
          <div className="stat-card-value">{money(totals.discount_given, currency)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--green)' }}><Users size={22} /></div>
          <div className="stat-card-label">Paying This Month</div>
          <div className="stat-card-value">{totals.active_customers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--teal)' }}><DollarSign size={22} /></div>
          <div className="stat-card-label">Commission Owed</div>
          <div className="stat-card-value">{money(totals.commission, currency)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--green)' }}><Wallet size={22} /></div>
          <div className="stat-card-label">You Keep</div>
          <div className="stat-card-value">{money(totals.kept, currency)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <span>Monthly Report</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              className="form-input"
              value={month}
              onChange={e => { setLoading(true); setMonth(e.target.value) }}
              style={{ marginBottom: 0, width: 'auto', minWidth: '150px', fontSize: '13px' }}
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <span>Plan price</span>
              <input
                type="number"
                className="form-input"
                value={price}
                min="0"
                step="0.1"
                onChange={e => setPrice(e.target.value)}
                style={{ marginBottom: 0, width: '80px', fontSize: '13px' }}
              />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => { setRefreshing(true); load() }} disabled={refreshing}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
              Refresh
            </button>
            <button className="btn btn-primary btn-sm" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} /> Add Partner
            </button>
          </div>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading partners...</div>
        ) : partners.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Handshake size={48} strokeWidth={1.5} /></div>
            <div className="empty-state-title">No partners yet</div>
            <div className="empty-state-text">
              Add your first sales partner and they get a referral link straight away.
            </div>
            <button className="btn btn-primary" onClick={openNew} style={{ marginTop: '16px' }}>Add Partner</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: '32px' }}></th>
                  <th style={th}>Partner</th>
                  <th style={th}>Link &amp; offer</th>
                  <th style={{ ...th, textAlign: 'center' }}>Rate</th>
                  <th style={{ ...th, textAlign: 'center' }} title="Total referred, and how many signed up in the selected month">Referred</th>
                  <th style={{ ...th, textAlign: 'center' }} title="Referred customers paying in the selected month">Paying</th>
                  <th style={{ ...th, textAlign: 'right' }} title="Discount handed to those customers this month">Discount</th>
                  <th style={{ ...th, textAlign: 'right' }}>Commission</th>
                  <th style={{ ...th, textAlign: 'right' }} title="What lands in your pocket after the discount and the commission">You keep</th>
                  <th style={{ ...th, textAlign: 'center', width: '90px' }}></th>
                </tr>
              </thead>
              <tbody>
                {partners.map(p => (
                  <Fragment key={p.id}>
                    <tr style={{ borderBottom: '1px solid var(--border)', opacity: p.active ? 1 : 0.55 }}>
                      <td style={{ ...td, textAlign: 'center', cursor: 'pointer' }} onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                        {expanded === p.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </td>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{p.company || p.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {p.name}{p.email ? ` · ${p.email}` : ''}
                        </div>
                        {!p.active && <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>Paused</div>}
                      </td>
                      <td style={td}>
                        <button
                          onClick={() => copyLink(p.code)}
                          title="Copy referral link"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                            background: 'var(--bg-secondary, rgba(127,127,127,0.08))', border: '1px solid var(--border)',
                            borderRadius: '8px', padding: '5px 10px', fontSize: '12px', color: 'var(--text)',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          }}
                        >
                          /partner/{p.code}
                          {copied === p.code ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                        </button>
                        <div style={{ fontSize: '11.5px', marginTop: '5px', color: p.promo_text ? 'var(--accent-bright, #2563eb)' : 'var(--text-muted)' }}>
                          {p.promo_text || 'No customer discount'}
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <div style={{ fontWeight: 600 }}>{p.commission_rate}%</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {p.commission_type === 'onetime' ? 'one-off' : 'recurring'}
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        {p.referred_total}
                        {p.signups_this_month > 0 && (
                          <div style={{ fontSize: '11px', color: 'var(--green, #22c55e)' }}>+{p.signups_this_month} new</div>
                        )}
                      </td>
                      <td style={{ ...td, textAlign: 'center', fontWeight: 600, color: p.active_customers ? 'var(--green, #22c55e)' : 'inherit' }}>
                        {p.active_customers}
                      </td>
                      <td style={{ ...td, textAlign: 'right', color: p.discount_given ? '#ef4444' : 'var(--text-muted)' }}>
                        {p.discount_given ? `-${money(p.discount_given, currency)}` : '-'}
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{money(p.commission, currency)}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--green, #22c55e)' }}>{money(p.kept, currency)}</td>
                      <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEdit(p)} title="Edit partner"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', color: 'var(--text-muted)' }}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => togglePause(p)} title={p.active ? 'Pause partner' : 'Reactivate partner'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', color: 'var(--text-muted)' }}>
                          {p.active ? <Pause size={15} /> : <Play size={15} />}
                        </button>
                        <button onClick={() => remove(p)} title="Delete partner"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', color: 'var(--text-muted)' }}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                    {expanded === p.id && (
                      <tr>
                        <td colSpan={10} style={{ padding: '0 12px 16px 44px', borderBottom: '1px solid var(--border)' }}>
                          {p.customers.length === 0 ? (
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>
                              Nobody has signed up with this link yet.
                            </div>
                          ) : (
                            <table style={{ width: '100%', fontSize: '12px' }}>
                              <thead>
                                <tr>
                                  <th style={{ ...th, fontSize: '11px' }}>Customer</th>
                                  <th style={{ ...th, fontSize: '11px' }}>Signed up</th>
                                  <th style={{ ...th, fontSize: '11px' }}>Subscription</th>
                                  <th style={{ ...th, fontSize: '11px' }}>Paid until</th>
                                  <th style={{ ...th, fontSize: '11px', textAlign: 'center' }}>Counts this month</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.customers.map(c => (
                                  <tr key={c.id}>
                                    <td style={{ padding: '8px 12px' }}>
                                      <div style={{ fontWeight: 500 }}>{c.full_name || c.email}</div>
                                      {c.full_name && <div style={{ color: 'var(--text-muted)' }}>{c.email}</div>}
                                    </td>
                                    <td style={{ padding: '8px 12px' }}>{formatDate(c.signed_up)}</td>
                                    <td style={{ padding: '8px 12px', textTransform: 'capitalize' }}>{c.status}</td>
                                    <td style={{ padding: '8px 12px' }}>{formatDate(c.period_end)}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                      {c.earning_this_month
                                        ? <span style={{ color: 'var(--green, #22c55e)', fontWeight: 600 }}>Yes</span>
                                        : <span style={{ color: 'var(--text-muted)' }}>No</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ ...td, fontWeight: 700 }}>Totals for this month</td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{totals.referred_total}</td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{totals.active_customers}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                    {totals.discount_given ? `-${money(totals.discount_given, currency)}` : '-'}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 800, fontSize: '15px' }}>{money(totals.commission, currency)}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 800, fontSize: '15px', color: 'var(--green, #22c55e)' }}>{money(totals.kept, currency)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: 1.6 }}>
              Commission is only counted for referred customers who are actually paying in the selected month,
              and it is calculated on what they actually paid after their discount - not on the sticker price.
              Free trials and expired accounts are listed but earn nothing.
              {report?.unmatched_referrals ? ` ${report.unmatched_referrals} customer(s) carry a code from a deleted partner.` : ''}
            </p>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-title" style={{ cursor: 'pointer' }} onClick={() => setAssignOpen(!assignOpen)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {assignOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Credit a partner manually
          </span>
        </div>
        {assignOpen && (
          <form onSubmit={assign}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.6 }}>
              If a customer signed up without using the link, put their email and the partner code here and
              they will be credited from now on. Leave the code empty to remove a referral.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 240px' }}>
                <label className="form-label">Customer email</label>
                <input className="form-input" style={{ marginBottom: 0 }} type="email" value={assignEmail}
                  onChange={e => setAssignEmail(e.target.value)} placeholder="customer@example.com" required />
              </div>
              <div style={{ flex: '0 1 180px' }}>
                <label className="form-label">Partner code</label>
                <input className="form-input" style={{ marginBottom: 0 }} value={assignCode}
                  onChange={e => setAssignCode(e.target.value.toUpperCase())} placeholder="BAYMEDIA" />
              </div>
              <button className="btn btn-primary" type="submit" style={{ width: 'auto' }}>Apply</button>
            </div>
            {assignMsg && <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>{assignMsg}</div>}
          </form>
        )}
      </div>

      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setShowForm(false)}
        >
          <div
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', maxWidth: '460px', width: '100%', maxHeight: '90vh', overflow: 'auto', padding: '28px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', margin: 0 }}>
                {editingId ? 'Edit partner' : 'New partner'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {formError && <div className="auth-error" style={{ marginBottom: '14px' }}>{formError}</div>}

            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">Contact name</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
              </div>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Bay Media" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="partner@example.com" />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Commission rate</label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" type="number" min="0" max="100" step="0.5"
                      value={form.commission_rate}
                      onChange={e => setForm({ ...form, commission_rate: e.target.value })} />
                    <Percent size={14} style={{ position: 'absolute', right: '12px', top: '13px', color: 'var(--text-muted)' }} />
                  </div>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Paid</label>
                  <select className="form-input" value={form.commission_type}
                    onChange={e => setForm({ ...form, commission_type: e.target.value })}>
                    <option value="recurring">Every month</option>
                    <option value="onetime">Once, on conversion</option>
                  </select>
                </div>
              </div>
              <div style={{
                border: '1px solid var(--border)', borderRadius: '12px',
                padding: '16px', marginBottom: '18px', background: 'var(--bg-secondary, rgba(127,127,127,0.04))',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={14} /> Customer offer
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.55 }}>
                  The discount the partner can advertise. This is what makes people actually use their code.
                  Set the amount to 0 for a code with no discount.
                </p>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="form-group" style={{ flex: '0 0 118px' }}>
                    <label className="form-label">Discount</label>
                    <select className="form-input" value={form.promo_type}
                      onChange={e => setForm({ ...form, promo_type: e.target.value })}>
                      <option value="amount">Amount</option>
                      <option value="percent">Percent</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '0 0 86px' }}>
                    <label className="form-label">{form.promo_type === 'percent' ? '%' : `${currency === 'AUD' ? 'A$' : '$'}`}</label>
                    <input className="form-input" type="number" min="0" step="0.5" id="promo-value-input"
                      value={form.promo_value}
                      onChange={e => setForm({ ...form, promo_value: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Lasts</label>
                    <select className="form-input" value={form.promo_months}
                      onChange={e => setForm({ ...form, promo_months: Number(e.target.value) })}>
                      {PROMO_DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                </div>

                {(() => {
                  const m = promoMaths(form, price)
                  if (!m.offerText) {
                    return (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        No discount. The code still tracks who referred the customer.
                      </div>
                    )
                  }
                  const thin = m.kept < price * 0.4
                  return (
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                        Their pitch: &ldquo;Use code {(form.code || 'CODE').toUpperCase()} and get {m.offerText}.&rdquo;
                      </div>
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
                        fontSize: '12px', textAlign: 'center',
                      }}>
                        <div>
                          <div style={{ color: 'var(--text-muted)' }}>Customer pays</div>
                          <div style={{ fontWeight: 700, fontSize: '15px' }}>{money(m.customerPays, currency)}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)' }}>You pay them</div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: '#ef4444' }}>{money(m.commission, currency)}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)' }}>You keep</div>
                          <div style={{ fontWeight: 800, fontSize: '15px', color: thin ? '#ef4444' : 'var(--green, #22c55e)' }}>
                            {money(m.kept, currency)}
                          </div>
                        </div>
                      </div>
                      {thin && (
                        <div style={{
                          marginTop: '10px', fontSize: '12px', lineHeight: 1.5,
                          color: '#b45309', background: 'rgba(245,158,11,0.10)',
                          border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '8px 10px',
                        }}>
                          Heads up - the discount plus the commission leaves you {money(m.kept, currency)} out of {money(price, currency)}
                          {form.promo_months === 0 ? ', and this discount never ends.' : ` for the first ${form.promo_months === 1 ? 'month' : form.promo_months + ' months'}.`}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              <div className="form-group">
                <label className="form-label">Referral code {editingId ? '' : '(optional)'}</label>
                <input className="form-input" value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder={editingId ? '' : 'Leave empty and I will generate one'} />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Their link will be {SITE}/partner/{(form.code || 'CODE').toUpperCase()}
                </div>
              </div>

              <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: '100%', marginTop: '8px' }}>
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create partner'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
