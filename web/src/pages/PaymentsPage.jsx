import { useEffect, useState, useCallback } from 'react'
import {
  CreditCard,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  Plug,
  TriangleAlert,
  Trash2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const API_BASE = 'https://api.solis-os.com'

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export default function PaymentsPage() {
  const [cfg, setCfg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [copied, setCopied] = useState(false)

  // Secrets are only ever sent upward. What comes back is masked.
  const [secretKey, setSecretKey] = useState('')
  const [publishableKey, setPublishableKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [amount, setAmount] = useState(39)
  const [currency, setCurrency] = useState('aud')
  const [trialDays, setTrialDays] = useState(14)
  const [enabled, setEnabled] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const resp = await fetch(`${API_BASE}/api/admin/stripe/config`, { headers: await authHeaders() })
      const data = await resp.json()
      if (!resp.ok) { setError(data.error || 'Could not load payment settings'); setCfg(null) }
      else {
        setCfg(data)
        setPublishableKey(data.publishable_key || '')
        setAmount((data.amount ?? 3900) / 100)
        setCurrency(data.currency || 'aud')
        setTrialDays(data.trial_days ?? 14)
        setEnabled(!!data.enabled)
      }
    } catch { setError('Connection error. Please try again.') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const save = async (e) => {
    e?.preventDefault()
    setSaving(true); setNotice(''); setError('')
    try {
      const body = { publishable_key: publishableKey, amount, currency, trial_days: trialDays, enabled }
      if (secretKey.trim()) body.secret_key = secretKey.trim()
      if (webhookSecret.trim()) body.webhook_secret = webhookSecret.trim()

      const resp = await fetch(`${API_BASE}/api/admin/stripe/config`, {
        method: 'POST', headers: await authHeaders(), body: JSON.stringify(body),
      })
      const data = await resp.json()
      if (!resp.ok) setError(data.error || 'Could not save')
      else {
        setNotice('Saved.')
        setSecretKey(''); setWebhookSecret('')
        await load()
      }
    } catch { setError('Connection error. Please try again.') }
    setSaving(false)
  }

  const runTest = async () => {
    setTesting(true); setTestResult(null)
    try {
      const resp = await fetch(`${API_BASE}/api/admin/stripe/test`, { method: 'POST', headers: await authHeaders() })
      const data = await resp.json()
      setTestResult(resp.ok ? { ok: true, ...data } : { ok: false, error: data.error })
      if (resp.ok) load()
    } catch { setTestResult({ ok: false, error: 'Connection error' }) }
    setTesting(false)
  }

  const clearAll = async () => {
    if (!confirm('Remove the Stripe keys from the server? Customers will not be able to subscribe through Stripe until you enter them again.')) return
    await fetch(`${API_BASE}/api/admin/stripe/config`, { method: 'DELETE', headers: await authHeaders() })
    setTestResult(null)
    load()
  }

  const copyWebhook = () => {
    navigator.clipboard?.writeText(cfg?.webhook_url || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const modeBadge = (mode) => {
    if (!mode) return null
    const live = mode === 'live'
    return (
      <span style={{
        marginLeft: '10px', padding: '3px 11px', borderRadius: '20px',
        fontSize: '11px', fontWeight: 700, letterSpacing: '.05em',
        background: live ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
        color: live ? '#ef4444' : '#16a34a',
      }}>
        {live ? 'LIVE — REAL MONEY' : 'TEST MODE'}
      </span>
    )
  }

  const label = { fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.55 }

  if (loading) {
    return (
      <>
        <div className="page-header"><h1 className="page-title">Payments</h1></div>
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <p className="page-subtitle">Connect Stripe so customers can subscribe, with partner discounts applied automatically</p>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={17} /> Stripe connection {modeBadge(cfg?.mode)}
          </span>
          <span style={{
            fontSize: '12px', fontWeight: 600,
            color: cfg?.enabled && cfg?.secret_key_set ? 'var(--green, #16a34a)' : 'var(--text-muted)',
          }}>
            {cfg?.enabled && cfg?.secret_key_set ? 'Active' : 'Not active'}
          </span>
        </div>

        <div style={{
          display: 'flex', gap: '10px', alignItems: 'flex-start',
          background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: '12px', padding: '14px 16px', marginBottom: '22px',
        }}>
          <ShieldCheck size={17} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
            Your keys are stored on your own server and never appear in any code, any chat, or anywhere
            public. Once saved, this page only ever shows you the last four characters.
            <br />
            <strong>Start with your test keys.</strong> Everything can be proven end to end without a single
            real dollar moving, then you swap in the live keys.
          </div>
        </div>

        <form onSubmit={save}>
          <div className="form-group">
            <label className="form-label">Secret key</label>
            <input
              className="form-input"
              type="password"
              autoComplete="off"
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              placeholder={cfg?.secret_key_set ? `Saved (${cfg.secret_key_masked}) — type a new one to replace it` : 'sk_test_... or sk_live_...'}
            />
            <div style={label}>Stripe dashboard &rarr; Developers &rarr; API keys &rarr; Secret key.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Publishable key <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input
              className="form-input"
              value={publishableKey}
              onChange={e => setPublishableKey(e.target.value)}
              placeholder="pk_test_... or pk_live_..."
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Webhook signing secret</label>
            <input
              className="form-input"
              type="password"
              autoComplete="off"
              value={webhookSecret}
              onChange={e => setWebhookSecret(e.target.value)}
              placeholder={cfg?.webhook_secret_set ? `Saved (${cfg.webhook_secret_masked}) — type a new one to replace it` : 'whsec_...'}
            />
            <div style={label}>
              In Stripe go to Developers &rarr; Webhooks &rarr; Add endpoint, paste the address below, and
              subscribe it to <code>checkout.session.completed</code>, <code>invoice.paid</code> and{' '}
              <code>customer.subscription.deleted</code>. Stripe then gives you this secret.
            </div>
            <button
              type="button"
              onClick={copyWebhook}
              style={{
                marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                background: 'var(--bg-secondary, rgba(127,127,127,0.08))', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '8px 12px', fontSize: '12.5px', color: 'var(--text)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              {cfg?.webhook_url}
              {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 130px' }}>
              <label className="form-label">Price per month</label>
              <input className="form-input" type="number" min="1" step="0.1" value={amount}
                onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: '0 1 110px' }}>
              <label className="form-label">Currency</label>
              <select className="form-input" value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="aud">AUD</option>
                <option value="usd">USD</option>
                <option value="gbp">GBP</option>
                <option value="eur">EUR</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: '0 1 140px' }}>
              <label className="form-label">Free trial (days)</label>
              <input className="form-input" type="number" min="0" max="90" value={trialDays}
                onChange={e => setTrialDays(e.target.value)} />
            </div>
          </div>
          <div style={{ ...label, marginTop: 0, marginBottom: '18px' }}>
            Changing the price creates a new plan in Stripe. Customers already subscribed keep the price
            they signed up at — Stripe will not move them.
          </div>

          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '11px', cursor: 'pointer',
            padding: '14px 16px', borderRadius: '12px', marginBottom: '20px',
            border: `1px solid ${enabled ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`,
            background: enabled ? 'rgba(34,197,94,0.06)' : 'transparent',
          }}>
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)}
              style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }} />
            <span>
              <b style={{ fontSize: '14px' }}>Take payments through Stripe</b>
              <span style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Leave this off until the test below passes. Nothing changes for customers while it is off.
              </span>
            </span>
          </label>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: 'auto' }}>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={runTest} disabled={testing || !cfg?.secret_key_set}
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '7px' }}>
              {testing ? <RefreshCw size={15} className="spinning" /> : <Plug size={15} />}
              Test connection
            </button>
            {cfg?.secret_key_set && (
              <button type="button" onClick={clearAll}
                style={{
                  width: 'auto', display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer',
                  background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
                  borderRadius: '10px', padding: '10px 16px', fontSize: '14px', fontWeight: 500,
                }}>
                <Trash2 size={15} /> Remove keys
              </button>
            )}
          </div>

          {notice && <div style={{ marginTop: '14px', fontSize: '13px', color: 'var(--green, #16a34a)' }}>{notice}</div>}
        </form>

        {testResult && (
          <div style={{
            marginTop: '18px', padding: '14px 16px', borderRadius: '12px', fontSize: '13.5px', lineHeight: 1.6,
            border: `1px solid ${testResult.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            background: testResult.ok ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
            color: testResult.ok ? 'var(--text)' : '#ef4444',
          }}>
            {testResult.ok ? (
              <>
                <b>Connected to Stripe.</b> Account: {testResult.account}
                {testResult.country ? ` (${testResult.country})` : ''}.{' '}
                {testResult.livemode
                  ? 'These are LIVE keys — real charges will happen.'
                  : 'These are test keys, so nothing real is charged.'}
                {testResult.price_id && <> The monthly plan is ready.</>}
              </>
            ) : (
              <><TriangleAlert size={15} style={{ verticalAlign: '-2px', marginRight: '6px' }} />{testResult.error}</>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title"><span>How partner discounts work here</span></div>
        <ol style={{ paddingLeft: '20px', fontSize: '13.8px', lineHeight: 1.85, color: 'var(--text-secondary)' }}>
          <li>A customer arrives on a partner link, or types the partner's code on the signup form.</li>
          <li>When they go to subscribe, the server checks which partner brought them and asks Stripe for
            the matching discount.</li>
          <li>They land on a Stripe page that already shows the reduced price. They do not type anything.</li>
          <li>Stripe applies the discount for exactly as long as you set it, then charges the full price by
            itself. Nothing to remember and nothing to switch off.</li>
          <li>The Partners page shows what you gave away, what you owe the partner, and what you kept.</li>
        </ol>
      </div>
    </>
  )
}
