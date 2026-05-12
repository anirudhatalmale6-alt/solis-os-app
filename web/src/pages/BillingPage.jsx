import { useState, useEffect, useRef } from 'react'
import { CreditCard, Shield, Check, AlertTriangle, Clock, Crown, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { syncedGet, syncedSet, fetchFromCloud } from '../lib/cloudSync'

const API_URL = import.meta.env.VITE_PAYMENTS_API_URL || 'https://api.solis-os.com'
const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APP_ID || 'sq0idp-TNCbQOgIZDasfiqCWDl66Q'
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID || 'L4DA19MTFT1HX'
const TRIAL_DAYS = 14
const PLAN_PRICE = 29

function getTrialInfo(subscription) {
  if (!subscription?.trial_start) return { daysLeft: TRIAL_DAYS, expired: false }
  const start = new Date(subscription.trial_start)
  const end = new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  const now = new Date()
  const diff = end - now
  const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  return { daysLeft, expired: daysLeft <= 0, trialEnd: end }
}

export default function BillingPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const cardRef = useRef(null)
  const paymentsRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        let sub = null
        const raw = syncedGet(biz.id, 'subscription')
        if (raw) {
          try { sub = JSON.parse(raw) } catch {}
        }
        if (!sub) {
          const cloud = await fetchFromCloud(biz.id, 'subscription')
          if (cloud) sub = cloud
        }
        if (!sub) {
          sub = {
            status: 'trialing',
            trial_start: new Date().toISOString(),
            plan: 'all_access',
            price: PLAN_PRICE,
          }
          syncedSet(biz.id, 'subscription', sub)
        }
        setSubscription(sub)
        if (sub.status === 'active' || sub.square_subscription_id) {
          try {
            const resp = await fetch(`${API_URL}/api/subscription/${biz.id}`)
            if (resp.ok) {
              const data = await resp.json()
              if (data.subscription) {
                const updated = { ...sub, ...data.subscription }
                setSubscription(updated)
                syncedSet(biz.id, 'subscription', updated)
              }
            }
          } catch {}
        }
      }
      setLoading(false)
    }
    load()
  }, [user])

  const loadSquareSDK = () => {
    return new Promise((resolve, reject) => {
      if (window.Square) return resolve(window.Square)
      const script = document.createElement('script')
      script.src = 'https://web.squarecdn.com/v1/square.js'
      script.onload = () => resolve(window.Square)
      script.onerror = () => reject(new Error('Failed to load payment SDK'))
      document.head.appendChild(script)
    })
  }

  const handleSubscribe = async () => {
    setError(null)
    setShowPaymentForm(true)

    try {
      const Square = await loadSquareSDK()
      const payments = Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID)
      paymentsRef.current = payments

      await new Promise(resolve => setTimeout(resolve, 100))

      const cardContainer = document.getElementById('sq-card-container')
      if (!cardContainer) return

      const card = await payments.card()
      await card.attach('#sq-card-container')
      cardRef.current = card
    } catch (e) {
      setError('Could not load payment form. Please try again.')
      setShowPaymentForm(false)
    }
  }

  const handlePayment = async () => {
    if (!cardRef.current || !business) return
    setProcessing(true)
    setError(null)

    try {
      const result = await cardRef.current.tokenize()
      if (result.status !== 'OK') {
        throw new Error(result.errors?.[0]?.message || 'Card verification failed')
      }

      const resp = await fetch(`${API_URL}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_id: result.token,
          business_id: business.id,
          user_id: user.id,
          email: user.email,
          name: user.full_name || business.name || '',
        }),
      })

      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Payment failed')

      const updated = {
        ...subscription,
        status: 'active',
        square_customer_id: data.customer_id,
        square_subscription_id: data.subscription_id,
        activated_at: new Date().toISOString(),
        current_period_end: data.current_period_end,
      }
      setSubscription(updated)
      syncedSet(business.id, 'subscription', updated)
      setShowPaymentForm(false)
      setSuccess('Subscription activated! You now have full access to Solis OS.')
      setTimeout(() => setSuccess(null), 5000)
    } catch (e) {
      setError(e.message || 'Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = async () => {
    if (!business || !subscription?.square_subscription_id) return
    if (!confirm('Are you sure you want to cancel your subscription? You will keep access until the end of your current billing period.')) return

    try {
      const resp = await fetch(`${API_URL}/api/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          subscription_id: subscription.square_subscription_id,
        }),
      })
      if (resp.ok) {
        const updated = { ...subscription, status: 'canceled', canceled_at: new Date().toISOString() }
        setSubscription(updated)
        syncedSet(business.id, 'subscription', updated)
      }
    } catch {
      setError('Failed to cancel. Please try again.')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  const trial = getTrialInfo(subscription)
  const isActive = subscription?.status === 'active'
  const isTrial = subscription?.status === 'trialing' && !trial.expired
  const isCanceled = subscription?.status === 'canceled'
  const needsPayment = trial.expired && !isActive

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Billing & Subscription</h1>
        <p className="page-subtitle">Manage your Solis OS subscription</p>
      </div>

      {success && (
        <div style={{
          padding: '16px 20px', borderRadius: 'var(--radius-sm)', marginBottom: '20px',
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--green)',
        }}>
          <Check size={18} />
          <span style={{ fontSize: '14px' }}>{success}</span>
        </div>
      )}

      {error && (
        <div style={{
          padding: '16px 20px', borderRadius: 'var(--radius-sm)', marginBottom: '20px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--red, #ef4444)',
        }}>
          <AlertTriangle size={18} />
          <span style={{ fontSize: '14px' }}>{error}</span>
        </div>
      )}

      {/* Current Plan */}
      <div className="card">
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crown size={18} style={{ color: 'var(--amber)' }} />
            <span>Current Plan</span>
          </div>
          <span className={`badge ${isActive ? 'badge-green' : isTrial ? 'badge-blue' : isCanceled ? 'badge-amber' : 'badge-red'}`}>
            {isActive ? 'Active' : isTrial ? 'Free Trial' : isCanceled ? 'Canceled' : 'Expired'}
          </span>
        </div>

        <div style={{
          padding: '24px', borderRadius: 'var(--radius-sm)',
          background: 'var(--bg)', border: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '16px',
        }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
              All Access Plan
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Unlimited bookings, AI WhatsApp, CRM, invoicing, and 30+ modules
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              <span style={{ fontSize: '16px', color: 'var(--text-secondary)', verticalAlign: 'top' }}>$</span>
              {PLAN_PRICE}
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400 }}>/month</span>
            </div>
          </div>
        </div>

        {/* Trial info */}
        {isTrial && (
          <div style={{
            marginTop: '16px', padding: '16px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Clock size={16} style={{ color: 'var(--accent-bright)' }} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                {trial.daysLeft} day{trial.daysLeft !== 1 ? 's' : ''} left in your free trial
              </span>
            </div>
            <div style={{
              height: '6px', borderRadius: '3px', background: 'var(--border)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: '3px',
                background: 'var(--accent)',
                width: `${((TRIAL_DAYS - trial.daysLeft) / TRIAL_DAYS) * 100}%`,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Your trial includes full access to every feature. Subscribe before it ends to keep everything running.
            </div>
          </div>
        )}

        {/* Trial expired notice */}
        {needsPayment && (
          <div style={{
            marginTop: '16px', padding: '16px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} style={{ color: 'var(--red, #ef4444)' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--red, #ef4444)' }}>
                Your free trial has ended
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Subscribe now to continue using Solis OS. All your data is safe and waiting for you.
            </div>
          </div>
        )}

        {/* Canceled notice */}
        {isCanceled && (
          <div style={{
            marginTop: '16px', padding: '16px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
          }}>
            <div style={{ fontSize: '14px', color: 'var(--amber)' }}>
              Your subscription has been canceled. You have access until {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'end of billing period'}.
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {(isTrial || needsPayment || isCanceled) && !showPaymentForm && (
            <button className="btn btn-primary" onClick={handleSubscribe}>
              <CreditCard size={16} style={{ marginRight: '6px' }} />
              Subscribe — ${PLAN_PRICE}/month
            </button>
          )}
          {isActive && (
            <button className="btn btn-danger btn-sm" onClick={handleCancel} style={{ opacity: 0.8 }}>
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Payment Form */}
      {showPaymentForm && (
        <div className="card">
          <div className="card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} style={{ color: 'var(--accent-bright)' }} />
              <span>Payment Details</span>
            </div>
            <button onClick={() => { setShowPaymentForm(false); setError(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{
            padding: '20px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg)', border: '1px solid var(--border)',
          }}>
            <div id="sq-card-container" style={{ minHeight: '90px' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <Shield size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Payments are securely processed by Square. Your card details never touch our servers.
            </span>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handlePayment} disabled={processing}>
              {processing ? 'Processing...' : `Pay $${PLAN_PRICE}/month`}
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowPaymentForm(false); setError(null) }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* What's Included */}
      <div className="card">
        <div className="card-title">What's Included</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {[
            'Unlimited bookings', 'AI WhatsApp assistant', 'Full customer CRM',
            'Invoicing & payments', 'Expense tracking', 'Financial reports',
            'Marketing campaigns', 'Analytics & AI insights', 'Loyalty & gift cards',
            'Promo codes', 'Custom forms', 'Digital waitlist',
            'Recurring appointments', 'Multi-location', 'Team management',
            'Cross-device sync',
          ].map(feature => (
            <div key={feature} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0',
              fontSize: '13px', color: 'var(--text-secondary)',
            }}>
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(34,197,94,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={11} style={{ color: 'var(--green)' }} />
              </div>
              {feature}
            </div>
          ))}
        </div>
      </div>

      {/* Active subscription details */}
      {isActive && subscription.activated_at && (
        <div className="card">
          <div className="card-title">Billing Details</div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Status</span>
              <span className="badge badge-green">Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Plan</span>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>All Access — ${PLAN_PRICE}/mo</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Subscribed since</span>
              <span style={{ fontSize: '14px' }}>{new Date(subscription.activated_at).toLocaleDateString()}</span>
            </div>
            {subscription.current_period_end && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Next billing date</span>
                <span style={{ fontSize: '14px' }}>{new Date(subscription.current_period_end).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
