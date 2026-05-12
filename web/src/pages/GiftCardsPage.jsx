import { useEffect, useState, useMemo } from 'react'
import { Gift, Plus, X, CreditCard, DollarSign, Copy, Check, Eye, Trash2, ChevronDown, ChevronUp, Calendar, Send, Percent, ShoppingBag } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dataStore } from '../lib/dataStore'
import { syncedSet } from '../lib/cloudSync'

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', INR: '₹' }

const PRESET_AMOUNTS = [25, 50, 75, 100]

const EXPIRY_OPTIONS = [
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
  { label: '2 years', months: 24 },
  { label: 'Never', months: null },
]

const CARD_THEMES = [
  { name: 'Purple Dream', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 40%, #f093fb 100%)', shadow: 'rgba(102,126,234,0.35)' },
  { name: 'Ocean Blue', gradient: 'linear-gradient(135deg, #0061ff 0%, #00d4ff 100%)', shadow: 'rgba(0,97,255,0.35)' },
  { name: 'Sunset', gradient: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)', shadow: 'rgba(241,39,17,0.35)' },
  { name: 'Emerald', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', shadow: 'rgba(17,153,142,0.35)' },
  { name: 'Midnight', gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', shadow: 'rgba(48,43,99,0.35)' },
  { name: 'Rose Gold', gradient: 'linear-gradient(135deg, #f4c4f3 0%, #fc67fa 50%, #cf8bf3 100%)', shadow: 'rgba(252,103,250,0.25)' },
  { name: 'Golden', gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', shadow: 'rgba(247,151,30,0.35)' },
  { name: 'Charcoal', gradient: 'linear-gradient(135deg, #434343 0%, #1a1a2e 100%)', shadow: 'rgba(67,67,67,0.35)' },
]

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatDate(dateStr) {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function uid() {
  try { return crypto.randomUUID() } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function generateGiftCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  const seg = () => { let s = ''; for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)]; return s }
  return 'GC-' + seg() + '-' + seg() + '-' + seg()
}

function computeExpiry(months) {
  if (months === null) return null
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function getStatus(card) {
  if (card.status === 'deactivated') return 'deactivated'
  if (card.expiry_date && card.expiry_date < todayStr()) return 'expired'
  if (card.balance <= 0) return 'fully_redeemed'
  if (card.balance < card.amount) return 'partially_redeemed'
  return 'active'
}

const STATUS_CONFIG = {
  active: { label: 'Active', badge: 'badge badge-green' },
  partially_redeemed: { label: 'Partial', badge: 'badge badge-amber' },
  fully_redeemed: { label: 'Redeemed', badgeClass: 'badge', color: 'var(--text-muted)', bg: 'rgba(150,150,150,0.1)' },
  expired: { label: 'Expired', badge: 'badge badge-rose' },
  deactivated: { label: 'Inactive', badgeClass: 'badge', color: 'var(--text-muted)', bg: 'rgba(150,150,150,0.1)' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active
  if (cfg.badge) return <span className={cfg.badge}>{cfg.label}</span>
  return <span className={cfg.badgeClass} style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
}

export default function GiftCardsPage() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [cards, setCards] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [viewCard, setViewCard] = useState(null)
  const [redeemCard, setRedeemCard] = useState(null)
  const [redeemAmount, setRedeemAmount] = useState('')
  const [redeemCustomer, setRedeemCustomer] = useState('')
  const [copied, setCopied] = useState(null)

  const [selectedAmount, setSelectedAmount] = useState(50)
  const [customAmount, setCustomAmount] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [senderName, setSenderName] = useState('')
  const [message, setMessage] = useState('')
  const [expiryMonths, setExpiryMonths] = useState(12)
  const [giftCode, setGiftCode] = useState(generateGiftCode())
  const [cardTheme, setCardTheme] = useState(0)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const biz = await dataStore.getBusiness(user.id)
      if (biz) {
        setBusiness(biz)
        const stored = localStorage.getItem(`giftcards_${biz.id}`)
        if (stored) setCards(JSON.parse(stored))
      }
    }
    load()
  }, [user])

  const saveCards = (updated) => {
    setCards(updated)
    if (business) {
      localStorage.setItem(`giftcards_${business.id}`, JSON.stringify(updated))
      syncedSet(business.id, 'giftcards', updated)
    }
  }

  const curr = business?.currency || 'USD'
  const sym = CURRENCY_SYMBOLS[curr] || '$'
  const bizName = business?.name || 'Your Business'

  const effectiveAmount = isCustom ? (parseFloat(customAmount) || 0) : selectedAmount

  const resetForm = () => {
    setSelectedAmount(50)
    setCustomAmount('')
    setIsCustom(false)
    setRecipientName('')
    setRecipientEmail('')
    setSenderName('')
    setMessage('')
    setExpiryMonths(12)
    setGiftCode(generateGiftCode())
    setCardTheme(0)
  }

  const handleCreate = () => {
    if (effectiveAmount <= 0 || !recipientName.trim()) return
    const card = {
      id: uid(),
      code: giftCode,
      amount: effectiveAmount,
      balance: effectiveAmount,
      recipient_name: recipientName.trim(),
      recipient_email: recipientEmail.trim(),
      sender_name: senderName.trim(),
      message: message.trim(),
      expiry_date: computeExpiry(expiryMonths),
      theme: cardTheme,
      status: 'active',
      redemptions: [],
      created_at: todayStr(),
    }
    saveCards([card, ...cards])
    setShowCreate(false)
    resetForm()
  }

  const handleRedeem = (cardId) => {
    const amt = parseFloat(redeemAmount)
    if (!amt || amt <= 0 || !redeemCustomer.trim()) return
    const updated = cards.map(c => {
      if (c.id !== cardId) return c
      const newBalance = Math.max(0, c.balance - amt)
      const redemptions = [...c.redemptions, { date: new Date().toISOString(), amount: Math.min(amt, c.balance), customer_name: redeemCustomer.trim() }]
      const status = newBalance <= 0 ? 'fully_redeemed' : 'partially_redeemed'
      return { ...c, balance: newBalance, redemptions, status }
    })
    saveCards(updated)
    setRedeemCard(null)
    setRedeemAmount('')
    setRedeemCustomer('')
  }

  const handleDeactivate = (cardId) => {
    saveCards(cards.map(c => c.id === cardId ? { ...c, status: 'deactivated' } : c))
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const cardsWithStatus = useMemo(() => cards.map(c => ({ ...c, computedStatus: getStatus(c) })), [cards])
  const activeCards = cardsWithStatus.filter(c => c.computedStatus === 'active' || c.computedStatus === 'partially_redeemed')
  const totalSold = cards.reduce((s, c) => s + c.amount, 0)
  const totalRedeemed = cards.reduce((s, c) => s + (c.amount - c.balance), 0)
  const outstanding = cards.filter(c => getStatus(c) === 'active' || getStatus(c) === 'partially_redeemed').reduce((s, c) => s + c.balance, 0)

  const allRedemptions = useMemo(() => {
    const all = []
    cards.forEach(c => {
      c.redemptions.forEach(r => all.push({ ...r, code: c.code }))
    })
    return all.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [cards])

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Gift Cards</h1>
          <p className="page-subtitle">Create and manage digital gift cards for your customers</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowCreate(true); resetForm() }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> New Gift Card
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(34,197,94,0.1)' }}><CreditCard size={22} style={{ color: 'var(--green)' }} /></div>
          <div className="stat-card-label">Active Cards</div>
          <div className="stat-card-value">{activeCards.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,0.1)' }}><DollarSign size={22} style={{ color: 'var(--accent-bright)' }} /></div>
          <div className="stat-card-label">Total Value Sold</div>
          <div className="stat-card-value">{sym}{totalSold.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(167,139,250,0.1)' }}><ShoppingBag size={22} style={{ color: 'var(--purple)' }} /></div>
          <div className="stat-card-label">Redeemed Value</div>
          <div className="stat-card-value">{sym}{totalRedeemed.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.1)' }}><Gift size={22} style={{ color: 'var(--amber)' }} /></div>
          <div className="stat-card-label">Outstanding Balance</div>
          <div className="stat-card-value">{sym}{outstanding.toLocaleString()}</div>
        </div>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: '20px', border: '1px solid var(--accent)', boxShadow: '0 0 20px rgba(59,130,246,0.1)' }}>
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Create Gift Card</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}><X size={18} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Amount</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRESET_AMOUNTS.map(a => (
                    <button key={a} className={!isCustom && selectedAmount === a ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} onClick={() => { setIsCustom(false); setSelectedAmount(a) }} style={{ minWidth: '64px' }}>
                      {sym}{a}
                    </button>
                  ))}
                  <button className={isCustom ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} onClick={() => setIsCustom(true)}>
                    Custom
                  </button>
                </div>
                {isCustom && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{sym}</span>
                    <input type="number" className="form-input" min="1" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="Enter amount" style={{ maxWidth: '160px' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Recipient Name</label>
                  <input type="text" className="form-input" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Jane Smith" />
                </div>
                <div className="form-group">
                  <label className="form-label">Recipient Email</label>
                  <input type="email" className="form-input" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="jane@email.com" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Sender Name</label>
                  <input type="text" className="form-input" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="form-group">
                  <label className="form-label">Expires</label>
                  <select className="form-select" value={expiryMonths === null ? 'never' : expiryMonths} onChange={e => setExpiryMonths(e.target.value === 'never' ? null : parseInt(e.target.value))}>
                    {EXPIRY_OPTIONS.map(o => (
                      <option key={o.label} value={o.months === null ? 'never' : o.months}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Card Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {CARD_THEMES.map((theme, i) => (
                    <button key={i} onClick={() => setCardTheme(i)} title={theme.name} style={{
                      width: '36px', height: '36px', borderRadius: '10px', border: cardTheme === i ? '2px solid #fff' : '2px solid transparent',
                      background: theme.gradient, cursor: 'pointer', outline: cardTheme === i ? '2px solid var(--accent-bright)' : 'none',
                      outlineOffset: '2px', transition: 'all 0.15s',
                    }} />
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Personal Message</label>
                <textarea className="form-input" rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Enjoy this gift! Treat yourself to something special..." style={{ resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={effectiveAmount <= 0 || !recipientName.trim()}>
                  <Send size={14} style={{ marginRight: '6px' }} /> Create Gift Card
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: '100%', maxWidth: '380px', aspectRatio: '1.6 / 1', borderRadius: '16px', padding: '28px',
                background: CARD_THEMES[cardTheme].gradient,
                color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: `0 20px 60px ${CARD_THEMES[cardTheme].shadow}`,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div style={{
                  position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px',
                  borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                }} />
                <div style={{
                  position: 'absolute', bottom: '-40px', left: '-20px', width: '100px', height: '100px',
                  borderRadius: '50%', background: 'rgba(255,255,255,0.07)',
                }} />
                <div style={{
                  position: 'absolute', top: '50%', right: '10%', width: '60px', height: '60px',
                  borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.85 }}>Gift Card</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>{bizName}</div>
                    </div>
                    <Gift size={28} style={{ opacity: 0.7 }} />
                  </div>
                </div>

                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', margin: '8px 0' }}>
                  <div style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1px', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                    {sym}{effectiveAmount > 0 ? effectiveAmount.toLocaleString() : '0'}
                  </div>
                  {recipientName && (
                    <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '2px' }}>
                      For {recipientName}
                    </div>
                  )}
                  {message && (
                    <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '6px', fontStyle: 'italic', maxHeight: '28px', overflow: 'hidden', lineHeight: '14px' }}>
                      &ldquo;{message}&rdquo;
                    </div>
                  )}
                </div>

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>Card Code</div>
                    <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1.5px', marginTop: '1px' }}>{giftCode}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>Expires</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '1px' }}>
                      {expiryMonths === null ? 'Never' : formatDate(computeExpiry(expiryMonths))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-title">Gift Cards</div>
        {cardsWithStatus.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <Gift size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>No gift cards yet. Create one to get started.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {cardsWithStatus.map(c => (
              <div key={c.id} style={{
                padding: '16px 20px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, letterSpacing: '1.5px',
                    color: c.computedStatus === 'active' ? 'var(--accent-bright)' : 'var(--text-muted)',
                    minWidth: '180px',
                  }}>
                    {c.code}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{c.recipient_name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>from {c.sender_name || '—'}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{sym}{c.amount}</span>
                    <StatusBadge status={c.computedStatus} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      <Calendar size={11} style={{ marginRight: '3px', verticalAlign: '-1px' }} />
                      {c.expiry_date ? formatDate(c.expiry_date) : 'No expiry'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => copyCode(c.code)} title="Copy code">
                      {copied === c.code ? <Check size={14} style={{ color: 'var(--green)' }} /> : <Copy size={14} />}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setViewCard(viewCard === c.id ? null : c.id)} title="View details">
                      <Eye size={14} />
                    </button>
                    {(c.computedStatus === 'active' || c.computedStatus === 'partially_redeemed') && (
                      <button className="btn btn-ghost btn-sm" onClick={() => { setRedeemCard(redeemCard === c.id ? null : c.id); setRedeemAmount(''); setRedeemCustomer('') }} title="Redeem" style={{ color: 'var(--amber)' }}>
                        <Percent size={14} />
                      </button>
                    )}
                    {c.computedStatus !== 'deactivated' && c.computedStatus !== 'fully_redeemed' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDeactivate(c.id)} title="Deactivate" style={{ color: 'var(--rose)' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>{sym}{c.amount - c.balance} used</span>
                    <div style={{ flex: 1, maxWidth: '200px', height: '4px', borderRadius: '2px', background: 'var(--border)' }}>
                      <div style={{
                        height: '100%', borderRadius: '2px',
                        width: c.amount > 0 ? ((c.amount - c.balance) / c.amount * 100) + '%' : '0%',
                        background: c.balance <= 0 ? 'var(--text-muted)' : c.balance < c.amount ? 'var(--amber)' : 'var(--green)',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                    <span>{sym}{c.balance} remaining</span>
                  </div>
                </div>

                {viewCard === c.id && (
                  <div style={{
                    marginTop: '12px', padding: '16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', fontSize: '13px',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Recipient</div>
                        <div style={{ color: 'var(--text)' }}>{c.recipient_name}</div>
                        {c.recipient_email && <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{c.recipient_email}</div>}
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Sender</div>
                        <div style={{ color: 'var(--text)' }}>{c.sender_name || '—'}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Created</div>
                        <div style={{ color: 'var(--text)' }}>{formatDate(c.created_at)}</div>
                      </div>
                    </div>
                    {c.message && (
                      <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent)', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                        {c.message}
                      </div>
                    )}
                    {c.redemptions.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Redemption History</div>
                        {c.redemptions.map((r, i) => (
                          <div key={i} style={{
                            display: 'flex', gap: '12px', padding: '6px 0',
                            borderBottom: i < c.redemptions.length - 1 ? '1px solid var(--border)' : 'none',
                            fontSize: '12px', color: 'var(--text-secondary)',
                          }}>
                            <span>{formatDateTime(r.date)}</span>
                            <span style={{ fontWeight: 600, color: 'var(--rose)' }}>-{sym}{r.amount}</span>
                            <span>{r.customer_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {redeemCard === c.id && (
                  <div style={{
                    marginTop: '12px', padding: '14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--amber)', display: 'flex', alignItems: 'flex-end', gap: '12px',
                  }}>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <label className="form-label" style={{ fontSize: '11px' }}>Amount to Redeem</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '13px' }}>{sym}</span>
                        <input type="number" className="form-input" min="0.01" max={c.balance} step="0.01" value={redeemAmount} onChange={e => setRedeemAmount(e.target.value)} placeholder={`Max ${c.balance}`} />
                      </div>
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <label className="form-label" style={{ fontSize: '11px' }}>Customer Name</label>
                      <input type="text" className="form-input" value={redeemCustomer} onChange={e => setRedeemCustomer(e.target.value)} placeholder="Customer name" />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => handleRedeem(c.id)} disabled={!redeemAmount || parseFloat(redeemAmount) <= 0 || parseFloat(redeemAmount) > c.balance || !redeemCustomer.trim()}>
                      Apply
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setRedeemCard(null)}>
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowLog(!showLog)}>
          <span>Redemption Log</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>{allRedemptions.length} entries</span>
            {showLog ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
          </div>
        </div>
        {showLog && (
          allRedemptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No redemptions yet.
            </div>
          ) : (
            <div style={{ fontSize: '13px' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 0.8fr 0.8fr 1fr', gap: '12px',
                padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)',
              }}>
                <div>Date</div>
                <div>Gift Card</div>
                <div>Amount</div>
                <div>Balance After</div>
                <div>Customer</div>
              </div>
              {allRedemptions.map((r, i) => {
                const card = cards.find(c => c.code === r.code)
                const redsBefore = card ? card.redemptions.filter(rx => new Date(rx.date) <= new Date(r.date)) : []
                const balanceAfter = card ? card.amount - redsBefore.reduce((s, rx) => s + rx.amount, 0) : 0
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 0.8fr 0.8fr 1fr', gap: '12px',
                    padding: '10px 12px', borderBottom: i < allRedemptions.length - 1 ? '1px solid var(--border)' : 'none',
                    color: 'var(--text-secondary)',
                  }}>
                    <div>{formatDateTime(r.date)}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', letterSpacing: '1px' }}>{r.code}</div>
                    <div style={{ fontWeight: 600, color: 'var(--rose)' }}>-{sym}{r.amount}</div>
                    <div>{sym}{Math.max(0, balanceAfter).toFixed(2)}</div>
                    <div>{r.customer_name}</div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </>
  )
}
